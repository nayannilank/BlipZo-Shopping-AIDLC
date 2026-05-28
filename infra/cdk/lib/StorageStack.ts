import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

/**
 * Props for the StorageStack nested stack.
 */
export interface StorageStackProps extends cdk.NestedStackProps {
  /** Deployment stage: 'dev' | 'qa' | 'prod' */
  readonly stageName: string;
}

/**
 * StorageStack — S3 buckets for the BlipZo Shopping Platform.
 *
 * Creates the product-images S3 bucket with:
 * - BlockPublicAccess.BLOCK_ALL (no public access)
 * - S3-managed encryption (SSE-S3)
 * - 365-day lifecycle rule for object management
 *
 * Implements:
 * - Req 5.8: Product images stored in S3
 * - Req 17.1: All infrastructure defined using AWS CDK in TypeScript
 */
export class StorageStack extends cdk.NestedStack {
  /** The S3 bucket for product images. */
  public readonly productImagesBucket: s3.Bucket;

  public constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const { stageName } = props;
    const resourceName = (suffix: string): string => `blipzo-${stageName}-${suffix}`;
    const removalPolicy =
      stageName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // -------------------------------------------------------------------------
    // Product Images S3 Bucket
    // -------------------------------------------------------------------------
    this.productImagesBucket = new s3.Bucket(this, 'ProductImagesBucket', {
      bucketName: resourceName('product-images'),
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        ignorePublicAcls: true,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      removalPolicy,
      autoDeleteObjects: stageName !== 'prod',
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3600,
        },
      ],
      lifecycleRules: [
        {
          id: 'ExpireAfter365Days',
          enabled: true,
          expiration: cdk.Duration.days(365),
        },
      ],
    });

    // Allow public read access to product images via bucket policy
    this.productImagesBucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        sid: 'AllowPublicReadProducts',
        effect: cdk.aws_iam.Effect.ALLOW,
        principals: [new cdk.aws_iam.StarPrincipal()],
        actions: ['s3:GetObject'],
        resources: [this.productImagesBucket.arnForObjects('products/*')],
      }),
    );

    // -------------------------------------------------------------------------
    // Stack Outputs — Bucket ARN and Name
    // -------------------------------------------------------------------------
    new cdk.CfnOutput(this, 'ProductImagesBucketName', {
      value: this.productImagesBucket.bucketName,
      description: 'Product images S3 bucket name',
    });

    new cdk.CfnOutput(this, 'ProductImagesBucketArn', {
      value: this.productImagesBucket.bucketArn,
      description: 'Product images S3 bucket ARN',
    });
  }
}
