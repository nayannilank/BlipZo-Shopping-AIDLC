import type middy from '@middy/core';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { structuredLogger } from './logger.middleware.js';

function createMockRequest(overrides?: Partial<middy.Request>): middy.Request {
  return {
    event: {
      headers: {
        'x-correlation-id': 'test-correlation-123',
      },
      body: null,
      httpMethod: 'GET',
      path: '/test',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent['requestContext'],
      resource: '',
      multiValueHeaders: {},
      isBase64Encoded: false,
    } as APIGatewayProxyEvent,
    context: {
      awsRequestId: 'aws-req-456',
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:test',
      memoryLimitInMB: '128',
      logGroupName: '/aws/lambda/test',
      logStreamName: '2024/01/01/[$LATEST]abc123',
      callbackWaitsForEmptyEventLoop: true,
      getRemainingTimeInMillis: () => 5000,
      done: () => undefined,
      fail: () => undefined,
      succeed: () => undefined,
    } as Context,
    response: {
      statusCode: 200,
      body: '{}',
    } as APIGatewayProxyResult,
    error: null as unknown as Error,
    internal: {},
    ...overrides,
  } as middy.Request;
}

describe('structuredLogger middleware', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation((() => true) as unknown as typeof process.stdout.write);
  });

  describe('after hook (successful requests)', () => {
    it('emits a structured JSON log entry with required fields', () => {
      const middleware = structuredLogger({ service: 'auth-service' });
      const request = createMockRequest();

      middleware.after!(request);

      expect(stdoutSpy).toHaveBeenCalledTimes(1);
      const logOutput = stdoutSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(logOutput.trim());

      expect(logEntry).toMatchObject({
        level: 'INFO',
        correlationId: 'test-correlation-123',
        service: 'auth-service',
        statusCode: 200,
      });
      expect(logEntry.timestamp).toBeDefined();
      // Verify timestamp is a valid ISO 8601 string
      expect(new Date(logEntry.timestamp).toISOString()).toBe(logEntry.timestamp);
    });

    it('uses AWS request ID as fallback when no correlation ID header is present', () => {
      const middleware = structuredLogger({ service: 'product-service' });
      const request = createMockRequest({
        event: {
          headers: {},
          body: null,
          httpMethod: 'GET',
          path: '/test',
          pathParameters: null,
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          stageVariables: null,
          requestContext: {} as APIGatewayProxyEvent['requestContext'],
          resource: '',
          multiValueHeaders: {},
          isBase64Encoded: false,
        } as APIGatewayProxyEvent,
      });

      middleware.after!(request);

      const logOutput = stdoutSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(logOutput.trim());

      expect(logEntry.correlationId).toBe('aws-req-456');
    });

    it('logs the correct status code from the response', () => {
      const middleware = structuredLogger({ service: 'order-service' });
      const request = createMockRequest({
        response: { statusCode: 201, body: '{}' } as APIGatewayProxyResult,
      });

      middleware.after!(request);

      const logOutput = stdoutSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(logOutput.trim());

      expect(logEntry.statusCode).toBe(201);
    });
  });

  describe('onError hook (error requests)', () => {
    it('emits an ERROR-level log with errorType and message', () => {
      const middleware = structuredLogger({ service: 'cart-service' });
      const request = createMockRequest({
        error: new TypeError('Invalid input'),
        response: null as unknown as APIGatewayProxyResult,
      });

      middleware.onError!(request);

      expect(stdoutSpy).toHaveBeenCalledTimes(1);
      const logOutput = stdoutSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(logOutput.trim());

      expect(logEntry).toMatchObject({
        level: 'ERROR',
        correlationId: 'test-correlation-123',
        service: 'cart-service',
        errorType: 'TypeError',
        message: 'Invalid input',
      });
      expect(logEntry.statusCode).toBe(500);
      expect(logEntry.timestamp).toBeDefined();
    });

    it('does NOT include stack trace in error logs', () => {
      const middleware = structuredLogger({ service: 'auth-service' });
      const error = new Error('Something went wrong');
      error.stack =
        'Error: Something went wrong\n    at Object.<anonymous> (/app/src/handler.ts:42:11)';

      const request = createMockRequest({ error });

      middleware.onError!(request);

      const logOutput = stdoutSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(logOutput.trim());

      expect(logEntry.stack).toBeUndefined();
      expect(logOutput).not.toContain('handler.ts');
      expect(logOutput).not.toContain('at Object');
    });

    it('does NOT include sensitive data (JWT, password, payment credentials) in error logs', () => {
      const middleware = structuredLogger({ service: 'payment-service' });
      const error = new Error('Invalid accessToken provided for user password reset');

      const request = createMockRequest({ error });

      middleware.onError!(request);

      const logOutput = stdoutSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(logOutput.trim());

      // Message should be redacted because it contains sensitive field names
      expect(logEntry.message).toBe('Error occurred (details redacted for security)');
    });

    it('uses statusCode from HTTP error objects', () => {
      const middleware = structuredLogger({ service: 'wishlist-service' });
      const error = Object.assign(new Error('Not Found'), { statusCode: 404 });

      const request = createMockRequest({
        error,
        response: null as unknown as APIGatewayProxyResult,
      });

      middleware.onError!(request);

      const logOutput = stdoutSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(logOutput.trim());

      expect(logEntry.statusCode).toBe(404);
    });

    it('handles non-Error objects gracefully', () => {
      const middleware = structuredLogger({ service: 'catalogue-service' });
      const request = createMockRequest({
        error: { name: 'ValidationError', message: 'Field is required' } as unknown as Error,
        response: null as unknown as APIGatewayProxyResult,
      });

      middleware.onError!(request);

      const logOutput = stdoutSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(logOutput.trim());

      expect(logEntry.errorType).toBe('ValidationError');
      expect(logEntry.message).toBe('Field is required');
    });
  });

  describe('correlation ID extraction', () => {
    it('reads correlation ID from x-correlation-id header (lowercase)', () => {
      const middleware = structuredLogger({ service: 'auth-service' });
      const request = createMockRequest();

      middleware.after!(request);

      const logOutput = stdoutSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(logOutput.trim());

      expect(logEntry.correlationId).toBe('test-correlation-123');
    });

    it('reads correlation ID from middy internal context when available', () => {
      const middleware = structuredLogger({ service: 'auth-service' });
      const request = createMockRequest({
        internal: {
          correlationIds: {
            'x-correlation-id': 'middy-internal-id-789',
          },
        },
      });

      middleware.after!(request);

      const logOutput = stdoutSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(logOutput.trim());

      expect(logEntry.correlationId).toBe('middy-internal-id-789');
    });

    it('falls back to "unknown" when no correlation ID source is available', () => {
      const middleware = structuredLogger({ service: 'auth-service' });
      const request = createMockRequest({
        event: {
          headers: {},
          body: null,
          httpMethod: 'GET',
          path: '/test',
          pathParameters: null,
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          stageVariables: null,
          requestContext: {} as APIGatewayProxyEvent['requestContext'],
          resource: '',
          multiValueHeaders: {},
          isBase64Encoded: false,
        } as APIGatewayProxyEvent,
        context: {} as Context,
      });

      middleware.after!(request);

      const logOutput = stdoutSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(logOutput.trim());

      expect(logEntry.correlationId).toBe('unknown');
    });
  });
});
