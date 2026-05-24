import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

/**
 * Props for the ApiStack nested stack.
 */
export interface ApiStackProps extends cdk.NestedStackProps {
  /** Deployment stage: 'dev' | 'qa' | 'prod' */
  readonly stageName: string;

  /** The Cognito User Pool from AuthStack for JWT authorization. */
  readonly userPool: cognito.IUserPool;
}

/**
 * ApiStack — API Gateway REST API for the BlipZo Shopping Platform.
 *
 * Creates a single REST API with:
 * - CORS pre-flight options for all origins (dev-friendly)
 * - AWS X-Ray tracing enabled
 * - INFO-level access logging to CloudWatch
 * - CloudWatch metrics enabled
 * - CognitoUserPoolsAuthorizer for protected endpoints
 * - All resource paths defined per the API design table
 *
 * Methods are wired by LambdaStack using Lambda integrations.
 *
 * Implements:
 * - Req 4.1: Seller-only endpoints reject Buyer JWTs (enforced at Lambda level via claims)
 * - Req 4.2: Buyer-only endpoints reject Seller JWTs (enforced at Lambda level via claims)
 * - Req 4.3: Protected endpoints reject absent/expired/invalid JWTs via Cognito authorizer
 * - Req 17.1: All infrastructure defined using AWS CDK in TypeScript
 */
export class ApiStack extends cdk.NestedStack {
  /** The REST API for the BlipZo platform. */
  public readonly api: apigateway.RestApi;

  /** The Cognito authorizer attached to the API. */
  public readonly authorizer: apigateway.CognitoUserPoolsAuthorizer;

  public constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { stageName, userPool } = props;
    const resourceName = (suffix: string): string => `blipzo-${stageName}-${suffix}`;

    // -------------------------------------------------------------------------
    // CloudWatch Logs Role for API Gateway (account-level setting)
    // -------------------------------------------------------------------------
    const apiGatewayCloudWatchRole = new iam.Role(this, 'ApiGatewayCloudWatchRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonAPIGatewayPushToCloudWatchLogs',
        ),
      ],
    });

    const account = new apigateway.CfnAccount(this, 'ApiGatewayAccount', {
      cloudWatchRoleArn: apiGatewayCloudWatchRole.roleArn,
    });

    // -------------------------------------------------------------------------
    // Access Log Group
    // -------------------------------------------------------------------------
    const accessLogGroup = new logs.LogGroup(this, 'ApiAccessLogs', {
      logGroupName: `/aws/apigateway/blipzo-${stageName}-api-access`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: stageName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // -------------------------------------------------------------------------
    // REST API
    // -------------------------------------------------------------------------
    this.api = new apigateway.RestApi(this, 'BlipzoApi', {
      restApiName: resourceName('api'),
      description: `BlipZo Shopping Platform REST API (${stageName})`,
      cloudWatchRole: false, // We manage the account-level role ourselves above
      deployOptions: {
        stageName,
        tracingEnabled: true, // X-Ray tracing
        metricsEnabled: true, // CloudWatch metrics
        accessLogDestination: new apigateway.LogGroupLogDestination(accessLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Correlation-Id',
        ],
        allowCredentials: true,
      },
    });

    // Ensure the API Gateway account setting is created before the API deployment
    this.api.node.addDependency(account);

    // -------------------------------------------------------------------------
    // Cognito Authorizer
    // -------------------------------------------------------------------------
    this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: resourceName('cognito-authorizer'),
      identitySource: 'method.request.header.Authorization',
    });

    // =========================================================================
    // Define all resource paths (methods are wired by LambdaStack)
    // =========================================================================

    // Auth_Service Routes
    const auth = this.api.root.addResource('auth');
    const authRegister = auth.addResource('register');
    const authLogin = auth.addResource('login');
    const authOtp = auth.addResource('otp');
    const authOtpRequest = authOtp.addResource('request');
    const authOtpVerify = authOtp.addResource('verify');
    const authToken = auth.addResource('token');
    const authTokenRefresh = authToken.addResource('refresh');

    // Product_Service Routes
    const products = this.api.root.addResource('products');
    const productById = products.addResource('{productId}');
    const productPolicy = productById.addResource('policy');
    const productsSeller = products.addResource('seller');
    const productsSellerMe = productsSeller.addResource('me');

    // Catalogue_Service Routes
    const catalogue = this.api.root.addResource('catalogue');
    const catalogueCategories = catalogue.addResource('categories');
    const catalogueCategoryById = catalogueCategories.addResource('{categoryId}');
    const catalogueSearch = catalogue.addResource('search');
    const catalogueProducts = catalogue.addResource('products');
    const catalogueProductById = catalogueProducts.addResource('{productId}');

    // Wishlist_Service Routes
    const wishlist = this.api.root.addResource('wishlist');
    const wishlistItems = wishlist.addResource('items');
    const wishlistItemByProduct = wishlistItems.addResource('{productId}');

    // Cart_Service Routes
    const cart = this.api.root.addResource('cart');
    const cartItems = cart.addResource('items');
    const cartItemByProduct = cartItems.addResource('{productId}');

    // Order_Service Routes
    const orders = this.api.root.addResource('orders');
    const ordersCheckout = orders.addResource('checkout');
    const orderById = orders.addResource('{orderId}');
    const orderCancel = orderById.addResource('cancel');
    const orderReturnExchange = orderById.addResource('return-exchange');
    const ordersReturnExchange = orders.addResource('return-exchange');
    const returnExchangeByRequestId = ordersReturnExchange.addResource('{requestId}');

    // Address_Service Routes
    const addresses = this.api.root.addResource('addresses');
    const addressById = addresses.addResource('{addressId}');
    const addressDefault = addressById.addResource('default');

    // Suppress unused variable warnings — resources are referenced by LambdaStack via getResource()
    void authRegister;
    void authLogin;
    void authOtpRequest;
    void authOtpVerify;
    void authTokenRefresh;
    void productById;
    void productPolicy;
    void productsSellerMe;
    void catalogueCategories;
    void catalogueCategoryById;
    void catalogueSearch;
    void catalogueProductById;
    void wishlist;
    void wishlistItems;
    void wishlistItemByProduct;
    void cart;
    void cartItems;
    void cartItemByProduct;
    void orders;
    void ordersCheckout;
    void orderById;
    void orderCancel;
    void orderReturnExchange;
    void returnExchangeByRequestId;
    void addresses;
    void addressById;
    void addressDefault;

    // -------------------------------------------------------------------------
    // Stack Outputs
    // -------------------------------------------------------------------------
    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'REST API ID',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'REST API URL',
    });

    new cdk.CfnOutput(this, 'AuthorizerId', {
      value: this.authorizer.authorizerId,
      description: 'Cognito Authorizer ID',
    });
  }
}
