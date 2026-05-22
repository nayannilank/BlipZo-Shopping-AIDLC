import type { CheckoutSchemaInput, ReturnExchangeRequestSchemaInput } from '@blipzo/shared';
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
/**
 * Parsed query parameters for order history pagination.
 */
export interface OrderHistoryParams {
    limit: number;
    cursor?: string;
}
/**
 * Extracts and validates pagination query parameters for order history.
 * - `limit`: integer between 1 and 100, defaults to 20
 * - `cursor`: optional base64-encoded pagination cursor
 *
 * Requirement 12.1
 */
export declare function extractOrderHistoryParams(event: APIGatewayProxyEvent): OrderHistoryParams;
/**
 * Extracts the orderId path parameter from the API Gateway event.
 * Throws 400 if the orderId is missing.
 *
 * Requirement 12.2
 */
export declare function extractOrderId(event: APIGatewayProxyEvent): string;
/**
 * Validates the return/exchange request body against the shared returnExchangeRequestSchema.
 * Returns a typed ReturnExchangeRequestSchemaInput on success, throws a 400 error on validation failure.
 *
 * Requirement 13.1
 */
export declare function validateReturnExchangeInput(event: APIGatewayProxyEvent): ReturnExchangeRequestSchemaInput;
/**
 * Extracts the requestId path parameter from the API Gateway event.
 * Throws 400 if the requestId is missing.
 *
 * Requirement 13.4
 */
export declare function extractRequestId(event: APIGatewayProxyEvent): string;
//# sourceMappingURL=validators.d.ts.map