import type middy from '@middy/core';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Configuration options for the structured logger middleware.
 */
export interface LoggerMiddlewareOptions {
  /** The service name to include in every log entry. */
  service: string;
}

/**
 * Sensitive field patterns that must never appear in log output.
 * Requirement 16.2: No stack traces, secrets, JWTs, passwords, or payment credentials.
 */
const SENSITIVE_FIELDS = new Set([
  'password',
  'accessToken',
  'refreshToken',
  'token',
  'jwt',
  'authorization',
  'mockCardLast4',
  'mockUpiRef',
  'cardNumber',
  'cvv',
  'secret',
  'secretKey',
  'apiKey',
]);

/**
 * Sanitizes an error object to remove sensitive data before logging.
 * Only retains errorType and message — no stack trace, no secrets.
 */
function sanitizeError(error: unknown): { errorType: string; message: string } {
  if (error instanceof Error) {
    return {
      errorType: error.constructor.name || 'Error',
      message: error.message,
    };
  }

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    return {
      errorType:
        (typeof err['name'] === 'string' ? err['name'] : undefined) ??
        (typeof err['code'] === 'string' ? err['code'] : undefined) ??
        'UnknownError',
      message: typeof err['message'] === 'string' ? err['message'] : 'An unknown error occurred',
    };
  }

  return {
    errorType: 'UnknownError',
    message: String(error),
  };
}

/**
 * Checks if a string value contains potentially sensitive data.
 */
function containsSensitiveContent(value: string): boolean {
  const lowerValue = value.toLowerCase();
  for (const field of SENSITIVE_FIELDS) {
    if (lowerValue.includes(field.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Sanitizes a message string to remove any embedded sensitive data.
 */
function sanitizeMessage(message: string): string {
  if (containsSensitiveContent(message)) {
    return 'Error occurred (details redacted for security)';
  }
  return message;
}

/**
 * Structured logger Middy middleware.
 *
 * Emits a structured JSON log entry on every request containing:
 * - correlationId: from the request context (set by @middy/correlation-ids)
 * - service: the service name
 * - timestamp: ISO 8601 request timestamp
 * - statusCode: the HTTP response status code
 *
 * On unhandled errors, logs errorType and message only — no stack trace,
 * no JWT, no password, no payment credential.
 *
 * Requirements: 16.1, 16.2
 */
export function structuredLogger(
  options: LoggerMiddlewareOptions,
): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> {
  const { service } = options;

  return {
    after: (request) => {
      const correlationId = extractCorrelationId(request);
      const statusCode = request.response?.statusCode ?? 200;

      const logEntry = {
        level: 'INFO',
        correlationId,
        service,
        timestamp: new Date().toISOString(),
        statusCode,
      };

      // Emit structured JSON log to stdout (CloudWatch captures stdout)
      process.stdout.write(JSON.stringify(logEntry) + '\n');
    },

    onError: (request) => {
      const correlationId = extractCorrelationId(request);
      const sanitizedError = sanitizeError(request.error);
      const statusCode =
        request.response?.statusCode ??
        (request.error && typeof request.error === 'object' && 'statusCode' in request.error
          ? (request.error as { statusCode: number }).statusCode
          : 500);

      const logEntry = {
        level: 'ERROR',
        correlationId,
        service,
        timestamp: new Date().toISOString(),
        statusCode,
        errorType: sanitizedError.errorType,
        message: sanitizeMessage(sanitizedError.message),
      };

      // Emit structured JSON error log to stdout (CloudWatch captures stdout)
      process.stdout.write(JSON.stringify(logEntry) + '\n');
    },
  };
}

/**
 * Extracts the correlation ID from the Middy request context.
 * The correlation ID is set by @middy/correlation-ids middleware.
 */
function extractCorrelationId(request: middy.Request): string {
  // @middy/correlation-ids stores IDs in the internal context
  const internal = request.internal as Record<string, unknown> | undefined;

  if (internal) {
    // @middy/correlation-ids v5 stores correlation IDs in request.internal
    const correlationIds = internal['correlationIds'] as Record<string, string> | undefined;
    if (correlationIds && correlationIds['x-correlation-id']) {
      return correlationIds['x-correlation-id'];
    }
  }

  // Fallback: check event headers for correlation ID
  const event = request.event as APIGatewayProxyEvent;
  const headers = event?.headers;
  if (headers) {
    const correlationId =
      headers['x-correlation-id'] ?? headers['X-Correlation-Id'] ?? headers['X-Correlation-ID'];
    if (correlationId) {
      return correlationId;
    }
  }

  // Fallback: use AWS request ID from context
  const awsRequestId = request.context?.awsRequestId;
  if (awsRequestId) {
    return awsRequestId;
  }

  return 'unknown';
}
