import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/**
 * Props for the ObservabilityStack nested stack.
 */
export interface ObservabilityStackProps extends cdk.NestedStackProps {
  /** Deployment stage: 'dev' | 'qa' | 'prod' */
  readonly stageName: string;

  /** Lambda functions keyed by service name from LambdaStack. */
  readonly functions: Record<string, lambda.Function>;
}

/**
 * All Lambda service names used in the BlipZo platform.
 */
const SERVICES = [
  'auth',
  'product',
  'catalogue',
  'wishlist',
  'cart',
  'order',
  'address',
  'payment',
] as const;

/**
 * ObservabilityStack — CloudWatch log groups, alarms, dashboard, and SNS notifications.
 *
 * Implements:
 * - Req 16.1: Structured JSON logs to CloudWatch Logs for every Lambda
 * - Req 16.3: X-Ray tracing (enabled on Lambda via SecureLambda construct)
 * - Req 16.4: CloudWatch Metrics for order success rate, payment failure rate, catalogue latency
 */
export class ObservabilityStack extends cdk.NestedStack {
  /** The SNS topic for alarm notifications. */
  public readonly alarmTopic: sns.Topic;

  public constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    const { stageName, functions } = props;

    // =========================================================================
    // CloudWatch Log Groups (Req 16.1)
    // One log group per Lambda service with 90-day retention.
    // =========================================================================
    for (const service of SERVICES) {
      new logs.LogGroup(this, `${this.capitalize(service)}LogGroup`, {
        logGroupName: `/aws/lambda/blipzo-${stageName}-${service}`,
        retention: logs.RetentionDays.THREE_MONTHS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    }

    // =========================================================================
    // SNS Topic for Alarm Notifications
    // =========================================================================
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `blipzo-${stageName}-alarms`,
      displayName: `BlipZo ${stageName} Alarms`,
    });

    // Subscribe a placeholder email for alarm notifications
    this.alarmTopic.addSubscription(
      new snsSubscriptions.EmailSubscription('alerts@blipzo.example.com'),
    );

    // =========================================================================
    // CloudWatch Alarms (Req 16.4)
    // =========================================================================

    // --- Payment Failure Count > 10 in 5 minutes ---
    const paymentFailureMetric = new cloudwatch.Metric({
      namespace: `BlipZo/${stageName}`,
      metricName: 'PaymentFailureCount',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const paymentFailureAlarm = new cloudwatch.Alarm(this, 'PaymentFailureAlarm', {
      alarmName: `blipzo-${stageName}-payment-failure-count`,
      alarmDescription: 'Payment failure count exceeds 10 in 5 minutes',
      metric: paymentFailureMetric,
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    paymentFailureAlarm.addAlarmAction(
      new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic),
    );

    // --- Catalogue Response Latency p99 > 2000ms ---
    const catalogueLatencyMetric = new cloudwatch.Metric({
      namespace: `BlipZo/${stageName}`,
      metricName: 'CatalogueResponseLatency',
      statistic: 'p99',
      period: cdk.Duration.minutes(5),
    });

    const catalogueLatencyAlarm = new cloudwatch.Alarm(this, 'CatalogueLatencyAlarm', {
      alarmName: `blipzo-${stageName}-catalogue-latency-p99`,
      alarmDescription: 'Catalogue response latency p99 exceeds 2000ms',
      metric: catalogueLatencyMetric,
      threshold: 2000,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    catalogueLatencyAlarm.addAlarmAction(
      new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic),
    );

    // --- Lambda Error Rate > 1% (per function) ---
    for (const service of SERVICES) {
      const fn = functions[service];
      if (!fn) continue;

      const errorsMetric = fn.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      });

      const invocationsMetric = fn.metricInvocations({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      });

      const errorRateMetric = new cloudwatch.MathExpression({
        expression: '(errors / invocations) * 100',
        usingMetrics: {
          errors: errorsMetric,
          invocations: invocationsMetric,
        },
        period: cdk.Duration.minutes(5),
        label: `${service} Error Rate (%)`,
      });

      const errorRateAlarm = new cloudwatch.Alarm(this, `${this.capitalize(service)}ErrorRateAlarm`, {
        alarmName: `blipzo-${stageName}-${service}-error-rate`,
        alarmDescription: `Lambda error rate for ${service} exceeds 1%`,
        metric: errorRateMetric,
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      errorRateAlarm.addAlarmAction(
        new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic),
      );
    }

    // =========================================================================
    // CloudWatch Dashboard (Req 16.4)
    // Widgets: Order success rate, Payment failure rate, Catalogue latency
    // =========================================================================
    const dashboard = new cloudwatch.Dashboard(this, 'BlipzoDashboard', {
      dashboardName: `blipzo-${stageName}-dashboard`,
    });

    // Order Success Rate widget
    const orderSuccessMetric = new cloudwatch.Metric({
      namespace: `BlipZo/${stageName}`,
      metricName: 'OrderPlacementSuccess',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const orderFailureMetric = new cloudwatch.Metric({
      namespace: `BlipZo/${stageName}`,
      metricName: 'OrderPlacementFailure',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Order Success Rate',
        left: [orderSuccessMetric, orderFailureMetric],
        width: 8,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Payment Failure Rate',
        left: [paymentFailureMetric],
        width: 8,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Catalogue Response Latency (p99)',
        left: [catalogueLatencyMetric],
        width: 8,
        height: 6,
      }),
    );
  }

  /**
   * Capitalizes the first letter of a string for use in construct IDs.
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
