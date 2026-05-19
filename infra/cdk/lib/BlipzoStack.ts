import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { ApiStack } from './ApiStack';
import { AuthStack } from './AuthStack';
import { DatabaseStack } from './DatabaseStack';
import { LambdaStack } from './LambdaStack';
import { ObservabilityStack } from './ObservabilityStack';
import { StorageStack } from './StorageStack';

/**
 * Props for the BlipzoStack root stack.
 * Extends cdk.StackProps to support all standard CDK stack options
 * while adding the required stageName for environment isolation (Req 17.2).
 */
export interface BlipzoStackProps extends cdk.StackProps {
  /** Deployment stage: 'dev' | 'qa' | 'prod' */
  readonly stageName: string;
}

/**
 * BlipzoStack — Root CDK stack for the BlipZo Shopping Platform.
 *
 * This stack composes all nested infrastructure stacks for a single
 * deployment environment. Each environment (dev, qa, prod) gets its
 * own independent instance of every AWS resource, satisfying Req 17.2.
 *
 * Resource naming convention: `blipzo-{stageName}-{resource}`
 *
 * Nested stacks (to be added in tasks 2.2–2.7):
 *   - AuthStack       (task 2.2) — Cognito User Pool + User Pool Client
 *   - DatabaseStack   (task 2.3) — DynamoDB tables
 *   - StorageStack    (task 2.4) — S3 product-images bucket
 *   - ApiStack        (task 2.5) — API Gateway REST API + Cognito authorizer
 *   - LambdaStack     (task 2.6) — Lambda functions + IAM least-privilege policies
 *   - ObservabilityStack (task 2.7) — CloudWatch log groups, alarms, dashboard, SNS
 */
export class BlipzoStack extends cdk.Stack {
  /** The deployment stage name (dev | qa | prod). */
  public readonly stageName: string;

  public constructor(scope: Construct, id: string, props: BlipzoStackProps) {
    super(scope, id, props);

    const { stageName } = props;
    this.stageName = stageName;

    // -------------------------------------------------------------------------
    // Nested stacks
    // -------------------------------------------------------------------------

    // Auth (task 2.2) — Cognito User Pool + User Pool Client
    const authStack = new AuthStack(this, 'AuthStack', { stageName });

    // Database (task 2.3) — DynamoDB tables
    const databaseStack = new DatabaseStack(this, 'DatabaseStack', { stageName });

    // Storage (task 2.4) — S3 product-images bucket
    const storageStack = new StorageStack(this, 'StorageStack', { stageName });

    // API Gateway (task 2.5) — REST API + Cognito authorizer
    const apiStack = new ApiStack(this, 'ApiStack', {
      stageName,
      userPool: authStack.userPool,
    });

    // Lambda (task 2.6) — Lambda functions + IAM least-privilege policies
    const lambdaStack = new LambdaStack(this, 'LambdaStack', {
      stageName,
      tables: {
        otpTable: databaseStack.otpTable,
        productsTable: databaseStack.productsTable,
        wishlistsTable: databaseStack.wishlistsTable,
        cartsTable: databaseStack.cartsTable,
        ordersTable: databaseStack.ordersTable,
        returnExchangeRequestsTable: databaseStack.returnExchangeRequestsTable,
        addressesTable: databaseStack.addressesTable,
        paymentsTable: databaseStack.paymentsTable,
      },
      bucket: storageStack.productImagesBucket,
      api: apiStack.api,
      authorizer: apiStack.authorizer,
      userPool: authStack.userPool,
    });

    // Observability (task 2.7) — CloudWatch log groups, alarms, dashboard, SNS
    const observabilityStack = new ObservabilityStack(this, 'ObservabilityStack', {
      stageName,
      functions: lambdaStack.functions,
    });

    // Suppress unused variable warnings — will be referenced by downstream stacks
    void observabilityStack;

    // Stack-level tags applied to all resources in this environment.
    cdk.Tags.of(this).add('blipzo:stage', this.stageName);
    cdk.Tags.of(this).add('blipzo:stack', 'root');

    // CfnOutput: expose the stage name for cross-stack reference and CI/CD use.
    new cdk.CfnOutput(this, 'StageName', {
      value: this.stageName,
      description: 'Deployment stage name',
      exportName: `BlipzoStack-${this.stageName}-StageName`,
    });
  }

  /**
   * Returns the standard resource name prefix for this environment.
   * All resources should be named using this helper to ensure consistent
   * namespacing: `blipzo-{stageName}-{resourceSuffix}`.
   *
   * @param resourceSuffix - The resource-specific suffix (e.g. 'products', 'otp')
   */
  public resourceName(resourceSuffix: string): string {
    return `blipzo-${this.stageName}-${resourceSuffix}`;
  }
}
