import type { CartItemSchemaInput } from '@blipzo/shared';
import type { APIGatewayProxyEvent } from 'aws-lambda';
/**
 * Extracts the buyer ID from the API Gateway event's request context.
 * The JWT authorizer places claims in requestContext.authorizer.claims.
 *
 * Requirement 8.7: Unauthenticated requests return 401.
 */
export declare function extractBuyerId(event: APIGatewayProxyEvent): string;
/**
 * Validates the cart item request body against the shared cartItemSchema.
 * Returns a typed CartItemSchemaInput on success, throws a 400 error on validation failure.
 *
 * Requirements: 8.1, 8.3
 */
export declare function validateCartItemInput(event: APIGatewayProxyEvent): CartItemSchemaInput;
/**
 * Extracts the productId from the path parameters for DELETE requests.
 * Validates against removeFromCartSchema.
 *
 * Requirement 8.3
 */
export declare function extractProductIdFromPath(event: APIGatewayProxyEvent): string;
//# sourceMappingURL=validators.d.ts.map