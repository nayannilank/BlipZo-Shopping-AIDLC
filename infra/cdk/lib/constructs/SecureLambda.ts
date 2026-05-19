import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

/**
 * Props for the SecureLambda reusable CDK construct.
 */
export interface SecureLambdaProps {
  /** The service name (e.g. 'auth', 'product', 'catalogue'). */
  readonly serviceName: string;

  /** Deployment stage: 'dev' | 'qa' | 'prod'. */
  readonly stageName: string;

  /** Path to the Lambda code asset directory. */
  readonly codePath: string;

  /** The handler entry point (e.g. 'handler.handler'). */
  readonly handler: string;

  /** Environment variables to pass to the Lambda function. */
  readonly environment?: Record<string, string>;

  /** Lambda memory size in MB (default: 256). */
  readonly memorySize?: number;

  /** Lambda timeout in seconds (default: 30). */
  readonly timeout?: number;
}

/**
 * SecureLambda — Reusable CDK construct for Lambda functions in the BlipZo platform.
 *
 * Features:
 * - Node.js 22 runtime
 * - X-Ray active tracing enabled
 * - Structured CloudWatch log group with 90-day retention
 * - Environment variables for table names and secret ARNs (never values)
 * - Standard environment variables: STAGE_NAME, AWS_NODEJS_CONNECTION_REUSE_ENABLED=1
 *
 * Implements:
 * - Req 15.3: AWS Lambda auto-scaling
 * - Req 16.3: X-Ray tracing on all Lambda functions
 * - Req 17.1: All infrastructure defined using AWS CDK in TypeScript
 * - Req 17.4: No hardcoded secrets
 * - Req 17.5: Least-privilege IAM policies
 */
export class SecureLambda extends Construct {
  /** The underlying Lambda Function resource. */
  public readonly function: lambda.Function;

  /** The CloudWatch Log Group for this Lambda. */
  public readonly logGroup: logs.LogGroup;

  public constructor(scope: Construct, id: string, props: SecureLambdaProps) {
    super(scope, id);

    const { serviceName, stageName, codePath, handler, environment, memorySize, timeout } = props;
    const functionName = `blipzo-${stageName}-${serviceName}`;

    // -------------------------------------------------------------------------
    // CloudWatch Log Group — structured logs with 90-day retention
    // -------------------------------------------------------------------------
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${functionName}`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: stageName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // -------------------------------------------------------------------------
    // Lambda Function
    // -------------------------------------------------------------------------
    this.function = new lambda.Function(this, 'Function', {
      functionName,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler,
      code: lambda.Code.fromAsset(codePath),
      memorySize: memorySize ?? 256,
      timeout: cdk.Duration.seconds(timeout ?? 30),
      tracing: lambda.Tracing.ACTIVE,
      logGroup: this.logGroup,
      environment: {
        STAGE_NAME: stageName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        ...environment,
      },
    });
  }
}
