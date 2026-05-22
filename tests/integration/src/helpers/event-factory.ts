/**
 * Factory functions for creating mock API Gateway events for integration tests.
 * These simulate the events that Lambda handlers receive from API Gateway.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Creates a base API Gateway event with sensible defaults.
 */
export function createApiEvent(
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    headers: {
      'Content-Type': 'application/json',
    },
    multiValueHeaders: {},
    body: null,
    isBase64Encoded: false,
    resource: '',
    stageVariables: null,
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api-id',
      authorizer: {},
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
        userAgent: 'test-agent',
        userArn: null,
      },
      path: '/',
      stage: 'test',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'test-resource-id',
      resourcePath: '/',
    },
    ...overrides,
  };
}

/**
 * Creates a POST event with a JSON body.
 */
export function createPostEvent(
  path: string,
  body: unknown,
  options: {
    pathParameters?: Record<string, string>;
    headers?: Record<string, string>;
    authorizer?: Record<string, unknown>;
  } = {},
): APIGatewayProxyEvent {
  return createApiEvent({
    httpMethod: 'POST',
    path,
    body: JSON.stringify(body),
    pathParameters: options.pathParameters ?? null,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    requestContext: {
      ...createApiEvent().requestContext,
      httpMethod: 'POST',
      path,
      authorizer: options.authorizer ?? {},
    },
  });
}

/**
 * Creates a GET event with optional query parameters.
 */
export function createGetEvent(
  path: string,
  options: {
    pathParameters?: Record<string, string>;
    queryStringParameters?: Record<string, string>;
    headers?: Record<string, string>;
    authorizer?: Record<string, unknown>;
  } = {},
): APIGatewayProxyEvent {
  return createApiEvent({
    httpMethod: 'GET',
    path,
    pathParameters: options.pathParameters ?? null,
    queryStringParameters: options.queryStringParameters ?? null,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    requestContext: {
      ...createApiEvent().requestContext,
      httpMethod: 'GET',
      path,
      authorizer: options.authorizer ?? {},
    },
  });
}

/**
 * Creates a PUT event with a JSON body.
 */
export function createPutEvent(
  path: string,
  body: unknown,
  options: {
    pathParameters?: Record<string, string>;
    headers?: Record<string, string>;
    authorizer?: Record<string, unknown>;
  } = {},
): APIGatewayProxyEvent {
  return createApiEvent({
    httpMethod: 'PUT',
    path,
    body: JSON.stringify(body),
    pathParameters: options.pathParameters ?? null,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    requestContext: {
      ...createApiEvent().requestContext,
      httpMethod: 'PUT',
      path,
      authorizer: options.authorizer ?? {},
    },
  });
}

/**
 * Creates a PATCH event with a JSON body.
 */
export function createPatchEvent(
  path: string,
  body: unknown,
  options: {
    pathParameters?: Record<string, string>;
    headers?: Record<string, string>;
    authorizer?: Record<string, unknown>;
  } = {},
): APIGatewayProxyEvent {
  return createApiEvent({
    httpMethod: 'PATCH',
    path,
    body: JSON.stringify(body),
    pathParameters: options.pathParameters ?? null,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    requestContext: {
      ...createApiEvent().requestContext,
      httpMethod: 'PATCH',
      path,
      authorizer: options.authorizer ?? {},
    },
  });
}

/**
 * Creates a DELETE event.
 */
export function createDeleteEvent(
  path: string,
  options: {
    pathParameters?: Record<string, string>;
    headers?: Record<string, string>;
    authorizer?: Record<string, unknown>;
  } = {},
): APIGatewayProxyEvent {
  return createApiEvent({
    httpMethod: 'DELETE',
    path,
    pathParameters: options.pathParameters ?? null,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    requestContext: {
      ...createApiEvent().requestContext,
      httpMethod: 'DELETE',
      path,
      authorizer: options.authorizer ?? {},
    },
  });
}

/**
 * Creates an authenticated event with JWT claims in the authorizer context.
 */
export function withAuth(
  event: APIGatewayProxyEvent,
  claims: { sub: string; 'custom:role': string },
): APIGatewayProxyEvent {
  return {
    ...event,
    requestContext: {
      ...event.requestContext,
      authorizer: {
        claims,
      },
    },
  };
}
