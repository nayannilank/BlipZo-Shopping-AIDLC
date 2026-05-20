import { createProductSchema } from '@blipzo/shared';
import createError from 'http-errors';
/**
 * Extracts the seller ID from the API Gateway event's request context.
 * The JWT authorizer places claims in requestContext.authorizer.claims.
 */
export function extractSellerId(event) {
    const claims = event.requestContext.authorizer?.['claims'];
    const sellerId = claims?.['sub'] ?? event.requestContext.authorizer?.['sub'];
    if (!sellerId) {
        throw createError(401, 'Unauthorized: missing user identity');
    }
    return sellerId;
}
/**
 * Extracts the user role from the API Gateway event's request context.
 */
export function extractUserRole(event) {
    const claims = event.requestContext.authorizer?.['claims'];
    const role = claims?.['custom:role'] ?? event.requestContext.authorizer?.['custom:role'];
    return role ?? '';
}
/**
 * Validates the create product request body against the shared createProductSchema.
 * Returns a typed CreateProductRequest on success, throws a 400 error on validation failure.
 *
 * Requirement 5.1, 5.2
 */
export function validateCreateProductInput(event) {
    const body = event.body;
    if (!body || typeof body !== 'object') {
        throw createError(400, 'Request body is required');
    }
    const result = createProductSchema.safeParse(body);
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