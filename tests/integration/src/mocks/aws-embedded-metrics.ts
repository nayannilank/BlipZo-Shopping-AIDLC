/**
 * Mock for aws-embedded-metrics.
 * Provides no-op implementations for metrics logging in tests.
 */

export const Unit = {
  Count: 'Count',
  Milliseconds: 'Milliseconds',
  Seconds: 'Seconds',
  Bytes: 'Bytes',
  None: 'None',
};

class MockMetricsLogger {
  setNamespace(_namespace: string): void {}
  setDimensions(_dimensions: Record<string, string>): void {}
  putMetric(_name: string, _value: number, _unit?: string): void {}
  async flush(): Promise<void> {}
}

export function createMetricsLogger(): MockMetricsLogger {
  return new MockMetricsLogger();
}
