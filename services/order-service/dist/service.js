import { randomUUID } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchGetCommand, BatchWriteCommand, DynamoDBDocumentClient, GetCommand, QueryCommand, TransactWriteCommand, } from '@aws-sdk/lib-dynamodb';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { createInsufficientStockError, createNotFoundError, createPaymentFailedError, createServiceUnavailableError, createValidationError, } from './errors.js';
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
            ...(paymentDetails.mockCardLast4 !== undefined ? { mockCardLast4: paymentDetails.mockCardLast4 } : {}),
            ...(paymentDetails.mockUpiRef !== undefined ? { mockUpiRef: paymentDetails.mockUpiRef } : {}),
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
        if (responsePayload.success === false) {
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
//# sourceMappingURL=service.js.map