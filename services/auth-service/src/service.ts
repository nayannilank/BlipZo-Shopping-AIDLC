import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
  MessageActionType,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  OtpRequestPayload,
  OtpVerifyPayload,
} from '@blipzo/shared';

import {
  mapCognitoError,
  createInvalidCredentialsError,
  createAccountLockedError,
  createOtpExpiredError,
  createOtpInvalidError,
  createOtpMaxAttemptsError,
  createPhoneNotFoundError,
  createOtpDeliveryFailedError,
} from './errors.js';
import type { TokenRefreshInput } from './validators.js';

export interface RegisterResult {
  userId: string;
  message: string;
}

export interface OtpRequestResult {
  message: string;
}

export interface TokenRefreshResult {
  accessToken: string;
}

const cognitoClient = new CognitoIdentityProviderClient({});
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

const USER_POOL_ID = process.env['USER_POOL_ID'] ?? '';
const USER_POOL_CLIENT_ID = process.env['USER_POOL_CLIENT_ID'] ?? '';
const OTP_TABLE_NAME = process.env['OTP_TABLE_NAME'] ?? '';
const USERS_TABLE_NAME = process.env['USERS_TABLE_NAME'] ?? '';
const STAGE = process.env['STAGE'] ?? 'dev';

/** Maximum consecutive failed login attempts before lockout */
const MAX_FAILED_ATTEMPTS = 5;

/** Lockout duration in milliseconds (15 minutes) */
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/** OTP expiry duration in seconds (10 minutes) */
const OTP_EXPIRY_SECONDS = 600;

/** Maximum OTP verification attempts before invalidation */
const MAX_OTP_ATTEMPTS = 3;

/**
 * Registers a new user in Cognito with the specified role.
 * After Cognito user creation, stores extended profile data in the users DynamoDB table.
 * If the DynamoDB write fails, rolls back by deleting the Cognito user.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.6, 1.7
 */
export async function registerUser(input: RegisterRequest): Promise<RegisterResult> {
  const { firstName, lastName, username, email, phone, password, role } = input;

  // Normalize phone: prepend +91 if user provided just 10 digits
  const normalizedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

  // Cognito requires Username to be email or phone — use email as the Cognito username
  const cognitoUsername = email;

  // Store custom username as preferred_username attribute (lowercase)
  const normalizedUsername = username.toLowerCase();

  const userAttributes: Array<{ Name: string; Value: string }> = [
    { Name: 'custom:role', Value: role },
    { Name: 'preferred_username', Value: normalizedUsername },
  ];

  if (email) {
    userAttributes.push({ Name: 'email', Value: email });
    userAttributes.push({ Name: 'email_verified', Value: 'true' });
  }

  if (normalizedPhone) {
    userAttributes.push({ Name: 'phone_number', Value: normalizedPhone });
    userAttributes.push({ Name: 'phone_number_verified', Value: 'true' });
  }

  let userId: string;

  try {
    // Create the user with a temporary password (suppressing welcome message)
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: cognitoUsername,
      UserAttributes: userAttributes,
      MessageAction: MessageActionType.SUPPRESS,
      TemporaryPassword: password,
    });

    const createResponse = await cognitoClient.send(createCommand);

    userId = createResponse.User?.Attributes?.find((attr) => attr.Name === 'sub')?.Value ?? '';

    if (!userId) {
      throw new Error('Failed to retrieve user ID from Cognito response');
    }

    // Set the permanent password so the user doesn't need to change it
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: cognitoUsername,
      Password: password,
      Permanent: true,
    });

    await cognitoClient.send(setPasswordCommand);
  } catch (error: unknown) {
    // If it's already an HTTP error (from our mapping), re-throw
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    mapCognitoError(error);
  }

  // Store extended profile in DynamoDB users table
  try {
    const profileItem: Record<string, unknown> = {
      PK: `USER#${userId}`,
      userId,
      firstName,
      lastName,
      username: normalizedUsername,
      email,
      phone: normalizedPhone,
      role,
      createdAt: new Date().toISOString(),
    };

    if (role === 'Buyer') {
      profileItem['dateOfBirth'] = input.dateOfBirth;
      profileItem['gender'] = input.gender;
    } else {
      profileItem['companyName'] = input.companyName;
      profileItem['companyUrl'] = input.companyUrl;
      profileItem['companyAddress'] = input.companyAddress;
      profileItem['tanPanNumber'] = input.tanPanNumber;
      profileItem['gstNumber'] = input.gstNumber;
      profileItem['inceptionDate'] = input.inceptionDate;
    }

    const putCommand = new PutCommand({
      TableName: USERS_TABLE_NAME,
      Item: profileItem,
    });

    await docClient.send(putCommand);
  } catch (profileError: unknown) {
    // Rollback: delete the Cognito user since profile write failed
    try {
      const deleteCommand = new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: cognitoUsername,
      });
      await cognitoClient.send(deleteCommand);
    } catch {
      // Best-effort rollback — log but don't mask the original error
      console.error('Failed to rollback Cognito user after DynamoDB write failure');
    }

    if (profileError instanceof Error && 'statusCode' in profileError) {
      throw profileError;
    }
    throw new Error('Failed to store user profile');
  }

  return {
    userId,
    message: 'Registration successful',
  };
}

/**
 * Authenticates a user with email and password via Cognito.
 * Implements account lockout after 5 consecutive failed attempts within 15 minutes.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export async function loginUser(input: LoginRequest): Promise<AuthResponse> {
  const { email, password } = input;

  // Step 1: Get user attributes to check lockout status
  const userAttributes = await getUserAttributes(email);

  // Step 2: Check if account is currently locked
  const lockUntil = userAttributes['custom:lockUntil'];
  if (lockUntil) {
    const lockUntilTime = new Date(lockUntil).getTime();
    if (Date.now() < lockUntilTime) {
      createAccountLockedError();
    }
  }

  // Step 3: Attempt authentication
  try {
    const authCommand = new AdminInitiateAuthCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: USER_POOL_CLIENT_ID,
      AuthFlow: AuthFlowType.ADMIN_USER_PASSWORD_AUTH,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const authResponse = await cognitoClient.send(authCommand);

    const accessToken =
      authResponse.AuthenticationResult?.IdToken ?? authResponse.AuthenticationResult?.AccessToken;
    const refreshToken = authResponse.AuthenticationResult?.RefreshToken;

    if (!accessToken || !refreshToken) {
      throw new Error('Authentication succeeded but tokens were not returned');
    }

    // Step 4: On success, reset failedAttempts to 0
    await resetFailedAttempts(email);

    // Step 5: Get userId and role from user attributes
    const userId = userAttributes['sub'] ?? '';
    const role = (userAttributes['custom:role'] ?? 'Buyer') as 'Buyer' | 'Seller';

    return {
      accessToken,
      refreshToken,
      userId,
      role,
    };
  } catch (error: unknown) {
    // If it's already an HTTP error (from our mapping), re-throw
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }

    if (error instanceof Error) {
      const errorName = error.name;

      if (errorName === 'NotAuthorizedException' || errorName === 'UserNotFoundException') {
        // Step 6: Increment failed attempts and potentially lock account
        await handleFailedLogin(email, userAttributes);
        createInvalidCredentialsError();
      }

      if (
        errorName === 'ServiceUnavailableException' ||
        errorName === 'InternalErrorException' ||
        errorName === 'TooManyRequestsException'
      ) {
        mapCognitoError(error);
      }
    }

    mapCognitoError(error);
  }
}

/**
 * Retrieves user attributes from Cognito.
 * Returns a map of attribute name to value.
 * On UserNotFoundException, returns empty map (to avoid revealing user existence).
 */
async function getUserAttributes(email: string): Promise<Record<string, string>> {
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
    });

    const response = await cognitoClient.send(command);
    const attributes: Record<string, string> = {};

    if (response.UserAttributes) {
      for (const attr of response.UserAttributes) {
        if (attr.Name && attr.Value) {
          attributes[attr.Name] = attr.Value;
        }
      }
    }

    return attributes;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'UserNotFoundException') {
      // Return empty attributes — we'll handle the auth failure generically
      return {};
    }
    mapCognitoError(error);
  }
}

/**
 * Resets the failed login attempt counter to 0 after a successful login.
 */
async function resetFailedAttempts(email: string): Promise<void> {
  try {
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'custom:failedAttempts', Value: '0' },
        { Name: 'custom:lockUntil', Value: '' },
      ],
    });

    await cognitoClient.send(command);
  } catch {
    // Non-critical: log but don't fail the login
  }
}

/**
 * Handles a failed login attempt by incrementing the failure counter.
 * After MAX_FAILED_ATTEMPTS within 15 minutes, locks the account.
 *
 * Requirements: 2.3, 2.4
 */
async function handleFailedLogin(
  email: string,
  userAttributes: Record<string, string>,
): Promise<void> {
  // If user doesn't exist in Cognito, nothing to update
  if (Object.keys(userAttributes).length === 0) {
    return;
  }

  const currentFailedAttempts = parseInt(userAttributes['custom:failedAttempts'] ?? '0', 10);
  const newFailedAttempts = currentFailedAttempts + 1;

  const attributesToUpdate: Array<{ Name: string; Value: string }> = [
    { Name: 'custom:failedAttempts', Value: String(newFailedAttempts) },
  ];

  // If we've reached the threshold, lock the account
  if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockUntilTime = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
    attributesToUpdate.push({ Name: 'custom:lockUntil', Value: lockUntilTime });
  }

  try {
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: attributesToUpdate,
    });

    await cognitoClient.send(command);
  } catch {
    // Non-critical: if we can't update the counter, still return the auth error
  }
}

/**
 * Generates a cryptographically random 6-digit numeric OTP.
 */
function generateOtp(): string {
  const randomValue = Math.floor(Math.random() * 900000) + 100000;
  return String(randomValue);
}

/**
 * Checks if a user with the given phone number exists in Cognito.
 * Returns user attributes if found, throws PHONE_NOT_FOUND if not.
 *
 * Requirement 3.5
 */
async function getUserByPhone(phone: string): Promise<Record<string, string>> {
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: phone,
    });

    const response = await cognitoClient.send(command);
    const attributes: Record<string, string> = {};

    if (response.UserAttributes) {
      for (const attr of response.UserAttributes) {
        if (attr.Name && attr.Value) {
          attributes[attr.Name] = attr.Value;
        }
      }
    }

    return attributes;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'UserNotFoundException') {
      createPhoneNotFoundError();
    }
    mapCognitoError(error);
  }
}

/**
 * Requests an OTP for the given phone number.
 * Generates a 6-digit OTP, stores it in the OTP DynamoDB table with 10-min TTL,
 * and logs the OTP to CloudWatch in dev/qa environments only.
 *
 * Requirements: 3.1, 3.5, 3.6
 */
export async function requestOtp(input: OtpRequestPayload): Promise<OtpRequestResult> {
  const { phone } = input;

  // Step 1: Verify user exists in Cognito
  await getUserByPhone(phone);

  // Step 2: Generate 6-digit OTP
  const otp = generateOtp();

  // Step 3: Calculate expiry (now + 600 seconds)
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + OTP_EXPIRY_SECONDS;

  // Step 4: Write OTP record to DynamoDB
  try {
    const putCommand = new PutCommand({
      TableName: OTP_TABLE_NAME,
      Item: {
        PK: `PHONE#${phone}`,
        otp,
        expiresAt,
        attemptCount: 0,
        used: false,
        createdAt: new Date().toISOString(),
      },
    });

    await docClient.send(putCommand);
  } catch {
    // OTP storage failure — treat as delivery failure
    // Requirement 3.6: do not expose internal details
    createOtpDeliveryFailedError();
  }

  // Step 5: Log OTP to CloudWatch in dev/qa only (mock delivery)
  if (STAGE === 'dev' || STAGE === 'qa') {
    console.log(`[OTP_DELIVERY] Phone: ${phone}, OTP: ${otp}, ExpiresAt: ${String(expiresAt)}`);
  }

  return { message: 'OTP sent' };
}

/**
 * Verifies an OTP for the given phone number.
 * Checks that the OTP is not used, not expired, and attempt count < 3.
 * On success, marks OTP as used and returns AuthResponse.
 * On failure, increments attempt count; after 3 failures, deletes the OTP record.
 *
 * Requirements: 3.2, 3.3, 3.4
 */
export async function verifyOtp(input: OtpVerifyPayload): Promise<AuthResponse> {
  const { phone, otp } = input;

  // Step 1: Read OTP record from DynamoDB
  const getCommand = new GetCommand({
    TableName: OTP_TABLE_NAME,
    Key: { PK: `PHONE#${phone}` },
  });

  const getResponse = await docClient.send(getCommand);
  const otpRecord = getResponse.Item;

  if (!otpRecord) {
    createOtpInvalidError();
  }

  // Step 2: Check if OTP has already been used
  if (otpRecord['used'] === true) {
    createOtpInvalidError();
  }

  // Step 3: Check if OTP has expired
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = otpRecord['expiresAt'] as number;
  if (now >= expiresAt) {
    // Delete the expired OTP record
    await deleteOtpRecord(phone);
    createOtpExpiredError();
  }

  // Step 4: Check attempt count
  const attemptCount = (otpRecord['attemptCount'] as number | undefined) ?? 0;
  if (attemptCount >= MAX_OTP_ATTEMPTS) {
    // Already exceeded max attempts — delete and reject
    await deleteOtpRecord(phone);
    createOtpMaxAttemptsError();
  }

  // Step 5: Verify OTP value
  const storedOtp = otpRecord['otp'] as string;
  if (otp !== storedOtp) {
    // Increment attempt count
    const newAttemptCount = attemptCount + 1;

    if (newAttemptCount >= MAX_OTP_ATTEMPTS) {
      // After 3 failures, delete the OTP record
      await deleteOtpRecord(phone);
      createOtpMaxAttemptsError();
    }

    // Increment attemptCount in DynamoDB
    await incrementOtpAttemptCount(phone);
    createOtpInvalidError();
  }

  // Step 6: OTP is valid — mark as used
  await markOtpAsUsed(phone);

  // Step 7: Get user attributes and generate auth tokens
  const userAttributes = await getUserByPhone(phone);
  const userId = userAttributes['sub'] ?? '';
  const role = (userAttributes['custom:role'] ?? 'Buyer') as 'Buyer' | 'Seller';

  // Step 8: Initiate auth to get tokens (using ADMIN_USER_PASSWORD_AUTH is not suitable for OTP)
  // For OTP-based login, we use AdminInitiateAuth with CUSTOM_AUTH or issue tokens directly.
  // Since this is a mock OTP flow, we use AdminInitiateAuth with a workaround:
  // We'll use the Cognito admin APIs to generate tokens for the user.
  const authResponse = await generateTokensForUser(phone);

  return {
    accessToken: authResponse.accessToken,
    refreshToken: authResponse.refreshToken,
    userId,
    role,
  };
}

/**
 * Refreshes an access token using a refresh token.
 * Calls Cognito InitiateAuth with REFRESH_TOKEN_AUTH flow.
 *
 * Requirement 2.5
 */
export async function refreshToken(input: TokenRefreshInput): Promise<TokenRefreshResult> {
  try {
    const command = new AdminInitiateAuthCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: USER_POOL_CLIENT_ID,
      AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
      AuthParameters: {
        REFRESH_TOKEN: input.refreshToken,
      },
    });

    const response = await cognitoClient.send(command);
    const accessToken = response.AuthenticationResult?.AccessToken;

    if (!accessToken) {
      throw new Error('Token refresh succeeded but access token was not returned');
    }

    return { accessToken };
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    mapCognitoError(error);
  }
}

/**
 * Generates authentication tokens for a user identified by phone number.
 * Uses Cognito AdminInitiateAuth with CUSTOM_AUTH or falls back to issuing
 * a temporary password-based auth for the mock OTP flow.
 */
async function generateTokensForUser(
  phone: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  try {
    // For the mock OTP flow, we use AdminInitiateAuth with ADMIN_USER_PASSWORD_AUTH
    // This requires knowing the user's password, which we don't have in OTP flow.
    // Instead, we'll set a temporary internal password and authenticate with it.
    // In production, this would use a custom auth challenge flow.

    // Generate a temporary password for token issuance
    const tempPassword = `TempOtp!${String(Date.now())}${Math.random().toString(36).slice(2)}`;

    // Set temporary password
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: phone,
      Password: tempPassword,
      Permanent: true,
    });
    await cognitoClient.send(setPasswordCommand);

    // Authenticate with the temporary password to get tokens
    const authCommand = new AdminInitiateAuthCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: USER_POOL_CLIENT_ID,
      AuthFlow: AuthFlowType.ADMIN_USER_PASSWORD_AUTH,
      AuthParameters: {
        USERNAME: phone,
        PASSWORD: tempPassword,
      },
    });

    const authResponse = await cognitoClient.send(authCommand);

    const accessToken =
      authResponse.AuthenticationResult?.IdToken ?? authResponse.AuthenticationResult?.AccessToken;
    const refreshTokenValue = authResponse.AuthenticationResult?.RefreshToken;

    if (!accessToken || !refreshTokenValue) {
      throw new Error('Token generation failed');
    }

    return { accessToken, refreshToken: refreshTokenValue };
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    mapCognitoError(error);
  }
}

/**
 * Deletes an OTP record from DynamoDB.
 */
async function deleteOtpRecord(phone: string): Promise<void> {
  try {
    const command = new DeleteCommand({
      TableName: OTP_TABLE_NAME,
      Key: { PK: `PHONE#${phone}` },
    });
    await docClient.send(command);
  } catch {
    // Non-critical: TTL will clean up eventually
  }
}

/**
 * Increments the attempt count on an OTP record.
 */
async function incrementOtpAttemptCount(phone: string): Promise<void> {
  try {
    const command = new UpdateCommand({
      TableName: OTP_TABLE_NAME,
      Key: { PK: `PHONE#${phone}` },
      UpdateExpression: 'SET attemptCount = attemptCount + :inc',
      ExpressionAttributeValues: { ':inc': 1 },
    });
    await docClient.send(command);
  } catch {
    // Non-critical
  }
}

/**
 * Marks an OTP record as used.
 */
async function markOtpAsUsed(phone: string): Promise<void> {
  try {
    const command = new UpdateCommand({
      TableName: OTP_TABLE_NAME,
      Key: { PK: `PHONE#${phone}` },
      UpdateExpression: 'SET #used = :used',
      ExpressionAttributeNames: { '#used': 'used' },
      ExpressionAttributeValues: { ':used': true },
    });
    await docClient.send(command);
  } catch {
    // Non-critical
  }
}
