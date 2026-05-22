import { structuredLogger } from '@blipzo/shared';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import {
  createAddress,
  listAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from './service.js';
import {
  extractBuyerId,
  validateCreateAddressInput,
  validateUpdateAddressInput,
  extractAddressIdFromPath,
} from './validators.js';

/**
 * POST /addresses — creates a new address for the authenticated buyer.
 * Validates with addressSchema (fullName, E.164 phone, line1, city, state, postalCode, country),
 * PutItem with PK = BUYER#{buyerId}, SK = ADDRESS#{uuid}, returns 201 with AddressRecord.
 *
 * Requirements: 9.1, 9.2
 */
const rawCreateAddressHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const buyerId = extractBuyerId(event);
  const input = validateCreateAddressInput(event);
  const address = await createAddress(buyerId, input);

  return {
    statusCode: 201,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(address),
  };
};

export const createAddressHandler = middy(rawCreateAddressHandler)
  .use(httpJsonBodyParser())
  .use(structuredLogger({ service: 'address-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * GET /addresses — returns all addresses for the authenticated buyer.
 * Query by PK = BUYER#{buyerId}, return all addresses.
 *
 * Requirement 9.3
 */
const rawListAddressesHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const buyerId = extractBuyerId(event);
  const addresses = await listAddresses(buyerId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ addresses }),
  };
};

export const listAddressesHandler = middy(rawListAddressesHandler)
  .use(structuredLogger({ service: 'address-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * PATCH /addresses/{addressId} — updates an address owned by the authenticated buyer.
 * Asserts ownership (GetItem and check buyerId), validates supplied fields,
 * UpdateExpression for changed fields only, returns updated address.
 *
 * Requirements: 9.5, 9.7
 */
const rawUpdateAddressHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const buyerId = extractBuyerId(event);
  const addressId = extractAddressIdFromPath(event);
  const input = validateUpdateAddressInput(event);
  const address = await updateAddress(buyerId, addressId, input);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(address),
  };
};

export const updateAddressHandler = middy(rawUpdateAddressHandler)
  .use(httpJsonBodyParser())
  .use(structuredLogger({ service: 'address-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * DELETE /addresses/{addressId} — deletes an address owned by the authenticated buyer.
 * Asserts ownership, DeleteItem, returns 200.
 *
 * Requirements: 9.4, 9.7
 */
const rawDeleteAddressHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const buyerId = extractBuyerId(event);
  const addressId = extractAddressIdFromPath(event);
  await deleteAddress(buyerId, addressId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'Address deleted successfully' }),
  };
};

export const deleteAddressHandler = middy(rawDeleteAddressHandler)
  .use(structuredLogger({ service: 'address-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * POST /addresses/{addressId}/default — sets an address as the default for the authenticated buyer.
 * Uses TransactWriteItems to atomically set isDefault = true on the target address
 * and isDefault = false on the previously default address.
 *
 * Requirement 9.6
 */
const rawSetDefaultAddressHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const buyerId = extractBuyerId(event);
  const addressId = extractAddressIdFromPath(event);
  const address = await setDefaultAddress(buyerId, addressId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(address),
  };
};

export const setDefaultAddressHandler = middy(rawSetDefaultAddressHandler)
  .use(structuredLogger({ service: 'address-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );
