import type { PaymentResponse } from '@blipzo/shared';
import middy from '@middy/core';
import type { Context } from 'aws-lambda';
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
export declare const handler: middy.MiddyfiedHandler<import("aws-lambda").APIGatewayProxyEvent & PaymentLambdaEvent, PaymentResponse | PaymentErrorResponse, Error, Context, {}>;
export {};
//# sourceMappingURL=handler.d.ts.map