import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

/**
 * Props for the AuthStack nested stack.
 */
export interface AuthStackProps extends cdk.NestedStackProps {
  /** Deployment stage: 'dev' | 'qa' | 'prod' */
  readonly stageName: string;
}

/**
 * AuthStack — Cognito User Pool and User Pool Client for BlipZo authentication.
 *
 * Implements:
 * - Req 1.1: Registration with email, password (8+ chars, uppercase, lowercase, digit), role
 * - Req 2.1: Login returns JWT with user ID and role, expiry ≤60 min
 * - Req 3.1: Phone/OTP login with E.164 phone number
 * - Req 17.1: All infrastructure defined using AWS CDK in TypeScript
 * - Req 17.4: No hardcoded secrets
 */
export class AuthStack extends cdk.NestedStack {
  /** The Cognito User Pool for BlipZo authentication. */
  public readonly userPool: cognito.UserPool;

  /** The Cognito User Pool Client for application authentication flows. */
  public readonly userPoolClient: cognito.UserPoolClient;

  public constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const { stageName } = props;
    const resourceName = (suffix: string): string => `blipzo-${stageName}-${suffix}`;

    // -------------------------------------------------------------------------
    // Cognito User Pool
    // -------------------------------------------------------------------------
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: resourceName('user-pool'),
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        phone: true,
      },
      autoVerify: {
        email: true,
        phone: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      customAttributes: {
        role: new cognito.StringAttribute({
          mutable: true,
          minLen: 1,
          maxLen: 10,
        }),
        failedAttempts: new cognito.NumberAttribute({
          mutable: true,
          min: 0,
          max: 999,
        }),
        lockUntil: new cognito.StringAttribute({
          mutable: true,
          minLen: 0,
          maxLen: 30,
        }),
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        phoneNumber: {
          required: false,
          mutable: true,
        },
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: stageName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Enable Advanced Security Mode (ENFORCED) for threat protection
    const cfnUserPool = this.userPool.node.defaultChild as cognito.CfnUserPool;
    cfnUserPool.userPoolAddOns = {
      advancedSecurityMode: 'ENFORCED',
    };

    // -------------------------------------------------------------------------
    // Cognito User Pool Client
    // -------------------------------------------------------------------------
    this.userPoolClient = this.userPool.addClient('UserPoolClient', {
      userPoolClientName: resourceName('user-pool-client'),
      authFlows: {
        userPassword: true, // ALLOW_USER_PASSWORD_AUTH
        adminUserPassword: true, // ALLOW_ADMIN_USER_PASSWORD_AUTH (for Lambda AdminInitiateAuth)
        userSrp: false,
        custom: false,
      },
      accessTokenValidity: cdk.Duration.minutes(60),
      idTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(7),
      preventUserExistenceErrors: true,
      generateSecret: false,
    });

    // -------------------------------------------------------------------------
    // Stack Outputs
    // -------------------------------------------------------------------------
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });
  }
}
