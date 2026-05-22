import { randomUUID } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { BatchGetCommand, BatchWriteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, TransactWriteCommand, UpdateCommand, } from '@aws-sdk/lib-dynamodb';
import { createInsufficientStockError, createInvalidStatusError, createNotFoundError, createPaymentFailedError, createReturnWindowError, createServiceUnavailableError, createValidationError, } from './errors.js';
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);
const lambdaClient = new LambdaClient({});
function getCartsTableName() {
    return process.env['CARTS_TABLE_NAME'] ?? '';
}
function getProductsTableName() {
    return process.env['PRODUCTS_TABLE_NAME'] ?? '';
}
function getOrdersTableName() {
    return process.env['ORDERS_TABLE_NAME'] ?? '';
}
function getAddressesTableName() {
    return process.env['ADDRESSES_TABLE_NAME'] ?? '';
}
function getPaymentFunctionName() {
    return process.env['PAYMENT_FUNCTION_NAME'] ?? '';
}
function getReturnExchangeRequestsTableName() {
    return process.env['RETURN_EXCHANGE_REQUESTS_TABLE_NAME'] ?? '';
}
/**
 * Executes the full checkout flow:
 * 1. Validate cart is not empty
 * 2. Query cart items
 * 3. Batch-get product stock and validate availability
 * 4. Snapshot delivery address
 * 5. Invoke Payment Lambda via AWS SDK
 * 6. TransactWriteItems to atomically create OrderRecord + decrement stock
 * 7. Clear buyer cart via BatchWriteItem
 * 8. Return 201 with OrderRecord
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
export async function checkout(buyerId, input) {
    const { addressId, paymentMethod, paymentDetails } = input;
    // Step 1: Query cart items
    const cartItems = await queryCartItems(buyerId);
    if (cartItems.length === 0) {
        createValidationError('Cart is empty. Add items before checkout.');
    }
    // Step 2: Batch-get product stock and validate availability
    const productIds = cartItems.map((item) => item['productId']);
    const products = await batchGetProducts(productIds);
    // Validate stock for all items
    const outOfStockItems = [];
    for (const cartItem of cartItems) {
        const productId = cartItem['productId'];
        const requestedQuantity = cartItem['quantity'];
        const product = products.get(productId);
        if (!product || product['isDeleted'] === true) {
            outOfStockItems.push({
                productId,
                requested: requestedQuantity,
                available: 0,
            });
            continue;
        }
        const stockQuantity = product['stockQuantity'];
        if (requestedQuantity > stockQuantity) {
            outOfStockItems.push({
                productId,
                requested: requestedQuantity,
                available: stockQuantity,
            });
        }
    }
    if (outOfStockItems.length > 0) {
        // Requirement 10.2: Return 400 INSUFFICIENT_STOCK listing out-of-stock items
        createInsufficientStockError(outOfStockItems);
    }
    // Step 3: Snapshot delivery address from Address table
    const addressSnapshot = await getAddressSnapshot(buyerId, addressId);
    // Step 4: Build order items with prices at purchase time
    const orderItems = cartItems.map((cartItem) => {
        const productId = cartItem['productId'];
        const quantity = cartItem['quantity'];
        const product = products.get(productId);
        if (!product) {
            createValidationError(`Product ${productId} not found`);
        }
        const price = product['price'];
        const name = product['name'];
        const subtotal = Math.round(price * quantity * 100) / 100;
        return {
            productId,
            name,
            quantity,
            priceAtPurchase: price,
            subtotal,
        };
    });
    const totalAmount = Math.round(orderItems.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
    const orderId = randomUUID();
    // Step 5: Invoke Payment Lambda via AWS SDK
    // Requirement 10.3, 10.4: On payment failure return 402, on unreachable return 503
    const paymentDetailsClean = paymentDetails
        ? {
            ...(paymentDetails.mockCardLast4 !== undefined
                ? { mockCardLast4: paymentDetails.mockCardLast4 }
                : {}),
            ...(paymentDetails.mockUpiRef !== undefined
                ? { mockUpiRef: paymentDetails.mockUpiRef }
                : {}),
        }
        : undefined;
    const paymentResponse = await invokePaymentLambda(orderId, totalAmount, paymentMethod, paymentDetailsClean);
    // Step 6: Determine payment status
    // Requirement 10.1, 10.5: 'Paid' for non-CoD, 'Pending' for CoD
    const paymentStatus = paymentMethod === 'CashOnDelivery' ? 'Pending' : 'Paid';
    // Step 7: TransactWriteItems to atomically create OrderRecord + decrement stock
    const orderTimestamp = new Date().toISOString();
    const orderRecord = {
        orderId,
        buyerId,
        orderTimestamp,
        deliveryAddressSnapshot: addressSnapshot,
        items: orderItems,
        paymentMethod,
        paymentStatus,
        orderStatus: 'Confirmed',
        totalAmount,
        ...(paymentResponse.transactionId ? { transactionId: paymentResponse.transactionId } : {}),
    };
    await createOrderAndDecrementStock(orderRecord, cartItems);
    // Step 8: Clear buyer cart via BatchWriteItem
    await clearBuyerCart(buyerId, cartItems);
    return orderRecord;
}
/**
 * Queries all cart items for a buyer from the carts table.
 */
async function queryCartItems(buyerId) {
    const cartsTableName = getCartsTableName();
    try {
        const queryCommand = new QueryCommand({
            TableName: cartsTableName,
            KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :skPrefix)',
            ExpressionAttributeNames: {
                '#pk': 'PK',
                '#sk': 'SK',
            },
            ExpressionAttributeValues: {
                ':pk': `BUYER#${buyerId}`,
                ':skPrefix': 'PRODUCT#',
            },
        });
        const result = await docClient.send(queryCommand);
        const items = result.Items ?? [];
        // Extract productId from SK for convenience
        return items.map((item) => {
            const sk = item['SK'];
            const productId = sk.replace('PRODUCT#', '');
            return { ...item, productId };
        });
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
/**
 * Batch-gets product records from the products table.
 * Returns a Map of productId → product record.
 */
async function batchGetProducts(productIds) {
    const productsTableName = getProductsTableName();
    const productDetails = new Map();
    try {
        // DynamoDB BatchGetItem supports max 100 items per request
        const batchSize = 100;
        for (let i = 0; i < productIds.length; i += batchSize) {
            const batch = productIds.slice(i, i + batchSize);
            const keys = batch.map((productId) => ({
                PK: `PRODUCT#${productId}`,
                SK: 'METADATA',
            }));
            const batchGetCommand = new BatchGetCommand({
                RequestItems: {
                    [productsTableName]: {
                        Keys: keys,
                    },
                },
            });
            const batchResult = await docClient.send(batchGetCommand);
            const responses = batchResult.Responses?.[productsTableName] ?? [];
            for (const item of responses) {
                const pk = item['PK'];
                const productId = pk.replace('PRODUCT#', '');
                productDetails.set(productId, item);
            }
        }
        return productDetails;
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
/**
 * Retrieves and snapshots the delivery address from the addresses table.
 * Returns an AddressSnapshot or throws 404 if not found.
 */
async function getAddressSnapshot(buyerId, addressId) {
    const addressesTableName = getAddressesTableName();
    try {
        const getCommand = new GetCommand({
            TableName: addressesTableName,
            Key: {
                PK: `BUYER#${buyerId}`,
                SK: `ADDRESS#${addressId}`,
            },
        });
        const result = await docClient.send(getCommand);
        if (!result.Item) {
            createNotFoundError(`Address '${addressId}' not found`);
        }
        const item = result.Item;
        const line2Value = item['line2'];
        const snapshot = {
            addressId,
            buyerId,
            fullName: item['fullName'],
            phone: item['phone'],
            line1: item['line1'],
            ...(line2Value !== undefined ? { line2: line2Value } : {}),
            city: item['city'],
            state: item['state'],
            postalCode: item['postalCode'],
            country: item['country'],
            isDefault: item['isDefault'],
            createdAt: item['createdAt'],
            updatedAt: item['updatedAt'],
        };
        return snapshot;
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
/**
 * Invokes the Payment Lambda via AWS SDK (Lambda-to-Lambda).
 * On payment failure returns 402 PAYMENT_FAILED with no side effects.
 * On Payment Lambda unreachable returns 503.
 *
 * Requirements: 10.3, 10.4
 */
async function invokePaymentLambda(orderId, amount, method, paymentDetails) {
    const functionName = getPaymentFunctionName();
    const payload = {
        orderId,
        amount,
        method,
        ...(paymentDetails ? { mockPayload: paymentDetails } : {}),
    };
    try {
        const invokeCommand = new InvokeCommand({
            FunctionName: functionName,
            InvocationType: 'RequestResponse',
            Payload: new TextEncoder().encode(JSON.stringify(payload)),
        });
        const response = await lambdaClient.send(invokeCommand);
        // Check for Lambda invocation errors (function error)
        if (response.FunctionError) {
            // Requirement 10.3: Payment failure → 402
            createPaymentFailedError('Payment processing failed');
        }
        if (!response.Payload) {
            createPaymentFailedError('Payment service returned empty response');
        }
        const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
        // Check if payment was unsuccessful
        if (!responsePayload.success) {
            const errorMessage = responsePayload.error?.message ??
                'Payment processing failed';
            createPaymentFailedError(errorMessage);
        }
        return responsePayload;
    }
    catch (error) {
        // Re-throw known HTTP errors (402 from above)
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        // Requirement 10.4: Payment Lambda unreachable → 503
        createServiceUnavailableError('Payment service is currently unavailable');
    }
}
/**
 * Uses TransactWriteItems to atomically:
 * - Create the OrderRecord in the orders table
 * - Decrement stock quantities for all ordered products
 *
 * Requirement 10.1, 10.6: Atomic order creation + stock decrement.
 */
async function createOrderAndDecrementStock(orderRecord, cartItems) {
    const ordersTableName = getOrdersTableName();
    const productsTableName = getProductsTableName();
    try {
        // Build the order item for DynamoDB
        const orderItem = {
            PK: `ORDER#${orderRecord.orderId}`,
            SK: 'METADATA',
            orderId: orderRecord.orderId,
            buyerId: orderRecord.buyerId,
            orderTimestamp: orderRecord.orderTimestamp,
            deliveryAddressSnapshot: orderRecord.deliveryAddressSnapshot,
            items: orderRecord.items,
            paymentMethod: orderRecord.paymentMethod,
            paymentStatus: orderRecord.paymentStatus,
            orderStatus: orderRecord.orderStatus,
            totalAmount: orderRecord.totalAmount,
            GSI1PK: `BUYER#${orderRecord.buyerId}`,
            GSI1SK: `ORDER#${orderRecord.orderTimestamp}`,
        };
        if (orderRecord.transactionId) {
            orderItem['transactionId'] = orderRecord.transactionId;
        }
        // Build transact items: 1 Put for order + N Updates for stock decrement
        const transactItems = [];
        // Put the order record
        transactItems.push({
            Put: {
                TableName: ordersTableName,
                Item: orderItem,
                ConditionExpression: 'attribute_not_exists(PK)',
            },
        });
        // Decrement stock for each product
        for (const cartItem of cartItems) {
            const productId = cartItem['productId'];
            const quantity = cartItem['quantity'];
            transactItems.push({
                Update: {
                    TableName: productsTableName,
                    Key: {
                        PK: `PRODUCT#${productId}`,
                        SK: 'METADATA',
                    },
                    UpdateExpression: 'SET #stock = #stock - :qty, #updatedAt = :now',
                    ExpressionAttributeNames: {
                        '#stock': 'stockQuantity',
                        '#updatedAt': 'updatedAt',
                    },
                    ExpressionAttributeValues: {
                        ':qty': quantity,
                        ':now': new Date().toISOString(),
                    },
                    ConditionExpression: '#stock >= :qty',
                },
            });
        }
        const transactCommand = new TransactWriteCommand({
            TransactItems: transactItems,
        });
        await docClient.send(transactCommand);
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
/**
 * Clears the buyer's cart after successful order creation using BatchWriteItem.
 * Requirement 10.1: Clear the Buyer's Cart after order creation.
 */
async function clearBuyerCart(buyerId, cartItems) {
    const cartsTableName = getCartsTableName();
    try {
        // BatchWriteItem supports max 25 items per batch
        const batchSize = 25;
        for (let i = 0; i < cartItems.length; i += batchSize) {
            const batch = cartItems.slice(i, i + batchSize);
            const deleteRequests = batch.map((item) => ({
                DeleteRequest: {
                    Key: {
                        PK: `BUYER#${buyerId}`,
                        SK: `PRODUCT#${item['productId']}`,
                    },
                },
            }));
            const batchWriteCommand = new BatchWriteCommand({
                RequestItems: {
                    [cartsTableName]: deleteRequests,
                },
            });
            await docClient.send(batchWriteCommand);
        }
    }
    catch (error) {
        // Cart clearing failure after order creation is non-critical
        // The order has already been created successfully
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        // Log but don't fail the checkout — order is already created
        console.error('Failed to clear cart after order creation:', error);
    }
}
/**
 * Decodes a base64-encoded cursor into a DynamoDB ExclusiveStartKey.
 * Returns undefined if the cursor is invalid.
 */
function decodeCursor(cursor) {
    try {
        return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    }
    catch {
        return undefined;
    }
}
/**
 * Encodes a DynamoDB LastEvaluatedKey into a base64 cursor string.
 */
function encodeCursor(lastEvaluatedKey) {
    return Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
}
/**
 * Maps a DynamoDB order item to an OrderRecord.
 */
function mapItemToOrderRecord(item) {
    const record = {
        orderId: item['orderId'],
        buyerId: item['buyerId'],
        orderTimestamp: item['orderTimestamp'],
        deliveryAddressSnapshot: item['deliveryAddressSnapshot'],
        items: item['items'],
        paymentMethod: item['paymentMethod'],
        paymentStatus: item['paymentStatus'],
        orderStatus: item['orderStatus'],
        totalAmount: item['totalAmount'],
    };
    if (item['transactionId']) {
        record.transactionId = item['transactionId'];
    }
    const refundStatus = item['refundStatus'];
    if (refundStatus) {
        record.refundStatus = refundStatus;
    }
    return record;
}
/**
 * Retrieves paginated order history for a buyer.
 * Queries GSI1 (GSI1-BuyerOrders) with BUYER#{buyerId}, sorted by timestamp descending.
 * Supports limit (1–100, default 20) and cursor-based pagination.
 *
 * Requirements: 12.1
 */
export async function getOrderHistory(buyerId, limit = 20, cursor) {
    const ordersTableName = getOrdersTableName();
    // Clamp limit to valid range
    const clampedLimit = Math.max(1, Math.min(100, limit));
    try {
        const queryInput = {
            TableName: ordersTableName,
            IndexName: 'GSI1-BuyerOrders',
            KeyConditionExpression: '#gsi1pk = :gsi1pk',
            ExpressionAttributeNames: {
                '#gsi1pk': 'GSI1PK',
            },
            ExpressionAttributeValues: {
                ':gsi1pk': `BUYER#${buyerId}`,
            },
            Limit: clampedLimit,
            ScanIndexForward: false, // Most recent orders first (descending timestamp)
        };
        if (cursor) {
            const decodedKey = decodeCursor(cursor);
            if (decodedKey) {
                queryInput.ExclusiveStartKey = decodedKey;
            }
        }
        const command = new QueryCommand(queryInput);
        const result = await docClient.send(command);
        const orders = (result.Items ?? []).map((item) => mapItemToOrderRecord(item));
        const response = { orders };
        if (result.LastEvaluatedKey) {
            response.nextCursor = encodeCursor(result.LastEvaluatedKey);
        }
        return response;
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
/**
 * Retrieves a single order by ID.
 * Asserts that the requesting buyer owns the order (else returns 404 without revealing existence).
 *
 * Requirements: 12.2, 12.3
 */
export async function getOrderDetail(orderId, requestingBuyerId) {
    const ordersTableName = getOrdersTableName();
    try {
        const command = new GetCommand({
            TableName: ordersTableName,
            Key: {
                PK: `ORDER#${orderId}`,
                SK: 'METADATA',
            },
        });
        const result = await docClient.send(command);
        if (!result.Item) {
            // Requirement 12.3: Return 404 without revealing whether the order exists
            createNotFoundError('Order not found');
        }
        const item = result.Item;
        const orderBuyerId = item['buyerId'];
        // Requirement 12.3: If buyer requests details of an order that doesn't belong to them, return 404
        if (orderBuyerId !== requestingBuyerId) {
            createNotFoundError('Order not found');
        }
        return mapItemToOrderRecord(item);
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
/**
 * Cancels an order.
 *
 * 1. Assert the requesting buyer owns the order (else 404)
 * 2. Check orderStatus is 'Confirmed' or 'Processing' (else 400 INVALID_STATUS)
 * 3. Update orderStatus to 'Cancelled' in DynamoDB
 * 4. For non-CashOnDelivery orders, invoke Payment Lambda for mock refund
 * 5. If refund succeeds, set refundStatus = 'Completed'
 * 6. If refund fails, set refundStatus = 'Pending' (do NOT roll back cancellation)
 * 7. Return the updated OrderRecord
 *
 * Requirements: 12.4, 12.5, 12.6
 */
export async function cancelOrder(orderId, requestingBuyerId) {
    const ordersTableName = getOrdersTableName();
    // Step 1: Retrieve the order
    let item;
    try {
        const getCommand = new GetCommand({
            TableName: ordersTableName,
            Key: {
                PK: `ORDER#${orderId}`,
                SK: 'METADATA',
            },
        });
        const result = await docClient.send(getCommand);
        if (!result.Item) {
            createNotFoundError('Order not found');
        }
        item = result.Item;
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
    // Step 2: Assert ownership (Requirement 12.3 — return 404 without revealing existence)
    const orderBuyerId = item['buyerId'];
    if (orderBuyerId !== requestingBuyerId) {
        createNotFoundError('Order not found');
    }
    // Step 3: Check orderStatus is 'Confirmed' or 'Processing'
    // Requirement 12.6: If status is 'Shipped', 'Delivered', or 'Cancelled', return 400 INVALID_STATUS
    const currentStatus = item['orderStatus'];
    const cancellableStatuses = ['Confirmed', 'Processing'];
    if (!cancellableStatuses.includes(currentStatus)) {
        createInvalidStatusError(`Order cannot be cancelled. Current status: '${currentStatus}'. Only orders with status 'Confirmed' or 'Processing' can be cancelled.`);
    }
    // Step 4: Update orderStatus to 'Cancelled' in DynamoDB
    try {
        const updateCommand = new UpdateCommand({
            TableName: ordersTableName,
            Key: {
                PK: `ORDER#${orderId}`,
                SK: 'METADATA',
            },
            UpdateExpression: 'SET #orderStatus = :cancelled',
            ExpressionAttributeNames: {
                '#orderStatus': 'orderStatus',
            },
            ExpressionAttributeValues: {
                ':cancelled': 'Cancelled',
            },
        });
        await docClient.send(updateCommand);
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
    // Step 5: For non-CashOnDelivery orders, invoke Payment Lambda for mock refund
    const paymentMethod = item['paymentMethod'];
    let refundStatus;
    if (paymentMethod !== 'CashOnDelivery') {
        // Requirement 12.4: Trigger mock refund via Payment_Service for non-CoD orders
        try {
            const refundResponse = await invokeRefundLambda(orderId, item['totalAmount'], paymentMethod);
            // Requirement 12.4: If refund succeeds, set refundStatus = 'Completed'
            if (refundResponse.success) {
                refundStatus = 'Completed';
            }
            else {
                // Requirement 12.5: If refund fails, set refundStatus = 'Pending'
                refundStatus = 'Pending';
            }
        }
        catch {
            // Requirement 12.5: If refund call fails, keep order as Cancelled and set refundStatus = 'Pending'
            refundStatus = 'Pending';
        }
        // Step 6: Update refundStatus in DynamoDB
        try {
            const updateRefundCommand = new UpdateCommand({
                TableName: ordersTableName,
                Key: {
                    PK: `ORDER#${orderId}`,
                    SK: 'METADATA',
                },
                UpdateExpression: 'SET #refundStatus = :refundStatus',
                ExpressionAttributeNames: {
                    '#refundStatus': 'refundStatus',
                },
                ExpressionAttributeValues: {
                    ':refundStatus': refundStatus,
                },
            });
            await docClient.send(updateRefundCommand);
        }
        catch {
            // Non-critical: refundStatus update failure doesn't roll back cancellation
            console.error('Failed to update refundStatus in DynamoDB');
        }
    }
    // Step 7: Return the updated OrderRecord
    const updatedOrder = mapItemToOrderRecord(item);
    updatedOrder.orderStatus = 'Cancelled';
    if (refundStatus) {
        updatedOrder.refundStatus = refundStatus;
    }
    return updatedOrder;
}
/**
 * Invokes the Payment Lambda for a mock refund during order cancellation.
 * Returns the PaymentResponse from the Lambda.
 *
 * Requirements: 12.4, 12.5
 */
async function invokeRefundLambda(orderId, amount, method) {
    const functionName = getPaymentFunctionName();
    const payload = {
        orderId,
        amount,
        method,
        action: 'refund',
    };
    const invokeCommand = new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'RequestResponse',
        Payload: new TextEncoder().encode(JSON.stringify(payload)),
    });
    const response = await lambdaClient.send(invokeCommand);
    // If the Lambda itself errored
    if (response.FunctionError) {
        throw new Error('Refund Lambda returned a function error');
    }
    if (!response.Payload) {
        throw new Error('Refund Lambda returned empty response');
    }
    const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
    return responsePayload;
}
/**
 * Creates a return/exchange request for a delivered order.
 *
 * Flow:
 * 1. Retrieve the order and assert ownership
 * 2. Assert orderStatus is 'Delivered' (else 400)
 * 3. Read sellerPolicy from the product record
 * 4. Check returnWindowDays > 0 (else 400 — non-returnable)
 * 5. Check request is within the return window (else 400)
 * 6. Create ReturnExchangeRequest record with policyVersionAtRequest snapshot
 * 7. Return 201 with requestId
 *
 * Requirements: 13.1, 13.2, 13.3, 13.5, 14.3, 14.4
 */
export async function createReturnExchangeRequest(orderId, buyerId, input) {
    const ordersTableName = getOrdersTableName();
    const productsTableName = getProductsTableName();
    const returnExchangeTableName = getReturnExchangeRequestsTableName();
    // Step 1: Retrieve the order and assert ownership
    let orderItem;
    try {
        const getCommand = new GetCommand({
            TableName: ordersTableName,
            Key: {
                PK: `ORDER#${orderId}`,
                SK: 'METADATA',
            },
        });
        const result = await docClient.send(getCommand);
        if (!result.Item) {
            createNotFoundError('Order not found');
        }
        orderItem = result.Item;
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
    // Assert ownership
    const orderBuyerId = orderItem['buyerId'];
    if (orderBuyerId !== buyerId) {
        createNotFoundError('Order not found');
    }
    // Step 2: Assert orderStatus is 'Delivered'
    // Requirement 13.3: Return/exchange request for non-delivered order returns error
    const orderStatus = orderItem['orderStatus'];
    if (orderStatus !== 'Delivered') {
        createInvalidStatusError(`Order is not eligible for return or exchange. Current status: '${orderStatus}'. Only delivered orders can be returned or exchanged.`);
    }
    // Step 3: Read sellerPolicy from the product record
    // Use the first item in the order to get the seller policy
    const orderItems = orderItem['items'];
    if (!orderItems || orderItems.length === 0) {
        createValidationError('Order has no items');
    }
    const firstItem = orderItems[0];
    if (!firstItem) {
        createValidationError('Order has no items');
    }
    const firstProductId = firstItem.productId;
    let sellerPolicy;
    try {
        const getProductCommand = new GetCommand({
            TableName: productsTableName,
            Key: {
                PK: `PRODUCT#${firstProductId}`,
                SK: 'METADATA',
            },
        });
        const productResult = await docClient.send(getProductCommand);
        if (!productResult.Item) {
            createNotFoundError('Product not found');
        }
        sellerPolicy = productResult.Item['sellerPolicy'];
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
    // Step 4: Check returnWindowDays > 0
    // Requirement 14.3: returnWindowDays of 0 means non-returnable/non-exchangeable
    if (!sellerPolicy) {
        createReturnWindowError('This product does not have a return/exchange policy configured.');
    }
    const returnWindowDays = sellerPolicy['returnWindowDays'];
    if (returnWindowDays <= 0) {
        createReturnWindowError('This product is non-returnable and non-exchangeable.');
    }
    // For exchange requests, also check if exchanges are allowed
    if (input.type === 'Exchange' && sellerPolicy['exchangeAllowed'] === false) {
        createReturnWindowError('Exchanges are not allowed for this product.');
    }
    // Step 5: Check request is within the return window
    // Requirement 13.2: Return/exchange request outside return window returns error
    const orderTimestamp = orderItem['orderTimestamp'];
    const orderDate = new Date(orderTimestamp);
    const now = new Date();
    const daysSinceOrder = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceOrder > returnWindowDays) {
        createReturnWindowError(`Return window has expired. The return window was ${String(returnWindowDays)} days and ${String(daysSinceOrder)} days have passed since the order.`);
    }
    // Step 6: Create ReturnExchangeRequest record with policyVersionAtRequest snapshot
    // Requirement 14.4: Snapshot policyVersionAtRequest so policy updates don't retroactively affect pending requests
    const requestId = randomUUID();
    const createdAt = new Date().toISOString();
    const policyVersionAtRequest = sellerPolicy['policyVersion'];
    const returnExchangeRecord = {
        requestId,
        orderId,
        buyerId,
        type: input.type,
        status: 'Pending',
        policyVersionAtRequest,
        createdAt,
    };
    try {
        const putCommand = new PutCommand({
            TableName: returnExchangeTableName,
            Item: {
                PK: `REQUEST#${requestId}`,
                SK: 'METADATA',
                requestId,
                orderId,
                buyerId,
                type: input.type,
                status: 'Pending',
                policyVersionAtRequest,
                createdAt,
                GSI1PK: `ORDER#${orderId}`,
                GSI1SK: `CREATED#${createdAt}`,
            },
        });
        await docClient.send(putCommand);
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
    return returnExchangeRecord;
}
/**
 * Retrieves a return/exchange request by ID.
 * Asserts that the requesting buyer owns the request (else 404).
 *
 * Requirements: 13.4
 */
export async function getReturnExchangeRequestDetail(requestId, requestingBuyerId) {
    const returnExchangeTableName = getReturnExchangeRequestsTableName();
    try {
        const getCommand = new GetCommand({
            TableName: returnExchangeTableName,
            Key: {
                PK: `REQUEST#${requestId}`,
                SK: 'METADATA',
            },
        });
        const result = await docClient.send(getCommand);
        if (!result.Item) {
            createNotFoundError('Return/exchange request not found');
        }
        const item = result.Item;
        const requestBuyerId = item['buyerId'];
        // Assert ownership
        if (requestBuyerId !== requestingBuyerId) {
            createNotFoundError('Return/exchange request not found');
        }
        const record = {
            requestId: item['requestId'],
            orderId: item['orderId'],
            buyerId: item['buyerId'],
            type: item['type'],
            status: item['status'],
            policyVersionAtRequest: item['policyVersionAtRequest'],
            createdAt: item['createdAt'],
        };
        // Include sellerNotes if present
        const sellerNotes = item['sellerNotes'];
        if (sellerNotes) {
            record.sellerNotes = sellerNotes;
        }
        return record;
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
//# sourceMappingURL=service.js.map