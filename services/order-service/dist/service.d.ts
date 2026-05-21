import type { CheckoutSchemaInput, OrderRecord } from '@blipzo/shared';
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
//# sourceMappingURL=service.d.ts.map