import type { CheckoutSchemaInput, OrderRecord, ReturnExchangeRequest, ReturnExchangeRequestSchemaInput } from '@blipzo/shared';
/**
 * Response shape for paginated order history.
 * Requirement 12.1
 */
export interface OrderHistoryResponse {
    orders: OrderRecord[];
    nextCursor?: string;
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
export declare function checkout(buyerId: string, input: CheckoutSchemaInput): Promise<OrderRecord>;
/**
 * Retrieves paginated order history for a buyer.
 * Queries GSI1 (GSI1-BuyerOrders) with BUYER#{buyerId}, sorted by timestamp descending.
 * Supports limit (1–100, default 20) and cursor-based pagination.
 *
 * Requirements: 12.1
 */
export declare function getOrderHistory(buyerId: string, limit?: number, cursor?: string): Promise<OrderHistoryResponse>;
/**
 * Retrieves a single order by ID.
 * Asserts that the requesting buyer owns the order (else returns 404 without revealing existence).
 *
 * Requirements: 12.2, 12.3
 */
export declare function getOrderDetail(orderId: string, requestingBuyerId: string): Promise<OrderRecord>;
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
export declare function cancelOrder(orderId: string, requestingBuyerId: string): Promise<OrderRecord>;
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
export declare function createReturnExchangeRequest(orderId: string, buyerId: string, input: ReturnExchangeRequestSchemaInput): Promise<ReturnExchangeRequest>;
/**
 * Retrieves a return/exchange request by ID.
 * Asserts that the requesting buyer owns the request (else 404).
 *
 * Requirements: 13.4
 */
export declare function getReturnExchangeRequestDetail(requestId: string, requestingBuyerId: string): Promise<ReturnExchangeRequest>;
//# sourceMappingURL=service.d.ts.map