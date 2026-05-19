import * as path from 'path';

import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

import { SecureLambda } from './constructs/SecureLambda';

/**
 * Props for the LambdaStack nested stack.
 */
export interface LambdaStackProps extends cdk.NestedStackProps {
  /** Deployment stage: 'dev' | 'qa' | 'prod' */
  readonly stageName: string;

  /** DynamoDB tables from DatabaseStack. */
  readonly tables: {
    readonly otpTable: dynamodb.Table;
    readonly productsTable: dynamodb.Table;
    readonly wishlistsTable: dynamodb.Table;
    readonly cartsTable: dynamodb.Table;
    readonly ordersTable: dynamodb.Table;
    readonly returnExchangeRequestsTable: dynamodb.Table;
    readonly addressesTable: dynamodb.Table;
    readonly paymentsTable: dynamodb.Table;
  };

  /** S3 bucket for product images from StorageStack. */
  readonly bucket: s3.Bucket;

  /** The REST API from ApiStack. */
  readonly api: apigateway.RestApi;

  /** The Cognito authorizer from ApiStack. */
  readonly authorizer: apigateway.CognitoUserPoolsAuthorizer;

  /** The Cognito User Pool from AuthStack. */
  readonly userPool: cognito.IUserPool;
}

/**
 * LambdaStack — Lambda functions and IAM policies for the BlipZo Shopping Platform.
 *
 * Creates one Lambda function per service using the SecureLambda construct,
 * attaches least-privilege IAM policies, and wires each Lambda to its
 * API Gateway resource/method.
 *
 * Implements:
 * - Req 15.3: AWS Lambda auto-scaling
 * - Req 16.3: X-Ray tracing on all Lambda functions
 * - Req 17.1: All infrastructure defined using AWS CDK in TypeScript
 * - Req 17.4: No hardcoded secrets
 * - Req 17.5: Least-privilege IAM policies
 */
export class LambdaStack extends cdk.NestedStack {
  /** All Lambda functions keyed by service name. */
  public readonly functions: Record<string, lambda.Function>;

  public constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const { stageName, tables, bucket, api, authorizer, userPool } = props;
    this.functions = {};

    const servicesDir = path.join(__dirname, '..', '..', '..', 'services');

    // =========================================================================
    // Auth Lambda
    // =========================================================================
    const authLambda = new SecureLambda(this, 'AuthLambda', {
      serviceName: 'auth-service',
      stageName,
      codePath: path.join(servicesDir, 'auth-service', 'dist'),
      handler: 'handler.handler',
      environment: {
        OTP_TABLE_NAME: tables.otpTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
        SECRETS_ARN: `arn:aws:secretsmanager:${this.region}:${this.account}:secret:blipzo/${stageName}/*`,
      },
    });

    // Auth Lambda IAM: OTP table read/write, Cognito admin actions, Secrets Manager read
    tables.otpTable.grantReadWriteData(authLambda.function);

    authLambda.function.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminInitiateAuth',
          'cognito-idp:AdminUpdateUserAttributes',
          'cognito-idp:AdminGetUser',
        ],
        resources: [userPool.userPoolArn],
      }),
    );

    authLambda.function.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          `arn:aws:secretsmanager:${this.region}:${this.account}:secret:blipzo/${stageName}/*`,
        ],
      }),
    );

    this.functions['auth'] = authLambda.function;

    // =========================================================================
    // Product Lambda
    // =========================================================================
    const productLambda = new SecureLambda(this, 'ProductLambda', {
      serviceName: 'product-service',
      stageName,
      codePath: path.join(servicesDir, 'product-service', 'dist'),
      handler: 'handler.handler',
      environment: {
        PRODUCTS_TABLE_NAME: tables.productsTable.tableName,
        PRODUCT_IMAGES_BUCKET: bucket.bucketName,
      },
    });

    // Product Lambda IAM: products table read/write, S3 put/delete
    tables.productsTable.grantReadWriteData(productLambda.function);
    bucket.grantPut(productLambda.function);
    bucket.grantDelete(productLambda.function);

    this.functions['product'] = productLambda.function;

    // =========================================================================
    // Catalogue Lambda
    // =========================================================================
    const catalogueLambda = new SecureLambda(this, 'CatalogueLambda', {
      serviceName: 'catalogue-service',
      stageName,
      codePath: path.join(servicesDir, 'catalogue-service', 'dist'),
      handler: 'handler.handler',
      environment: {
        PRODUCTS_TABLE_NAME: tables.productsTable.tableName,
      },
    });

    // Catalogue Lambda IAM: products table read-only
    tables.productsTable.grantReadData(catalogueLambda.function);

    this.functions['catalogue'] = catalogueLambda.function;

    // =========================================================================
    // Wishlist Lambda
    // =========================================================================
    const wishlistLambda = new SecureLambda(this, 'WishlistLambda', {
      serviceName: 'wishlist-service',
      stageName,
      codePath: path.join(servicesDir, 'wishlist-service', 'dist'),
      handler: 'handler.handler',
      environment: {
        WISHLISTS_TABLE_NAME: tables.wishlistsTable.tableName,
        PRODUCTS_TABLE_NAME: tables.productsTable.tableName,
      },
    });

    // Wishlist Lambda IAM: wishlists table read/write, products table read
    tables.wishlistsTable.grantReadWriteData(wishlistLambda.function);
    tables.productsTable.grantReadData(wishlistLambda.function);

    this.functions['wishlist'] = wishlistLambda.function;

    // =========================================================================
    // Cart Lambda
    // =========================================================================
    const cartLambda = new SecureLambda(this, 'CartLambda', {
      serviceName: 'cart-service',
      stageName,
      codePath: path.join(servicesDir, 'cart-service', 'dist'),
      handler: 'handler.handler',
      environment: {
        CARTS_TABLE_NAME: tables.cartsTable.tableName,
        PRODUCTS_TABLE_NAME: tables.productsTable.tableName,
      },
    });

    // Cart Lambda IAM: carts table read/write, products table read
    tables.cartsTable.grantReadWriteData(cartLambda.function);
    tables.productsTable.grantReadData(cartLambda.function);

    this.functions['cart'] = cartLambda.function;

    // =========================================================================
    // Order Lambda
    // =========================================================================
    const orderLambda = new SecureLambda(this, 'OrderLambda', {
      serviceName: 'order-service',
      stageName,
      codePath: path.join(servicesDir, 'order-service', 'dist'),
      handler: 'handler.handler',
      environment: {
        ORDERS_TABLE_NAME: tables.ordersTable.tableName,
        RETURN_EXCHANGE_REQUESTS_TABLE_NAME: tables.returnExchangeRequestsTable.tableName,
        PRODUCTS_TABLE_NAME: tables.productsTable.tableName,
        CARTS_TABLE_NAME: tables.cartsTable.tableName,
        PAYMENT_FUNCTION_NAME: `blipzo-${stageName}-payment-service`,
      },
    });

    // Order Lambda IAM: orders read/write, return-exchange-requests read/write,
    // products read/write, carts write, invoke payment Lambda
    tables.ordersTable.grantReadWriteData(orderLambda.function);
    tables.returnExchangeRequestsTable.grantReadWriteData(orderLambda.function);
    tables.productsTable.grantReadWriteData(orderLambda.function);
    tables.cartsTable.grantWriteData(orderLambda.function);

    orderLambda.function.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [
          `arn:aws:lambda:${this.region}:${this.account}:function:blipzo-${stageName}-payment-service`,
        ],
      }),
    );

    this.functions['order'] = orderLambda.function;

    // =========================================================================
    // Address Lambda
    // =========================================================================
    const addressLambda = new SecureLambda(this, 'AddressLambda', {
      serviceName: 'address-service',
      stageName,
      codePath: path.join(servicesDir, 'address-service', 'dist'),
      handler: 'handler.handler',
      environment: {
        ADDRESSES_TABLE_NAME: tables.addressesTable.tableName,
      },
    });

    // Address Lambda IAM: addresses table read/write
    tables.addressesTable.grantReadWriteData(addressLambda.function);

    this.functions['address'] = addressLambda.function;

    // =========================================================================
    // Payment Lambda
    // =========================================================================
    const paymentLambda = new SecureLambda(this, 'PaymentLambda', {
      serviceName: 'payment-service',
      stageName,
      codePath: path.join(servicesDir, 'payment-service', 'dist'),
      handler: 'handler.handler',
      environment: {
        PAYMENTS_TABLE_NAME: tables.paymentsTable.tableName,
      },
    });

    // Payment Lambda IAM: payments table read/write
    tables.paymentsTable.grantReadWriteData(paymentLambda.function);

    this.functions['payment'] = paymentLambda.function;

    // =========================================================================
    // Wire Lambda functions to API Gateway routes
    // =========================================================================
    this.wireApiRoutes(api, authorizer, {
      auth: authLambda.function,
      product: productLambda.function,
      catalogue: catalogueLambda.function,
      wishlist: wishlistLambda.function,
      cart: cartLambda.function,
      order: orderLambda.function,
      address: addressLambda.function,
    });
  }

  /**
   * Wires each Lambda function to its corresponding API Gateway resource/method.
   * Replaces the MockIntegration that was previously defined in ApiStack.
   */
  private wireApiRoutes(
    api: apigateway.RestApi,
    authorizer: apigateway.CognitoUserPoolsAuthorizer,
    fns: {
      auth: lambda.Function;
      product: lambda.Function;
      catalogue: lambda.Function;
      wishlist: lambda.Function;
      cart: lambda.Function;
      order: lambda.Function;
      address: lambda.Function;
    },
  ): void {
    const authIntegration = new apigateway.LambdaIntegration(fns.auth);
    const productIntegration = new apigateway.LambdaIntegration(fns.product);
    const catalogueIntegration = new apigateway.LambdaIntegration(fns.catalogue);
    const wishlistIntegration = new apigateway.LambdaIntegration(fns.wishlist);
    const cartIntegration = new apigateway.LambdaIntegration(fns.cart);
    const orderIntegration = new apigateway.LambdaIntegration(fns.order);
    const addressIntegration = new apigateway.LambdaIntegration(fns.address);

    const methodResponseOk: apigateway.MethodResponse = { statusCode: '200' };

    // Helper: find a resource by path segments from root
    const findResource = (segments: string[]): apigateway.IResource => {
      let resource: apigateway.IResource = api.root;
      for (const segment of segments) {
        const child = resource.getResource(segment);
        if (!child) {
          throw new Error(`API resource not found: ${segments.join('/')}`);
        }
        resource = child;
      }
      return resource;
    };

    // =========================================================================
    // Auth_Service Routes (NO auth required)
    // =========================================================================
    const authRegister = findResource(['auth', 'register']);
    authRegister.addMethod('POST', authIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [methodResponseOk],
    });

    const authLogin = findResource(['auth', 'login']);
    authLogin.addMethod('POST', authIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [methodResponseOk],
    });

    const authOtpRequest = findResource(['auth', 'otp', 'request']);
    authOtpRequest.addMethod('POST', authIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [methodResponseOk],
    });

    const authOtpVerify = findResource(['auth', 'otp', 'verify']);
    authOtpVerify.addMethod('POST', authIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [methodResponseOk],
    });

    const authTokenRefresh = findResource(['auth', 'token', 'refresh']);
    authTokenRefresh.addMethod('POST', authIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [methodResponseOk],
    });

    // =========================================================================
    // Product_Service Routes (JWT required)
    // =========================================================================
    const products = findResource(['products']);
    products.addMethod('POST', productIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    const productById = findResource(['products', '{productId}']);
    productById.addMethod('GET', productIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [methodResponseOk],
    });
    productById.addMethod('PATCH', productIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });
    productById.addMethod('DELETE', productIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    const productPolicy = findResource(['products', '{productId}', 'policy']);
    productPolicy.addMethod('POST', productIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    const productsSellerMe = findResource(['products', 'seller', 'me']);
    productsSellerMe.addMethod('GET', productIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    // =========================================================================
    // Catalogue_Service Routes (NO auth required)
    // =========================================================================
    const catalogueCategories = findResource(['catalogue', 'categories']);
    catalogueCategories.addMethod('GET', catalogueIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [methodResponseOk],
    });

    const catalogueCategoryById = findResource(['catalogue', 'categories', '{categoryId}']);
    catalogueCategoryById.addMethod('GET', catalogueIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [methodResponseOk],
    });

    const catalogueSearch = findResource(['catalogue', 'search']);
    catalogueSearch.addMethod('GET', catalogueIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [methodResponseOk],
    });

    const catalogueProductById = findResource(['catalogue', 'products', '{productId}']);
    catalogueProductById.addMethod('GET', catalogueIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [methodResponseOk],
    });

    // =========================================================================
    // Wishlist_Service Routes (JWT, Buyer only)
    // =========================================================================
    const wishlist = findResource(['wishlist']);
    wishlist.addMethod('GET', wishlistIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    const wishlistItems = findResource(['wishlist', 'items']);
    wishlistItems.addMethod('POST', wishlistIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    const wishlistItemByProduct = findResource(['wishlist', 'items', '{productId}']);
    wishlistItemByProduct.addMethod('DELETE', wishlistIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    // =========================================================================
    // Cart_Service Routes (JWT, Buyer only)
    // =========================================================================
    const cart = findResource(['cart']);
    cart.addMethod('GET', cartIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });
    cart.addMethod('DELETE', cartIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    const cartItems = findResource(['cart', 'items']);
    cartItems.addMethod('PUT', cartIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    const cartItemByProduct = findResource(['cart', 'items', '{productId}']);
    cartItemByProduct.addMethod('DELETE', cartIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    // =========================================================================
    // Order_Service Routes (JWT, Buyer only)
    // =========================================================================
    const orders = findResource(['orders']);
    orders.addMethod('GET', orderIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    const ordersCheckout = findResource(['orders', 'checkout']);
    ordersCheckout.addMethod('POST', orderIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    const orderById = findResource(['orders', '{orderId}']);
    orderById.addMethod('GET', orderIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    const orderCancel = findResource(['orders', '{orderId}', 'cancel']);
    orderCancel.addMethod('POST', orderIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    const orderReturnExchange = findResource(['orders', '{orderId}', 'return-exchange']);
    orderReturnExchange.addMethod('POST', orderIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    const returnExchangeByRequestId = findResource(['orders', 'return-exchange', '{requestId}']);
    returnExchangeByRequestId.addMethod('GET', orderIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    // =========================================================================
    // Address_Service Routes (JWT, Buyer only)
    // =========================================================================
    const addresses = findResource(['addresses']);
    addresses.addMethod('GET', addressIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });
    addresses.addMethod('POST', addressIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    const addressById = findResource(['addresses', '{addressId}']);
    addressById.addMethod('PATCH', addressIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });
    addressById.addMethod('DELETE', addressIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });

    const addressDefault = findResource(['addresses', '{addressId}', 'default']);
    addressDefault.addMethod('POST', addressIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      methodResponses: [methodResponseOk],
    });
  }
}
