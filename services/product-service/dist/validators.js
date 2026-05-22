import { createProductSchema, updateProductSchema, sellerPolicySchema } from '@blipzo/shared';
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
    const role = claims?.['custom:role'] ??
        event.requestContext.authorizer?.['custom:role'];
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
/**
 * Extracts the productId from the path parameters.
 * Throws 400 if not present.
 */
export function extractProductId(event) {
    const productId = event.pathParameters?.['productId'];
    if (!productId) {
        throw createError(400, 'Product ID is required');
    }
    return productId;
}
/**
 * Validates the update product request body against the shared updateProductSchema.
 * Returns a typed UpdateProductSchemaInput on success, throws a 400 error on validation failure.
 * Ensures at least one field is provided for update.
 *
 * Requirements: 5.5, 5.7
 */
export function validateUpdateProductInput(event) {
    const body = event.body;
    if (!body || typeof body !== 'object') {
        throw createError(400, 'Request body is required');
    }
    const result = updateProductSchema.safeParse(body);
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
    // Ensure at least one field is provided
    const data = result.data;
    const hasAtLeastOneField = data.name !== undefined ||
        data.description !== undefined ||
        data.price !== undefined ||
        data.stockQuantity !== undefined ||
        data.categories !== undefined ||
        data.images !== undefined;
    if (!hasAtLeastOneField) {
        throw createError(400, 'At least one field must be provided for update');
    }
    return data;
}
/**
 * Extracts pagination parameters from query string.
 */
export function extractPaginationParams(event) {
    const limitStr = event.queryStringParameters?.['limit'];
    const cursorParam = event.queryStringParameters?.['cursor'];
    let limit = 20;
    if (limitStr) {
        const parsed = parseInt(limitStr, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
            limit = parsed;
        }
    }
    const result = { limit };
    if (cursorParam) {
        result.cursor = cursorParam;
    }
    return result;
}
/**
 * Validates the seller policy request body against the shared sellerPolicySchema.
 * Returns a typed SellerPolicySchemaInput on success, throws a 400 error on validation failure.
 *
 * Requirements: 14.1
 */
export function validateSellerPolicyInput(event) {
    const body = event.body;
    if (!body || typeof body !== 'object') {
        throw createError(400, 'Request body is required');
    }
    const result = sellerPolicySchema.safeParse(body);
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