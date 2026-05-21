import type { AddToWishlistSchemaInput } from '@blipzo/shared';
import type { APIGatewayProxyEvent } from 'aws-lambda';
/**
 * Extracts the buyer ID from the API Gateway event's request context.
 * The JWT authorizer places claims in requestContext.authorizer.claims.
 *
 * Requirement 7.9: Unauthenticated requests return 401.
 */
export declare function extractBuyerId(event: APIGatewayProxyEvent): string;
/**
 * Validates the add-to-wishlist request body against the shared addToWishlistSchema.
 * Returns a typed AddToWishlistSchemaInput on success, throws a 400 error on validation failure.
 *
 * Requirement 7.2
 */
export declare function validateAddToWishlistInput(event: APIGatewayProxyEvent): AddToWishlistSchemaInput;
/**
 * Extracts the productId from the path parameters for DELETE requests.
 * Validates against removeFromWishlistSchema.
 *
 * Requirement 7.5
 */
export declare function extractProductIdFromPath(event: APIGatewayProxyEvent): string;
//# sourceMappingURL=validators.d.ts.map