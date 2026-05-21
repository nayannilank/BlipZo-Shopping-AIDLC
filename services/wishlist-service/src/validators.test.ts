import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, it, expect } from 'vitest';

import {
  extractBuyerId,
  validateAddToWishlistInput,
  extractProductIdFromPath,
} from './validators.js';

function createMockEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789',
      apiId: 'api-id',
      authorizer: null,
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
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
      path: '/',
      stage: 'dev',
      requestId: 'req-id',
      requestTimeEpoch: 0,
      resourceId: 'resource-id',
      resourcePath: '/',
    },
    resource: '/',
    ...overrides,
  };
}

describe('extractBuyerId', () => {
  it('should extract buyerId from authorizer claims.sub', () => {
    const event = createMockEvent({
      requestContext: {
        ...createMockEvent().requestContext,
        authorizer: {
          claims: {
            sub: 'buyer-123',
            'custom:role': 'Buyer',
          },
        },
      },
    });

    const result = extractBuyerId(event);
    expect(result).toBe('buyer-123');
  });

  it('should extract buyerId from authorizer.sub directly', () => {
    const event = createMockEvent({
      requestContext: {
        ...createMockEvent().requestContext,
        authorizer: {
          sub: 'buyer-456',
        },
      },
    });

    const result = extractBuyerId(event);
    expect(result).toBe('buyer-456');
  });

  it('should throw 401 when no authorizer is present (Requirement 7.9)', () => {
    const event = createMockEvent({
      requestContext: {
        ...createMockEvent().requestContext,
        authorizer: null,
      },
    });

    expect(() => extractBuyerId(event)).toThrow();
    try {
      extractBuyerId(event);
    } catch (error) {
      expect((error as { statusCode: number }).statusCode).toBe(401);
    }
  });

  it('should throw 401 when authorizer has no sub claim', () => {
    const event = createMockEvent({
      requestContext: {
        ...createMockEvent().requestContext,
        authorizer: {
          claims: {},
        },
      },
    });

    expect(() => extractBuyerId(event)).toThrow();
    try {
      extractBuyerId(event);
    } catch (error) {
      expect((error as { statusCode: number }).statusCode).toBe(401);
    }
  });
});

describe('validateAddToWishlistInput', () => {
  it('should return valid input when productId is provided', () => {
    const event = createMockEvent({
      body: { productId: 'prod-123' } as unknown as string,
    });

    const result = validateAddToWishlistInput(event);
    expect(result).toEqual({ productId: 'prod-123' });
  });

  it('should throw 400 when body is missing', () => {
    const event = createMockEvent({ body: null });

    expect(() => validateAddToWishlistInput(event)).toThrow();
    try {
      validateAddToWishlistInput(event);
    } catch (error) {
      expect((error as { statusCode: number }).statusCode).toBe(400);
    }
  });

  it('should throw 400 when productId is empty', () => {
    const event = createMockEvent({
      body: { productId: '' } as unknown as string,
    });

    expect(() => validateAddToWishlistInput(event)).toThrow();
    try {
      validateAddToWishlistInput(event);
    } catch (error) {
      expect((error as { statusCode: number }).statusCode).toBe(400);
    }
  });

  it('should throw 400 when productId is missing from body', () => {
    const event = createMockEvent({
      body: {} as unknown as string,
    });

    expect(() => validateAddToWishlistInput(event)).toThrow();
    try {
      validateAddToWishlistInput(event);
    } catch (error) {
      expect((error as { statusCode: number }).statusCode).toBe(400);
    }
  });
});

describe('extractProductIdFromPath', () => {
  it('should extract productId from path parameters', () => {
    const event = createMockEvent({
      pathParameters: { productId: 'prod-789' },
    });

    const result = extractProductIdFromPath(event);
    expect(result).toBe('prod-789');
  });

  it('should throw 400 when productId is missing from path', () => {
    const event = createMockEvent({
      pathParameters: null,
    });

    expect(() => extractProductIdFromPath(event)).toThrow();
    try {
      extractProductIdFromPath(event);
    } catch (error) {
      expect((error as { statusCode: number }).statusCode).toBe(400);
    }
  });

  it('should throw 400 when productId is empty in path', () => {
    const event = createMockEvent({
      pathParameters: { productId: '' },
    });

    expect(() => extractProductIdFromPath(event)).toThrow();
    try {
      extractProductIdFromPath(event);
    } catch (error) {
      expect((error as { statusCode: number }).statusCode).toBe(400);
    }
  });
});
