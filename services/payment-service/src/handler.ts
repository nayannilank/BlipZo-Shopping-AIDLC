import type { PaymentResponse } from '@blipzo/shared';
import { structuredLogger } from '@blipzo/shared';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import type { Context } from 'aws-lambda';

import { createInternalError } from './errors.js';
import { emitPaymentFailureCount } from './metrics.js';
import { processPayment } from './service.js';
import { validatePaymentRequest } from './validators.js';

/**
 * Lambda event shape for Lambda-to-Lambda invocation.
 * The Payment_Service is invoked directly by Order_Service via AWS SDK,
 * not through API Gateway. The event payload is the PaymentRequest itself.
 */
interface PaymentLambdaEvent {
  orderId?: string;
  amount?: number;
  method?: string;
  mockPayload?: {
    mockCardLast4?: string;
    mockUpiRef?: string;
  };
}

/**
 * Standardized error response for Lambda-to-Lambda communication.
 */
interface PaymentErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

/**
 * Payment Lambda handler — invoked Lambda-to-Lambda by Order_Service.
 * No API Gateway route is exposed for this service.
 *
 * The handler parses the event payload as a PaymentRequest, delegates to
 * the service layer, and returns a PaymentResponse or standardized error.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
const rawHandler = async (
  event: PaymentLambdaEvent,
  _context: Context,
): Promise<PaymentResponse | PaymentErrorResponse> => {
  try {
    // Validate the incoming payment request
    const paymentRequest = validatePaymentRequest(event);

    // Process the payment
    const response = await processPayment(paymentRequest);

    return response;
  } catch (error) {
    // Handle known HTTP errors (from validators/service)
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const httpError = error as {
        statusCode: number;
        message: string;
        code?: string;
        fields?: Record<string, string>;
      };

      // Requirement 16.4: Emit PaymentFailureCount metric on payment failure
      await emitPaymentFailureCount();

      return {
        success: false,
        error: {
          code: httpError.code ?? 'UNKNOWN_ERROR',
          message: httpError.message,
          ...(httpError.fields ? { fields: httpError.fields } : {}),
        },
      };
    }

    // Requirement 11.4: Internal error returns standardized error response
    // Requirement 16.4: Emit PaymentFailureCount metric on internal payment failure
    await emitPaymentFailureCount();
    createInternalError();
  }
};

export const handler = middy(rawHandler)
  .use(structuredLogger({ service: 'payment-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred during payment processing.',
    }),
  );
