/**
 * AWS SDK mock setup for integration tests.
 * Uses aws-sdk-client-mock to intercept all AWS SDK calls and route them
 * through our in-memory DynamoMockStore.
 */
import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

import { mockStore } from './dynamo-mock-store.js';

// ─── Cognito Mock ────────────────────────────────────────────────────────────

export interface MockCognitoUser {
  username: string;
  email?: string;
  phone?: string;
  password: string;
  sub: string;
  role: 'Buyer' | 'Seller';
  failedAttempts: number;
  lockUntil: string;
}

const cognitoUsers: Map<string, MockCognitoUser> = new Map();

export function getCognitoUsers(): Map<string, MockCognitoUser> {
  return cognitoUsers;
}

export function clearCognitoUsers(): void {
  cognitoUsers.clear();
}

export const cognitoMock = mockClient(CognitoIdentityProviderClient);

function setupCognitoMocks(): void {
  cognitoMock.reset();

  // AdminCreateUser
  cognitoMock.on(AdminCreateUserCommand).callsFake((input) => {
    const username = input.Username as string;
    const attributes = input.UserAttributes ?? [];

    if (cognitoUsers.has(username)) {
      throw new UsernameExistsException({
        message: 'User already exists',
        $metadata: {},
      });
    }

    const sub = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = attributes.find((a) => a.Name === 'email')?.Value;
    const phone = attributes.find((a) => a.Name === 'phone_number')?.Value;
    const role = (attributes.find((a) => a.Name === 'custom:role')?.Value ?? 'Buyer') as
      | 'Buyer'
      | 'Seller';

    const user: MockCognitoUser = {
      username,
      email,
      phone,
      password: input.TemporaryPassword ?? '',
      sub,
      role,
      failedAttempts: 0,
      lockUntil: '',
    };

    cognitoUsers.set(username, user);

    // Also index by email and phone for lookups
    if (email && email !== username) {
      cognitoUsers.set(email, user);
    }
    if (phone && phone !== username) {
      cognitoUsers.set(phone, user);
    }

    return {
      User: {
        Username: username,
        Attributes: [
          { Name: 'sub', Value: sub },
          { Name: 'custom:role', Value: role },
          ...(email ? [{ Name: 'email', Value: email }] : []),
          ...(phone ? [{ Name: 'phone_number', Value: phone }] : []),
        ],
      },
    };
  });

  // AdminSetUserPassword
  cognitoMock.on(AdminSetUserPasswordCommand).callsFake((input) => {
    const username = input.Username as string;
    const user = cognitoUsers.get(username);
    if (user) {
      user.password = input.Password ?? '';
    }
    return {};
  });

  // AdminGetUser
  cognitoMock.on(AdminGetUserCommand).callsFake((input) => {
    const username = input.Username as string;
    const user = cognitoUsers.get(username);

    if (!user) {
      const error = new Error('User does not exist.');
      error.name = 'UserNotFoundException';
      throw error;
    }

    return {
      Username: user.username,
      UserAttributes: [
        { Name: 'sub', Value: user.sub },
        { Name: 'email', Value: user.email ?? '' },
        { Name: 'phone_number', Value: user.phone ?? '' },
        { Name: 'custom:role', Value: user.role },
        { Name: 'custom:failedAttempts', Value: String(user.failedAttempts) },
        { Name: 'custom:lockUntil', Value: user.lockUntil },
      ],
    };
  });

  // AdminInitiateAuth
  cognitoMock.on(AdminInitiateAuthCommand).callsFake((input) => {
    const authFlow = input.AuthFlow;
    const params = input.AuthParameters ?? {};

    if (authFlow === 'REFRESH_TOKEN_AUTH') {
      const refreshToken = params['REFRESH_TOKEN'];
      if (!refreshToken) {
        const error = new Error('Invalid refresh token');
        error.name = 'NotAuthorizedException';
        throw error;
      }
      return {
        AuthenticationResult: {
          AccessToken: `mock-refreshed-access-token-${Date.now()}`,
        },
      };
    }

    // USER_PASSWORD_AUTH
    const username = params['USERNAME'] ?? '';
    const password = params['PASSWORD'] ?? '';
    const user = cognitoUsers.get(username);

    if (!user || user.password !== password) {
      const error = new Error('Incorrect username or password.');
      error.name = 'NotAuthorizedException';
      throw error;
    }

    return {
      AuthenticationResult: {
        AccessToken: `mock-access-token-${user.sub}-${Date.now()}`,
        RefreshToken: `mock-refresh-token-${user.sub}-${Date.now()}`,
        IdToken: `mock-id-token-${user.sub}`,
        ExpiresIn: 3600,
      },
    };
  });

  // AdminUpdateUserAttributes
  cognitoMock.on(AdminUpdateUserAttributesCommand).callsFake((input) => {
    const username = input.Username as string;
    const user = cognitoUsers.get(username);
    if (!user) return {};

    const attributes = input.UserAttributes ?? [];
    for (const attr of attributes) {
      if (attr.Name === 'custom:failedAttempts') {
        user.failedAttempts = parseInt(attr.Value ?? '0', 10);
      }
      if (attr.Name === 'custom:lockUntil') {
        user.lockUntil = attr.Value ?? '';
      }
    }

    return {};
  });
}

// ─── DynamoDB Mock ───────────────────────────────────────────────────────────

export const dynamoMock = mockClient(DynamoDBClient);
export const docClientMock = mockClient(DynamoDBDocumentClient);

function setupDynamoMocks(): void {
  dynamoMock.reset();
  docClientMock.reset();

  // PutCommand
  docClientMock.on(PutCommand).callsFake((input) => {
    const tableName = input.TableName as string;
    const item = input.Item as Record<string, unknown>;
    mockStore.putItem(tableName, item);
    return {};
  });

  // GetCommand
  docClientMock.on(GetCommand).callsFake((input) => {
    const tableName = input.TableName as string;
    const key = input.Key as Record<string, unknown>;

    // Handle tables that don't use PK/SK pattern (e.g., categories table)
    if (!key['PK'] && !key['SK']) {
      // Search by matching all key attributes
      const items = mockStore.getAllItems(tableName);
      const item = items.find((existing) => {
        return Object.entries(key).every(([k, v]) => existing[k] === v);
      });
      return { Item: item };
    }

    const item = mockStore.getItem(tableName, key);
    return { Item: item };
  });

  // QueryCommand
  docClientMock.on(QueryCommand).callsFake((input) => {
    const tableName = input.TableName as string;
    const indexName = input.IndexName as string | undefined;
    const expressionValues = input.ExpressionAttributeValues as Record<string, unknown>;
    const expressionNames = (input.ExpressionAttributeNames ?? {}) as Record<string, string>;
    const limit = input.Limit as number | undefined;
    const scanIndexForward = input.ScanIndexForward !== false;
    const filterExpression = input.FilterExpression as string | undefined;

    // Extract PK value from expression attribute values
    let pkValue = '';
    let skPrefix: string | undefined;

    for (const [key, value] of Object.entries(expressionValues)) {
      if (key.includes('pk') || key === ':pk' || key === ':gsi1pk' || key === ':gsi2pk') {
        pkValue = value as string;
      }
      if (key.includes('Prefix') || key === ':skPrefix') {
        skPrefix = value as string;
      }
    }

    const items = mockStore.query(tableName, pkValue, skPrefix, indexName, scanIndexForward, limit);

    // Apply filter expressions
    let filteredItems = items;
    if (filterExpression) {
      filteredItems = items.filter((item) => {
        // Handle isDeleted filter
        if (filterExpression.includes('isDeleted')) {
          if (item['isDeleted'] === true) return false;
        }
        // Handle isDefault filter
        if (filterExpression.includes('isDefault')) {
          const isDefaultValue = expressionValues[':true'] ?? expressionValues[':isDefault'];
          const fieldName = expressionNames['#isDefault'] ?? 'isDefault';
          if (item[fieldName] !== isDefaultValue) return false;
        }
        // Handle searchTokens contains filter
        if (filterExpression.includes('contains')) {
          const searchQuery = (expressionValues[':query'] ??
            expressionValues[':searchQuery'] ??
            '') as string;
          const searchTokens = (item['searchTokens'] as string) ?? '';
          if (searchQuery && !searchTokens.includes(searchQuery.toLowerCase())) return false;
        }
        return true;
      });
    }

    return {
      Items: filteredItems,
      Count: filteredItems.length,
    };
  });

  // ScanCommand
  docClientMock.on(ScanCommand).callsFake((input) => {
    const tableName = input.TableName as string;
    const filterExpression = input.FilterExpression as string | undefined;
    const expressionValues = (input.ExpressionAttributeValues ?? {}) as Record<string, unknown>;
    const limit = input.Limit as number | undefined;
    let items = mockStore.getAllItems(tableName);

    // Apply filter expressions
    if (filterExpression) {
      items = items.filter((item) => {
        let passes = true;

        // Handle contains(#searchTokens, :query)
        if (filterExpression.includes('contains')) {
          const searchQuery = (expressionValues[':query'] ?? '') as string;
          const searchTokens = (item['searchTokens'] as string) ?? '';
          if (searchQuery && !searchTokens.includes(searchQuery)) {
            passes = false;
          }
        }

        // Handle #isDeleted = :isDeleted
        if (filterExpression.includes('isDeleted')) {
          const expectedIsDeleted = expressionValues[':isDeleted'];
          if (expectedIsDeleted !== undefined && item['isDeleted'] !== expectedIsDeleted) {
            passes = false;
          }
        }

        return passes;
      });
    }

    if (limit && limit > 0) {
      items = items.slice(0, limit);
    }

    return { Items: items, Count: items.length };
  });

  // DeleteCommand
  docClientMock.on(DeleteCommand).callsFake((input) => {
    const tableName = input.TableName as string;
    const key = input.Key as Record<string, unknown>;
    mockStore.deleteItem(tableName, key);
    return {};
  });

  // UpdateCommand
  docClientMock.on(UpdateCommand).callsFake((input) => {
    const tableName = input.TableName as string;
    const key = input.Key as Record<string, unknown>;
    const expressionValues = (input.ExpressionAttributeValues ?? {}) as Record<string, unknown>;
    const expressionNames = (input.ExpressionAttributeNames ?? {}) as Record<string, string>;
    const updateExpression = input.UpdateExpression as string;

    // Parse SET expressions and apply updates
    const updates: Record<string, unknown> = {};

    if (updateExpression) {
      const setMatch = updateExpression.match(/SET\s+(.+)/i);
      if (setMatch) {
        const assignments = setMatch[1]!.split(',').map((s) => s.trim());
        for (const assignment of assignments) {
          const parts = assignment.split('=').map((s) => s.trim());
          if (parts.length === 2) {
            const fieldRef = parts[0]!;
            const valueRef = parts[1]!;

            // Resolve field name
            let fieldName = fieldRef;
            if (fieldRef.startsWith('#')) {
              fieldName = expressionNames[fieldRef] ?? fieldRef;
            }

            // Handle increment expressions like "#stock = #stock - :qty"
            if (valueRef.includes('-') || valueRef.includes('+')) {
              const currentItem = mockStore.getItem(tableName, key);
              if (currentItem) {
                const currentValue = (currentItem[fieldName] as number) ?? 0;
                if (valueRef.includes('-')) {
                  const valRef = valueRef.split('-').map((s) => s.trim())[1]!;
                  const decrementValue = (expressionValues[valRef] as number) ?? 0;
                  updates[fieldName] = currentValue - decrementValue;
                } else if (valueRef.includes('+')) {
                  const valRef = valueRef.split('+').map((s) => s.trim())[1]!;
                  const incrementValue = (expressionValues[valRef] as number) ?? 0;
                  updates[fieldName] = currentValue + incrementValue;
                }
              }
            } else {
              // Simple assignment
              const value = expressionValues[valueRef] ?? valueRef;
              updates[fieldName] = value;
            }
          }
        }
      }
    }

    const updatedItem = mockStore.updateItem(tableName, key, updates);

    if (input.ReturnValues === 'ALL_NEW') {
      return { Attributes: updatedItem };
    }

    return {};
  });

  // BatchGetCommand
  docClientMock.on(BatchGetCommand).callsFake((input) => {
    const requestItems = input.RequestItems as Record<string, { Keys: Record<string, unknown>[] }>;
    const responses: Record<string, Record<string, unknown>[]> = {};

    for (const [tableName, request] of Object.entries(requestItems)) {
      responses[tableName] = mockStore.batchGetItems(tableName, request.Keys);
    }

    return { Responses: responses };
  });

  // BatchWriteCommand
  docClientMock.on(BatchWriteCommand).callsFake((input) => {
    const requestItems = input.RequestItems as Record<
      string,
      Array<{
        PutRequest?: { Item: Record<string, unknown> };
        DeleteRequest?: { Key: Record<string, unknown> };
      }>
    >;

    for (const [tableName, requests] of Object.entries(requestItems)) {
      for (const request of requests) {
        if (request.PutRequest) {
          mockStore.putItem(tableName, request.PutRequest.Item);
        }
        if (request.DeleteRequest) {
          mockStore.deleteItem(tableName, request.DeleteRequest.Key);
        }
      }
    }

    return {};
  });

  // TransactWriteCommand
  docClientMock.on(TransactWriteCommand).callsFake((input) => {
    const transactItems = input.TransactItems as Array<{
      Put?: { TableName: string; Item: Record<string, unknown> };
      Update?: {
        TableName: string;
        Key: Record<string, unknown>;
        UpdateExpression: string;
        ExpressionAttributeNames?: Record<string, string>;
        ExpressionAttributeValues?: Record<string, unknown>;
      };
      Delete?: { TableName: string; Key: Record<string, unknown> };
      ConditionCheck?: { TableName: string; Key: Record<string, unknown> };
    }>;

    for (const transactItem of transactItems) {
      if (transactItem.Put) {
        mockStore.putItem(transactItem.Put.TableName, transactItem.Put.Item);
      }
      if (transactItem.Delete) {
        mockStore.deleteItem(transactItem.Delete.TableName, transactItem.Delete.Key);
      }
      if (transactItem.Update) {
        const {
          TableName,
          Key,
          UpdateExpression,
          ExpressionAttributeNames,
          ExpressionAttributeValues,
        } = transactItem.Update;
        const updates: Record<string, unknown> = {};
        const expressionValues = ExpressionAttributeValues ?? {};
        const expressionNames = ExpressionAttributeNames ?? {};

        if (UpdateExpression) {
          const setMatch = UpdateExpression.match(/SET\s+(.+)/i);
          if (setMatch) {
            const assignments = setMatch[1]!.split(',').map((s) => s.trim());
            for (const assignment of assignments) {
              const parts = assignment.split('=').map((s) => s.trim());
              if (parts.length === 2) {
                let fieldName = parts[0]!;
                const valueRef = parts[1]!;

                if (fieldName.startsWith('#')) {
                  fieldName = expressionNames[fieldName] ?? fieldName;
                }

                if (valueRef.includes('-') || valueRef.includes('+')) {
                  const currentItem = mockStore.getItem(TableName, Key);
                  if (currentItem) {
                    const currentValue = (currentItem[fieldName] as number) ?? 0;
                    if (valueRef.includes('-')) {
                      const valRef = valueRef.split('-').map((s) => s.trim())[1]!;
                      const decrementValue = (expressionValues[valRef] as number) ?? 0;
                      updates[fieldName] = currentValue - decrementValue;
                    } else {
                      const valRef = valueRef.split('+').map((s) => s.trim())[1]!;
                      const incrementValue = (expressionValues[valRef] as number) ?? 0;
                      updates[fieldName] = currentValue + incrementValue;
                    }
                  }
                } else {
                  updates[fieldName] = expressionValues[valueRef] ?? valueRef;
                }
              }
            }
          }
        }

        mockStore.updateItem(TableName, Key, updates);
      }
    }

    return {};
  });
}

// ─── S3 Mock ─────────────────────────────────────────────────────────────────

export const s3Mock = mockClient(S3Client);

function setupS3Mocks(): void {
  s3Mock.reset();

  s3Mock.on(PutObjectCommand).resolves({});
}

// ─── Lambda Mock ─────────────────────────────────────────────────────────────

export const lambdaMock = mockClient(LambdaClient);

let paymentShouldFail = false;

export function setPaymentShouldFail(shouldFail: boolean): void {
  paymentShouldFail = shouldFail;
}

function setupLambdaMocks(): void {
  lambdaMock.reset();

  lambdaMock.on(InvokeCommand).callsFake((input) => {
    const payload = JSON.parse(new TextDecoder().decode(input.Payload)) as {
      orderId: string;
      amount: number;
      method: string;
      action?: string;
    };

    if (paymentShouldFail) {
      return {
        Payload: new TextEncoder().encode(
          JSON.stringify({
            success: false,
            error: { message: 'Payment processing failed' },
          }),
        ),
      };
    }

    const method = payload.method;
    const isRefund = payload.action === 'refund';

    if (method === 'CashOnDelivery') {
      return {
        Payload: new TextEncoder().encode(
          JSON.stringify({
            success: true,
            paymentStatus: 'Pending',
          }),
        ),
      };
    }

    return {
      Payload: new TextEncoder().encode(
        JSON.stringify({
          success: true,
          transactionId: isRefund ? `refund-txn-${Date.now()}` : `mock-txn-${Date.now()}`,
          paymentStatus: 'Paid',
        }),
      ),
    };
  });
}

// ─── S3 Presigner Mock ───────────────────────────────────────────────────────

// We need to mock the getSignedUrl function from @aws-sdk/s3-request-presigner
// This is done via vi.mock in the test files

// ─── Setup All Mocks ─────────────────────────────────────────────────────────

/**
 * Initializes all AWS SDK mocks. Call this in beforeAll/beforeEach.
 */
export function setupAllMocks(): void {
  setupCognitoMocks();
  setupDynamoMocks();
  setupS3Mocks();
  setupLambdaMocks();
}

/**
 * Resets all mock state. Call this in afterEach.
 */
export function resetAllMocks(): void {
  mockStore.clear();
  clearCognitoUsers();
  paymentShouldFail = false;
}
