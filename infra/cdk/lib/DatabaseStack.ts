import * as path from 'path';

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

import { BlipzoTable } from './constructs/BlipzoTable';

/**
 * Props for the DatabaseStack nested stack.
 */
export interface DatabaseStackProps extends cdk.NestedStackProps {
  /** Deployment stage: 'dev' | 'qa' | 'prod' */
  readonly stageName: string;
}

/**
 * DatabaseStack — DynamoDB tables for the BlipZo Shopping Platform.
 *
 * Creates all DynamoDB tables with:
 * - Encryption at rest (AWS-managed key)
 * - Point-in-time recovery enabled
 * - PAY_PER_REQUEST billing mode
 * - TTL where applicable
 * - GSIs for access-pattern-first queries
 *
 * Implements:
 * - Req 15.5: DynamoDB access-pattern-first design to avoid full-table scans
 * - Req 17.1: All infrastructure defined using AWS CDK in TypeScript
 * - Req 17.2: Environment isolation via stage-prefixed table names
 */
export class DatabaseStack extends cdk.NestedStack {
  /** OTP table for phone/OTP authentication. */
  public readonly otpTable: dynamodb.Table;

  /** Products table for product catalogue. */
  public readonly productsTable: dynamodb.Table;

  /** Categories table for product categories. */
  public readonly categoriesTable: dynamodb.Table;

  /** Wishlists table for buyer wishlists. */
  public readonly wishlistsTable: dynamodb.Table;

  /** Carts table for buyer shopping carts. */
  public readonly cartsTable: dynamodb.Table;

  /** Orders table for purchase orders. */
  public readonly ordersTable: dynamodb.Table;

  /** Return/Exchange requests table. */
  public readonly returnExchangeRequestsTable: dynamodb.Table;

  /** Addresses table for buyer delivery addresses. */
  public readonly addressesTable: dynamodb.Table;

  /** Payments table for payment transaction records. */
  public readonly paymentsTable: dynamodb.Table;

  /** Users table for extended user profile data. */
  public readonly usersTable: dynamodb.Table;

  public constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { stageName } = props;
    const resourceName = (suffix: string): string => `blipzo-${stageName}-${suffix}`;
    const removalPolicy =
      stageName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // -------------------------------------------------------------------------
    // OTP Table — PK only, TTL on expiresAt
    // -------------------------------------------------------------------------
    const otpConstruct = new BlipzoTable(this, 'OtpTable', {
      tableName: resourceName('otp'),
      partitionKeyName: 'PK',
      ttlAttributeName: 'expiresAt',
      removalPolicy,
    });
    this.otpTable = otpConstruct.table;

    // -------------------------------------------------------------------------
    // Products Table — PK + SK, GSI1 (Subcategory browsing), GSI2-SellerProducts
    // GSI1PK = SUBCATEGORY#{subcategoryId}, GSI1SK = CREATED#{timestamp}
    // Enables querying products by subcategory sorted by creation date descending.
    // Note: GSI index name retained as 'GSI1-CategoryByDate' to avoid destructive
    // CloudFormation change. New products use SUBCATEGORY# prefix in GSI1PK.
    // -------------------------------------------------------------------------
    const productsConstruct = new BlipzoTable(this, 'ProductsTable', {
      tableName: resourceName('products'),
      partitionKeyName: 'PK',
      sortKeyName: 'SK',
      globalSecondaryIndexes: [
        {
          indexName: 'GSI1-CategoryByDate',
          partitionKeyName: 'GSI1PK',
          sortKeyName: 'GSI1SK',
        },
        {
          indexName: 'GSI2-SellerProducts',
          partitionKeyName: 'GSI2PK',
          sortKeyName: 'GSI2SK',
        },
      ],
      removalPolicy,
    });
    this.productsTable = productsConstruct.table;

    // -------------------------------------------------------------------------
    // Categories Table — PK + SK, GSI ParentIndex
    // Supports hierarchical category nodes and attribute schemas using
    // a single-table pattern.
    // PK = CAT#{categoryId}, SK = METADATA | SCHEMA#v{version}
    // GSI ParentIndex: GSI1PK = PARENT#{parentId}, GSI1SK = NAME#{name}
    // -------------------------------------------------------------------------
    const categoriesConstruct = new BlipzoTable(this, 'CategoriesTable', {
      tableName: resourceName('categories'),
      partitionKeyName: 'PK',
      sortKeyName: 'SK',
      globalSecondaryIndexes: [
        {
          indexName: 'ParentIndex',
          partitionKeyName: 'GSI1PK',
          sortKeyName: 'GSI1SK',
        },
      ],
      removalPolicy,
    });
    this.categoriesTable = categoriesConstruct.table;

    // -------------------------------------------------------------------------
    // Category Seed Custom Resource — Seeds category nodes and attribute schemas
    // Runs on CREATE/UPDATE during cdk deploy. Idempotent via
    // ConditionExpression: attribute_not_exists(PK).
    // -------------------------------------------------------------------------
    const seedHandlerPath = path.join(__dirname, '..', 'seed', 'category-seed-handler.ts');

    const categorySeedLogGroup = new logs.LogGroup(this, 'CategorySeedLogGroup', {
      logGroupName: `/aws/lambda/blipzo-${stageName}-category-seed`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy,
    });

    const categorySeedFn = new lambdaNodejs.NodejsFunction(this, 'CategorySeedFunction', {
      functionName: `blipzo-${stageName}-category-seed`,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: seedHandlerPath,
      handler: 'handler',
      memorySize: 256,
      timeout: cdk.Duration.minutes(2),
      logGroup: categorySeedLogGroup,
      environment: {
        CATEGORIES_TABLE_NAME: this.categoriesTable.tableName,
      },
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
    });

    this.categoriesTable.grantWriteData(categorySeedFn);

    const categorySeedProvider = new cr.Provider(this, 'CategorySeedProvider', {
      onEventHandler: categorySeedFn,
    });

    new cdk.CustomResource(this, 'CategorySeedResource', {
      serviceToken: categorySeedProvider.serviceToken,
      properties: {
        TableName: this.categoriesTable.tableName,
        // Change this value to force re-seeding on deploy
        Version: '1',
      },
    });

    // -------------------------------------------------------------------------
    // Wishlists Table — PK + SK
    // -------------------------------------------------------------------------
    const wishlistsConstruct = new BlipzoTable(this, 'WishlistsTable', {
      tableName: resourceName('wishlists'),
      partitionKeyName: 'PK',
      sortKeyName: 'SK',
      removalPolicy,
    });
    this.wishlistsTable = wishlistsConstruct.table;

    // -------------------------------------------------------------------------
    // Carts Table — PK + SK
    // -------------------------------------------------------------------------
    const cartsConstruct = new BlipzoTable(this, 'CartsTable', {
      tableName: resourceName('carts'),
      partitionKeyName: 'PK',
      sortKeyName: 'SK',
      removalPolicy,
    });
    this.cartsTable = cartsConstruct.table;

    // -------------------------------------------------------------------------
    // Orders Table — PK + SK, GSI1-BuyerOrders
    // -------------------------------------------------------------------------
    const ordersConstruct = new BlipzoTable(this, 'OrdersTable', {
      tableName: resourceName('orders'),
      partitionKeyName: 'PK',
      sortKeyName: 'SK',
      globalSecondaryIndexes: [
        {
          indexName: 'GSI1-BuyerOrders',
          partitionKeyName: 'GSI1PK',
          sortKeyName: 'GSI1SK',
        },
      ],
      removalPolicy,
    });
    this.ordersTable = ordersConstruct.table;

    // -------------------------------------------------------------------------
    // Return-Exchange-Requests Table — PK + SK, GSI1-OrderRequests
    // -------------------------------------------------------------------------
    const returnExchangeConstruct = new BlipzoTable(this, 'ReturnExchangeRequestsTable', {
      tableName: resourceName('return-exchange-requests'),
      partitionKeyName: 'PK',
      sortKeyName: 'SK',
      globalSecondaryIndexes: [
        {
          indexName: 'GSI1-OrderRequests',
          partitionKeyName: 'GSI1PK',
          sortKeyName: 'GSI1SK',
        },
      ],
      removalPolicy,
    });
    this.returnExchangeRequestsTable = returnExchangeConstruct.table;

    // -------------------------------------------------------------------------
    // Addresses Table — PK + SK
    // -------------------------------------------------------------------------
    const addressesConstruct = new BlipzoTable(this, 'AddressesTable', {
      tableName: resourceName('addresses'),
      partitionKeyName: 'PK',
      sortKeyName: 'SK',
      removalPolicy,
    });
    this.addressesTable = addressesConstruct.table;

    // -------------------------------------------------------------------------
    // Payments Table — PK + SK
    // -------------------------------------------------------------------------
    const paymentsConstruct = new BlipzoTable(this, 'PaymentsTable', {
      tableName: resourceName('payments'),
      partitionKeyName: 'PK',
      sortKeyName: 'SK',
      removalPolicy,
    });
    this.paymentsTable = paymentsConstruct.table;

    // -------------------------------------------------------------------------
    // Users Table — PK only (extended user profile data)
    // -------------------------------------------------------------------------
    const usersConstruct = new BlipzoTable(this, 'UsersTable', {
      tableName: resourceName('users'),
      partitionKeyName: 'PK',
      removalPolicy,
    });
    this.usersTable = usersConstruct.table;

    // -------------------------------------------------------------------------
    // Stack Outputs — Table ARNs and Names
    // -------------------------------------------------------------------------
    new cdk.CfnOutput(this, 'OtpTableName', {
      value: this.otpTable.tableName,
      description: 'OTP DynamoDB table name',
    });
    new cdk.CfnOutput(this, 'OtpTableArn', {
      value: this.otpTable.tableArn,
      description: 'OTP DynamoDB table ARN',
    });

    new cdk.CfnOutput(this, 'ProductsTableName', {
      value: this.productsTable.tableName,
      description: 'Products DynamoDB table name',
    });
    new cdk.CfnOutput(this, 'ProductsTableArn', {
      value: this.productsTable.tableArn,
      description: 'Products DynamoDB table ARN',
    });

    new cdk.CfnOutput(this, 'WishlistsTableName', {
      value: this.wishlistsTable.tableName,
      description: 'Wishlists DynamoDB table name',
    });
    new cdk.CfnOutput(this, 'WishlistsTableArn', {
      value: this.wishlistsTable.tableArn,
      description: 'Wishlists DynamoDB table ARN',
    });

    new cdk.CfnOutput(this, 'CartsTableName', {
      value: this.cartsTable.tableName,
      description: 'Carts DynamoDB table name',
    });
    new cdk.CfnOutput(this, 'CartsTableArn', {
      value: this.cartsTable.tableArn,
      description: 'Carts DynamoDB table ARN',
    });

    new cdk.CfnOutput(this, 'OrdersTableName', {
      value: this.ordersTable.tableName,
      description: 'Orders DynamoDB table name',
    });
    new cdk.CfnOutput(this, 'OrdersTableArn', {
      value: this.ordersTable.tableArn,
      description: 'Orders DynamoDB table ARN',
    });

    new cdk.CfnOutput(this, 'ReturnExchangeRequestsTableName', {
      value: this.returnExchangeRequestsTable.tableName,
      description: 'Return-Exchange-Requests DynamoDB table name',
    });
    new cdk.CfnOutput(this, 'ReturnExchangeRequestsTableArn', {
      value: this.returnExchangeRequestsTable.tableArn,
      description: 'Return-Exchange-Requests DynamoDB table ARN',
    });

    new cdk.CfnOutput(this, 'AddressesTableName', {
      value: this.addressesTable.tableName,
      description: 'Addresses DynamoDB table name',
    });
    new cdk.CfnOutput(this, 'AddressesTableArn', {
      value: this.addressesTable.tableArn,
      description: 'Addresses DynamoDB table ARN',
    });

    new cdk.CfnOutput(this, 'PaymentsTableName', {
      value: this.paymentsTable.tableName,
      description: 'Payments DynamoDB table name',
    });
    new cdk.CfnOutput(this, 'PaymentsTableArn', {
      value: this.paymentsTable.tableArn,
      description: 'Payments DynamoDB table ARN',
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.usersTable.tableName,
      description: 'Users DynamoDB table name',
    });
    new cdk.CfnOutput(this, 'UsersTableArn', {
      value: this.usersTable.tableArn,
      description: 'Users DynamoDB table ARN',
    });
  }
}
