import { createMetricsLogger, Unit } from 'aws-embedded-metrics';

/**
 * Emits the PaymentFailureCount metric to CloudWatch via Embedded Metrics Format.
 * Called when a payment processing attempt fails.
 *
 * Namespace: BlipZo/PaymentService
 * Metric: PaymentFailureCount (Count)
 *
 * Requirement 16.4: Emit CloudWatch Metrics for payment failure rate.
 */
export async function emitPaymentFailureCount(): Promise<void> {
  const metrics = createMetricsLogger();
  metrics.setNamespace('BlipZo/PaymentService');
  metrics.setDimensions({ Service: 'payment-service' });
  metrics.putMetric('PaymentFailureCount', 1, Unit.Count);
  await metrics.flush();
}
