import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { createProduct } from './service.js';
import { validateCreateProductInput, extractSellerId } from './validators.js';

/**
 * POST /products — thin handler that delegates to service layer.
 * Validates input, extracts seller identity from JWT claims,
 * calls createProduct, returns 201 with full ProductRecord and upload URLs.
 *
 * Requirements: 5.1, 5.2, 5.8
 */
const rawCreateProductHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const sellerId = extractSellerId(event);
  const input = validateCreateProductInput(event);
  const result = await createProduct(input, sellerId);

  return {
    statusCode: 201,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...result.product,
      uploadUrls: result.uploadUrls,
    }),
  };
};

export const createProductHandler = middy(rawCreateProductHandler)
  .use(httpJsonBodyParser())
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );
