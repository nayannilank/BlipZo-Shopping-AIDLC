import type { CreateProductRequest } from '@blipzo/shared';
import type { APIGatewayProxyEvent } from 'aws-lambda';
/**
 * Extracts the seller ID from the API Gateway event's request context.
 * The JWT authorizer places claims in requestContext.authorizer.claims.
 */
export declare function extractSellerId(event: APIGatewayProxyEvent): string;
/**
 * Extracts the user role from the API Gateway event's request context.
 */
export declare function extractUserRole(event: APIGatewayProxyEvent): string;
/**
 * Validates the create product request body against the shared createProductSchema.
 * Returns a typed CreateProductRequest on success, throws a 400 error on validation failure.
 *
 * Requirement 5.1, 5.2
 */
export declare function validateCreateProductInput(event: APIGatewayProxyEvent): CreateProductRequest;
//# sourceMappingURL=validators.d.ts.map