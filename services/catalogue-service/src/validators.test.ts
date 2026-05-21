import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, it, expect } from 'vitest';

import {
  extractCategoryId,
  extractProductId,
  extractPaginationParams,
  extractSearchParams,
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
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    resource: '',
    ...overrides,
  };
}

describe('extractCategoryId', () => {
  it('should extract categoryId from path parameters', () => {
    const event = createMockEvent({ pathParameters: { categoryId: 'electronics' } });
    expect(extractCategoryId(event)).toBe('electronics');
  });

  it('should throw 400 when categoryId is missing', () => {
    const event = createMockEvent({ pathParameters: null });
    expect(() => extractCategoryId(event)).toThrow();
  });
});

describe('extractProductId', () => {
  it('should extract productId from path parameters', () => {
    const event = createMockEvent({ pathParameters: { productId: 'prod-123' } });
    expect(extractProductId(event)).toBe('prod-123');
  });

  it('should throw 400 when productId is missing', () => {
    const event = createMockEvent({ pathParameters: null });
    expect(() => extractProductId(event)).toThrow();
  });
});

describe('extractPaginationParams', () => {
  it('should return default limit of 20 when no params provided', () => {
    const event = createMockEvent();
    const result = extractPaginationParams(event);
    expect(result.limit).toBe(20);
    expect(result.cursor).toBeUndefined();
  });

  it('should parse valid limit within range', () => {
    const event = createMockEvent({ queryStringParameters: { limit: '10' } });
    const result = extractPaginationParams(event);
    expect(result.limit).toBe(10);
  });

  it('should clamp limit to default when above max (20)', () => {
    const event = createMockEvent({ queryStringParameters: { limit: '50' } });
    const result = extractPaginationParams(event);
    expect(result.limit).toBe(20);
  });

  it('should clamp limit to default when below min (1)', () => {
    const event = createMockEvent({ queryStringParameters: { limit: '0' } });
    const result = extractPaginationParams(event);
    expect(result.limit).toBe(20);
  });

  it('should extract cursor when provided', () => {
    const event = createMockEvent({ queryStringParameters: { cursor: 'abc123' } });
    const result = extractPaginationParams(event);
    expect(result.cursor).toBe('abc123');
  });

  it('should handle non-numeric limit gracefully', () => {
    const event = createMockEvent({ queryStringParameters: { limit: 'invalid' } });
    const result = extractPaginationParams(event);
    expect(result.limit).toBe(20);
  });
});

describe('extractSearchParams', () => {
  it('should extract valid search query', () => {
    const event = createMockEvent({ queryStringParameters: { q: 'laptop' } });
    const result = extractSearchParams(event);
    expect(result.query).toBe('laptop');
    expect(result.limit).toBe(20);
  });

  it('should throw when query is missing', () => {
    const event = createMockEvent({ queryStringParameters: null });
    expect(() => extractSearchParams(event)).toThrow();
  });

  it('should throw when query is whitespace only', () => {
    const event = createMockEvent({ queryStringParameters: { q: '   ' } });
    expect(() => extractSearchParams(event)).toThrow();
  });

  it('should throw when query exceeds 100 characters', () => {
    const longQuery = 'a'.repeat(101);
    const event = createMockEvent({ queryStringParameters: { q: longQuery } });
    expect(() => extractSearchParams(event)).toThrow();
  });

  it('should accept query at exactly 100 characters', () => {
    const maxQuery = 'a'.repeat(100);
    const event = createMockEvent({ queryStringParameters: { q: maxQuery } });
    const result = extractSearchParams(event);
    expect(result.query).toBe(maxQuery);
  });

  it('should extract pagination params alongside search query', () => {
    const event = createMockEvent({
      queryStringParameters: { q: 'phone', limit: '5', cursor: 'xyz' },
    });
    const result = extractSearchParams(event);
    expect(result.query).toBe('phone');
    expect(result.limit).toBe(5);
    expect(result.cursor).toBe('xyz');
  });
});
