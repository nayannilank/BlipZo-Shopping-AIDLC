import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { processPayment } from './service.js';
import { validatePaymentRequest } from './validators.js';
import { createInternalError } from './errors.js';
/**
 * Payment Lambda handler — invoked Lambda-to-Lambda by Order_Service.
 * No API Gateway route is exposed for this service.
 *
 * The handler parses the event payload as a PaymentRequest, delegates to
 * the service layer, and returns a PaymentResponse or standardized error.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
const rawHandler = async (event, _context) => {
    try {
        // Validate the incoming payment request
        const paymentRequest = validatePaymentRequest(event);
        // Process the payment
        const response = await processPayment(paymentRequest);
        return response;
    }
    catch (error) {
        // Handle known HTTP errors (from validators/service)
        if (error && typeof error === 'object' && 'statusCode' in error) {
            const httpError = error;
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
        createInternalError();
    }
};
export const handler = middy(rawHandler).use(httpErrorHandler({
    fallbackMessage: 'An unexpected error occurred during payment processing.',
}));
//# sourceMappingURL=handler.js.map