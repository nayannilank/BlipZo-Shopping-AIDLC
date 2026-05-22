import { createMetricsLogger, Unit } from 'aws-embedded-metrics';

/**
 * Emits the OrderPlacementSuccess metric to CloudWatch via Embedded Metrics Format.
 * Called after a successful checkout operation.
 *
 * Namespace: BlipZo/OrderService
 * Metric: OrderPlacementSuccess (Count)
 *
 * Requirement 16.4: Emit CloudWatch Metrics for order placement success rate.
 */
export async function emitOrderPlacementSuccess(): Promise<void> {
  const metrics = createMetricsLogger();
  metrics.setNamespace('BlipZo/OrderService');
  metrics.setDimensions({ Service: 'order-service' });
  metrics.putMetric('OrderPlacementSuccess', 1, Unit.Count);
  await metrics.flush();
}
