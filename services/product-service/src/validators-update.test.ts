import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, it, expect } from 'vitest';

import {
  validateUpdateProductInput,
  extractProductId,
  extractPaginationParams,
} from './validators.js';

function createMockEvent(
  body: unknown,
  pathParameters?: Record<string, string> | null,
  queryStringParameters?: Record<string, string> | null,
): APIGatewayProxyEvent {
  return {
    body: body as string,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'PATCH',
    isBase64Encoded: false,
    path: '/products/prod-123',
    pathParameters: pathParameters ?? { productId: 'prod-123' },
    queryStringParameters: queryStringParameters ?? null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api',
      authorizer: { claims: { sub: 'seller-abc', 'custom:role': 'Seller' } },
      protocol: 'HTTP/1.1',
      httpMethod: 'PATCH',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: null,
        userArn: null,
      },
      path: '/products/prod-123',
      stage: 'dev',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'test-resource',
      resourcePath: '/products/{productId}',
    },
    resource: '/products/{productId}',
  };
}

describe('validateUpdateProductInput', () => {
  it('should accept a valid partial update with name only', () => {
    const event = createMockEvent({ name: 'Updated Name' });
    const result = validateUpdateProductInput(event);
    expect(result.name).toBe('Updated Name');
  });

  it('should accept a valid partial update with price only', () => {
    const event = createMockEvent({ price: 49.99 });
    const result = validateUpdateProductInput(event);
    expect(result.price).toBe(49.99);
  });

  it('should accept a valid partial update with multiple fields', () => {
    const event = createMockEvent({ name: 'New Name', price: 99.99, stockQuantity: 50 });
    const result = validateUpdateProductInput(event);
    expect(result.name).toBe('New Name');
    expect(result.price).toBe(99.99);
    expect(result.stockQuantity).toBe(50);
  });

  it('should reject when body is missing', () => {
    const event = createMockEvent(null);
    expect(() => validateUpdateProductInput(event)).toThrow('Request body is required');
  });

  it('should reject when no fields are provided (empty object)', () => {
    const event = createMockEvent({});
    expect(() => validateUpdateProductInput(event)).toThrow('At least one field must be provided');
  });

  it('should reject when name is empty string', () => {
    const event = createMockEvent({ name: '' });
    expect(() => validateUpdateProductInput(event)).toThrow('Validation failed');
  });

  it('should reject when name exceeds 200 characters', () => {
    const event = createMockEvent({ name: 'x'.repeat(201) });
    expect(() => validateUpdateProductInput(event)).toThrow('Validation failed');
  });

  it('should reject when price is 0', () => {
    const event = createMockEvent({ price: 0 });
    expect(() => validateUpdateProductInput(event)).toThrow('Validation failed');
  });

  it('should reject when price is negative', () => {
    const event = createMockEvent({ price: -10 });
    expect(() => validateUpdateProductInput(event)).toThrow('Validation failed');
  });

  it('should reject when price exceeds maximum', () => {
    const event = createMockEvent({ price: 10000000 });
    expect(() => validateUpdateProductInput(event)).toThrow('Validation failed');
  });

  it('should reject when stockQuantity is negative', () => {
    const event = createMockEvent({ stockQuantity: -1 });
    expect(() => validateUpdateProductInput(event)).toThrow('Validation failed');
  });

  it('should reject when categories is empty array', () => {
    const event = createMockEvent({ categories: [] });
    expect(() => validateUpdateProductInput(event)).toThrow('Validation failed');
  });
});

describe('extractProductId', () => {
  it('should extract productId from path parameters', () => {
    const event = createMockEvent({}, { productId: 'prod-456' });
    const productId = extractProductId(event);
    expect(productId).toBe('prod-456');
  });

  it('should throw 400 when productId is missing', () => {
    const event = createMockEvent({}, {});
    expect(() => extractProductId(event)).toThrow('Product ID is required');
  });
});

describe('extractPaginationParams', () => {
  it('should return default limit of 20 when no params provided', () => {
    const event = createMockEvent({}, null, null);
    const { limit, cursor } = extractPaginationParams(event);
    expect(limit).toBe(20);
    expect(cursor).toBeUndefined();
  });

  it('should parse valid limit from query string', () => {
    const event = createMockEvent({}, null, { limit: '10' });
    const { limit } = extractPaginationParams(event);
    expect(limit).toBe(10);
  });

  it('should cap limit at 100', () => {
    const event = createMockEvent({}, null, { limit: '200' });
    const { limit } = extractPaginationParams(event);
    expect(limit).toBe(20); // Falls back to default since 200 > 100
  });

  it('should use default limit for invalid values', () => {
    const event = createMockEvent({}, null, { limit: 'abc' });
    const { limit } = extractPaginationParams(event);
    expect(limit).toBe(20);
  });

  it('should extract cursor from query string', () => {
    const event = createMockEvent({}, null, { cursor: 'abc123' });
    const { cursor } = extractPaginationParams(event);
    expect(cursor).toBe('abc123');
  });
});
