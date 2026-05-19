import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

/**
 * Configuration for a Global Secondary Index on a BlipzoTable.
 */
export interface BlipzoTableGsiProps {
  /** The name of the GSI. */
  readonly indexName: string;
  /** The partition key attribute name for the GSI. */
  readonly partitionKeyName: string;
  /** The sort key attribute name for the GSI (optional). */
  readonly sortKeyName?: string;
}

/**
 * Props for the BlipzoTable reusable CDK construct.
 */
export interface BlipzoTableProps {
  /** The full table name (e.g. `blipzo-dev-otp`). */
  readonly tableName: string;

  /** The partition key attribute name. */
  readonly partitionKeyName: string;

  /** The sort key attribute name (optional — omit for PK-only tables). */
  readonly sortKeyName?: string;

  /** The TTL attribute name (optional — omit if no TTL is needed). */
  readonly ttlAttributeName?: string;

  /** Global Secondary Indexes (optional). */
  readonly globalSecondaryIndexes?: BlipzoTableGsiProps[];

  /** CDK removal policy — defaults to DESTROY for non-prod convenience. */
  readonly removalPolicy?: cdk.RemovalPolicy;
}

/**
 * BlipzoTable — Reusable CDK construct for DynamoDB tables in the BlipZo platform.
 *
 * Features:
 * - Encryption at rest (AWS-managed key)
 * - Point-in-time recovery enabled
 * - PAY_PER_REQUEST billing mode
 * - Optional TTL attribute
 * - Optional sort key
 * - Optional Global Secondary Indexes
 *
 * Implements:
 * - Req 15.5: DynamoDB access-pattern-first design
 * - Req 17.1: All infrastructure defined using AWS CDK in TypeScript
 */
export class BlipzoTable extends Construct {
  /** The underlying DynamoDB Table resource. */
  public readonly table: dynamodb.Table;

  public constructor(scope: Construct, id: string, props: BlipzoTableProps) {
    super(scope, id);

    const tableProps: dynamodb.TableProps = {
      tableName: props.tableName,
      partitionKey: {
        name: props.partitionKeyName,
        type: dynamodb.AttributeType.STRING,
      },
      ...(props.sortKeyName && {
        sortKey: {
          name: props.sortKeyName,
          type: dynamodb.AttributeType.STRING,
        },
      }),
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      ...(props.ttlAttributeName && {
        timeToLiveAttribute: props.ttlAttributeName,
      }),
      removalPolicy: props.removalPolicy ?? cdk.RemovalPolicy.DESTROY,
    };

    this.table = new dynamodb.Table(this, 'Table', tableProps);

    // Add Global Secondary Indexes
    if (props.globalSecondaryIndexes) {
      for (const gsi of props.globalSecondaryIndexes) {
        this.table.addGlobalSecondaryIndex({
          indexName: gsi.indexName,
          partitionKey: {
            name: gsi.partitionKeyName,
            type: dynamodb.AttributeType.STRING,
          },
          ...(gsi.sortKeyName && {
            sortKey: {
              name: gsi.sortKeyName,
              type: dynamodb.AttributeType.STRING,
            },
          }),
          projectionType: dynamodb.ProjectionType.ALL,
        });
      }
    }
  }
}
