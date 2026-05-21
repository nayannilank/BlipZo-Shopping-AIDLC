import { checkoutSchema } from '@blipzo/shared';
import createError from 'http-errors';
/**
 * Extracts the buyer ID from the API Gateway event's request context.
 * The JWT authorizer places claims in requestContext.authorizer.claims.
 *
 * Requirement 10.1: Only authenticated Buyers can checkout.
 */
export function extractBuyerId(event) {
    const claims = event.requestContext.authorizer?.['claims'];
    const buyerId = claims?.['sub'] ?? event.requestContext.authorizer?.['sub'];
    if (!buyerId) {
        throw createError(401, 'Unauthorized: missing user identity');
    }
    return buyerId;
}
/**
 * Validates the checkout request body against the shared checkoutSchema.
 * Returns a typed CheckoutSchemaInput on success, throws a 400 error on validation failure.
 *
 * Requirement 10.1
 */
export function validateCheckoutInput(event) {
    const body = event.body;
    if (!body || typeof body !== 'object') {
        throw createError(400, 'Request body is required');
    }
    const result = checkoutSchema.safeParse(body);
    if (!result.success) {
        const fields = {};
        for (const issue of result.error.issues) {
            const path = issue.path.join('.');
            if (path) {
                fields[path] = issue.message;
            }
        }
        const error = createError(400, 'Validation failed');
        error['fields'] = fields;
        throw error;
    }
    return result.data;
}
//# sourceMappingURL=validators.js.map