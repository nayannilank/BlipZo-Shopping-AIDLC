import type { AddressSchemaInput, UpdateAddressSchemaInput } from '@blipzo/shared';
import type { APIGatewayProxyEvent } from 'aws-lambda';
/**
 * Extracts the buyer ID from the API Gateway event's request context.
 * The JWT authorizer places claims in requestContext.authorizer.claims.
 */
export declare function extractBuyerId(event: APIGatewayProxyEvent): string;
/**
 * Validates the create address request body against the shared addressSchema.
 * Returns typed AddressSchemaInput on success, throws 400 on validation failure.
 *
 * Requirements: 9.1, 9.2
 */
export declare function validateCreateAddressInput(event: APIGatewayProxyEvent): AddressSchemaInput;
/**
 * Validates the update address request body against the shared updateAddressSchema.
 * Returns typed UpdateAddressSchemaInput on success, throws 400 on validation failure.
 *
 * Requirement 9.5
 */
export declare function validateUpdateAddressInput(event: APIGatewayProxyEvent): UpdateAddressSchemaInput;
/**
 * Extracts the addressId from the path parameters.
 */
export declare function extractAddressIdFromPath(event: APIGatewayProxyEvent): string;
//# sourceMappingURL=validators.d.ts.map