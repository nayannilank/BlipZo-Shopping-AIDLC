import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, it, expect } from 'vitest';

import { validateCreateProductInput, extractSellerId } from './validators.js';

function createMockEvent(
  body: unknown,
  authorizer?: Record<string, unknown>,
): APIGatewayProxyEvent {
  return {
    body: body as string,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/products',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api',
      authorizer: authorizer ?? null,
      protocol: 'HTTP/1.1',
      httpMethod: 'POST',
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
      path: '/products',
      stage: 'dev',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'test-resource',
      resourcePath: '/products',
    },
    resource: '/products',
  };
}

describe('validateCreateProductInput', () => {
  const validBody = {
    name: 'Test Product',
    description: 'A great product for testing',
    price: 29.99,
    stockQuantity: 100,
    categories: ['Electronics'],
    images: [
      {
        filename: 'product.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 1024000,
      },
    ],
  };

  it('should accept a valid product creation request', () => {
    const event = createMockEvent(validBody);
    const result = validateCreateProductInput(event);

    expect(result.name).toBe('Test Product');
    expect(result.description).toBe('A great product for testing');
    expect(result.price).toBe(29.99);
    expect(result.stockQuantity).toBe(100);
    expect(result.categories).toEqual(['Electronics']);
    expect(result.images).toHaveLength(1);
  });

  it('should reject when body is missing', () => {
    const event = createMockEvent(null);
    expect(() => validateCreateProductInput(event)).toThrow('Request body is required');
  });

  it('should reject when name is empty', () => {
    const event = createMockEvent({ ...validBody, name: '' });
    expect(() => validateCreateProductInput(event)).toThrow('Validation failed');
  });

  it('should reject when price is 0', () => {
    const event = createMockEvent({ ...validBody, price: 0 });
    expect(() => validateCreateProductInput(event)).toThrow('Validation failed');
  });

  it('should reject when price exceeds maximum', () => {
    const event = createMockEvent({ ...validBody, price: 10000000 });
    expect(() => validateCreateProductInput(event)).toThrow('Validation failed');
  });

  it('should reject when categories is empty array', () => {
    const event = createMockEvent({ ...validBody, categories: [] });
    expect(() => validateCreateProductInput(event)).toThrow('Validation failed');
  });

  it('should reject when images is empty array', () => {
    const event = createMockEvent({ ...validBody, images: [] });
    expect(() => validateCreateProductInput(event)).toThrow('Validation failed');
  });

  it('should reject when image exceeds 10MB', () => {
    const event = createMockEvent({
      ...validBody,
      images: [
        {
          filename: 'large.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 11 * 1024 * 1024,
        },
      ],
    });
    expect(() => validateCreateProductInput(event)).toThrow('Validation failed');
  });

  it('should reject when more than 10 images provided', () => {
    const images = Array.from({ length: 11 }, (_, i) => ({
      filename: `image${String(i)}.jpg`,
      contentType: 'image/jpeg' as const,
      sizeBytes: 1024,
    }));
    const event = createMockEvent({ ...validBody, images });
    expect(() => validateCreateProductInput(event)).toThrow('Validation failed');
  });

  it('should reject invalid image content type', () => {
    const event = createMockEvent({
      ...validBody,
      images: [
        {
          filename: 'doc.pdf',
          contentType: 'application/pdf',
          sizeBytes: 1024,
        },
      ],
    });
    expect(() => validateCreateProductInput(event)).toThrow('Validation failed');
  });
});

describe('extractSellerId', () => {
  it('should extract seller ID from authorizer claims', () => {
    const event = createMockEvent({}, { claims: { sub: 'seller-123', 'custom:role': 'Seller' } });
    const sellerId = extractSellerId(event);
    expect(sellerId).toBe('seller-123');
  });

  it('should extract seller ID from flat authorizer', () => {
    const event = createMockEvent({}, { sub: 'seller-456' });
    const sellerId = extractSellerId(event);
    expect(sellerId).toBe('seller-456');
  });

  it('should throw 401 when no authorizer present', () => {
    const event = createMockEvent({});
    expect(() => extractSellerId(event)).toThrow('Unauthorized');
  });
});
