import type middy from '@middy/core';
import { createMetricsLogger, Unit } from 'aws-embedded-metrics';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Emits the CatalogueResponseLatency metric to CloudWatch via Embedded Metrics Format.
 * Called on every catalogue response with the duration in milliseconds.
 *
 * Namespace: BlipZo/CatalogueService
 * Metric: CatalogueResponseLatency (Milliseconds)
 *
 * Requirement 16.4: Emit CloudWatch Metrics for catalogue response latency.
 */
export async function emitCatalogueResponseLatency(durationMs: number): Promise<void> {
  const metrics = createMetricsLogger();
  metrics.setNamespace('BlipZo/CatalogueService');
  metrics.setDimensions({ Service: 'catalogue-service' });
  metrics.putMetric('CatalogueResponseLatency', durationMs, Unit.Milliseconds);
  await metrics.flush();
}

/**
 * Middy middleware that measures request duration and emits CatalogueResponseLatency metric.
 * Attaches a start timestamp in the `before` hook and emits the metric in the `after` and `onError` hooks.
 *
 * Requirement 16.4: Emit CloudWatch Metrics for catalogue response latency on every response.
 */
export function catalogueLatencyMetrics(): middy.MiddlewareObj<
  APIGatewayProxyEvent,
  APIGatewayProxyResult
> {
  const startTimeKey = '__catalogueLatencyStart';

  return {
    before: (request) => {
      (request.internal as Record<string, unknown>)[startTimeKey] = Date.now();
    },
    after: async (request) => {
      const startTime = (request.internal as Record<string, unknown>)[startTimeKey] as
        | number
        | undefined;
      if (startTime) {
        const durationMs = Date.now() - startTime;
        await emitCatalogueResponseLatency(durationMs);
      }
    },
    onError: async (request) => {
      const startTime = (request.internal as Record<string, unknown>)[startTimeKey] as
        | number
        | undefined;
      if (startTime) {
        const durationMs = Date.now() - startTime;
        await emitCatalogueResponseLatency(durationMs);
      }
    },
  };
}
