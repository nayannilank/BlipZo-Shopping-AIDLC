import type { CheckoutSchemaInput } from '@blipzo/shared';
import type { APIGatewayProxyEvent } from 'aws-lambda';
/**
 * Extracts the buyer ID from the API Gateway event's request context.
 * The JWT authorizer places claims in requestContext.authorizer.claims.
 *
 * Requirement 10.1: Only authenticated Buyers can checkout.
 */
export declare function extractBuyerId(event: APIGatewayProxyEvent): string;
/**
 * Validates the checkout request body against the shared checkoutSchema.
 * Returns a typed CheckoutSchemaInput on success, throws a 400 error on validation failure.
 *
 * Requirement 10.1
 */
export declare function validateCheckoutInput(event: APIGatewayProxyEvent): CheckoutSchemaInput;
//# sourceMappingURL=validators.d.ts.map