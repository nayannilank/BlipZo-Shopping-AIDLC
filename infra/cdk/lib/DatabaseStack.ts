import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
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

  public constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { stageName } = props;
    const resourceName = (suffix: string): string => `blipzo-${stageName}-${suffix}`;
    const removalPolicy = stageName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

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
    // Products Table — PK + SK, GSI1-CategoryByDate, GSI2-SellerProducts
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
  }
}
