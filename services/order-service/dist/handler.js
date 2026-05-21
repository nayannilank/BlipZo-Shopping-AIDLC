import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { checkout } from './service.js';
import { extractBuyerId, validateCheckoutInput } from './validators.js';
/**
 * POST /orders/checkout — places an order for the buyer's cart items.
 *
 * Flow:
 * 1. Validate CheckoutRequest (addressId, paymentMethod)
 * 2. Query cart items
 * 3. Batch-get product stock — if any item has quantity > stockQuantity return 400 INSUFFICIENT_STOCK
 * 4. Invoke Payment Lambda via AWS SDK
 * 5. TransactWriteItems to atomically create OrderRecord + decrement all stock quantities
 * 6. Clear buyer cart via BatchWriteItem
 * 7. Return 201 with OrderRecord
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
const rawCheckoutHandler = async (event) => {
    const buyerId = extractBuyerId(event);
    const input = validateCheckoutInput(event);
    const orderRecord = await checkout(buyerId, input);
    return {
        statusCode: 201,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderRecord),
    };
};
export const checkoutHandler = middy(rawCheckoutHandler)
    .use(httpJsonBodyParser())
    .use(httpErrorHandler({
    fallbackMessage: 'An unexpected error occurred. Please try again later.',
}));
//# sourceMappingURL=handler.js.map