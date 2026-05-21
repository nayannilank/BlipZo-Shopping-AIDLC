import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { AddressRecord, AddressSchemaInput, UpdateAddressSchemaInput } from '@blipzo/shared';

import { createNotFoundError, createServiceUnavailableError } from './errors.js';

const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

function getAddressesTableName(): string {
  return process.env['ADDRESSES_TABLE_NAME'] ?? '';
}

/**
 * Generates a UUID v4 for address IDs.
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Creates a new address for the buyer.
 * PutItem with PK = BUYER#{buyerId}, SK = ADDRESS#{uuid}.
 *
 * Requirement 9.1
 */
export async function createAddress(
  buyerId: string,
  input: AddressSchemaInput,
): Promise<AddressRecord> {
  const tableName = getAddressesTableName();
  const addressId = generateId();
  const now = new Date().toISOString();

  const addressRecord: AddressRecord = {
    addressId,
    buyerId,
    fullName: input.fullName,
    phone: input.phone,
    line1: input.line1,
    ...(input.line2 !== undefined ? { line2: input.line2 } : {}),
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    country: input.country,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const putCommand = new PutCommand({
      TableName: tableName,
      Item: {
        PK: `BUYER#${buyerId}`,
        SK: `ADDRESS#${addressId}`,
        ...addressRecord,
      },
    });

    await docClient.send(putCommand);

    return addressRecord;
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/**
 * Retrieves all addresses for a buyer.
 * Query by PK = BUYER#{buyerId}.
 *
 * Requirement 9.3
 */
export async function listAddresses(buyerId: string): Promise<AddressRecord[]> {
  const tableName = getAddressesTableName();

  try {
    const queryCommand = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :skPrefix)',
      ExpressionAttributeNames: {
        '#pk': 'PK',
        '#sk': 'SK',
      },
      ExpressionAttributeValues: {
        ':pk': `BUYER#${buyerId}`,
        ':skPrefix': 'ADDRESS#',
      },
    });

    const result = await docClient.send(queryCommand);
    const items = result.Items ?? [];

    return items.map((item) => mapItemToAddressRecord(item));
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/**
 * Updates an address owned by the buyer.
 * Asserts ownership (GetItem and check buyerId), validates supplied fields,
 * UpdateExpression for changed fields only.
 *
 * Requirements: 9.5, 9.7
 */
export async function updateAddress(
  buyerId: string,
  addressId: string,
  input: UpdateAddressSchemaInput,
): Promise<AddressRecord> {
  const tableName = getAddressesTableName();

  try {
    // Step 1: Assert ownership
    const existingAddress = await getAddressItem(buyerId, addressId);

    if (!existingAddress) {
      createNotFoundError(`Address '${addressId}' not found`);
    }

    // Step 2: Build UpdateExpression for changed fields only
    const now = new Date().toISOString();
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};
    const updateExpressions: string[] = [];

    const updatableFields: Array<keyof UpdateAddressSchemaInput> = [
      'fullName',
      'phone',
      'line1',
      'line2',
      'city',
      'state',
      'postalCode',
      'country',
    ];

    for (const field of updatableFields) {
      if (input[field] !== undefined) {
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = input[field];
        updateExpressions.push(`#${field} = :${field}`);
      }
    }

    // Always update updatedAt
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;
    updateExpressions.push('#updatedAt = :updatedAt');

    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `BUYER#${buyerId}`,
        SK: `ADDRESS#${addressId}`,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(updateCommand);

    if (!result.Attributes) {
      createNotFoundError(`Address '${addressId}' not found`);
    }

    return mapItemToAddressRecord(result.Attributes);
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/**
 * Deletes an address owned by the buyer.
 * Asserts ownership, then DeleteItem.
 *
 * Requirements: 9.4, 9.7
 */
export async function deleteAddress(buyerId: string, addressId: string): Promise<void> {
  const tableName = getAddressesTableName();

  try {
    // Step 1: Assert ownership
    const existingAddress = await getAddressItem(buyerId, addressId);

    if (!existingAddress) {
      createNotFoundError(`Address '${addressId}' not found`);
    }

    // Step 2: DeleteItem
    const deleteCommand = new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: `BUYER#${buyerId}`,
        SK: `ADDRESS#${addressId}`,
      },
    });

    await docClient.send(deleteCommand);
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/**
 * Gets a specific address item and verifies ownership.
 * Returns null if not found or not owned by the buyer.
 */
async function getAddressItem(
  buyerId: string,
  addressId: string,
): Promise<Record<string, unknown> | null> {
  const tableName = getAddressesTableName();

  const getCommand = new GetCommand({
    TableName: tableName,
    Key: {
      PK: `BUYER#${buyerId}`,
      SK: `ADDRESS#${addressId}`,
    },
  });

  const result = await docClient.send(getCommand);

  if (!result.Item) {
    return null;
  }

  // Verify ownership — the PK already encodes the buyerId,
  // but double-check the stored buyerId field for safety
  if (result.Item['buyerId'] !== buyerId) {
    return null;
  }

  return result.Item;
}

/**
 * Maps a DynamoDB item to an AddressRecord.
 */
function mapItemToAddressRecord(item: Record<string, unknown>): AddressRecord {
  const line2 = item['line2'] as string | undefined;

  return {
    addressId: item['addressId'] as string,
    buyerId: item['buyerId'] as string,
    fullName: item['fullName'] as string,
    phone: item['phone'] as string,
    line1: item['line1'] as string,
    ...(line2 !== undefined ? { line2 } : {}),
    city: item['city'] as string,
    state: item['state'] as string,
    postalCode: item['postalCode'] as string,
    country: item['country'] as string,
    isDefault: item['isDefault'] === true,
    createdAt: item['createdAt'] as string,
    updatedAt: item['updatedAt'] as string,
  };
}

/**
 * Sets an address as the default for the buyer.
 * Uses TransactWriteItems to atomically:
 * 1. Set isDefault = true on the target address
 * 2. Set isDefault = false on the previously default address (if any)
 *
 * Requirement 9.6
 */
export async function setDefaultAddress(
  buyerId: string,
  addressId: string,
): Promise<AddressRecord> {
  const tableName = getAddressesTableName();

  try {
    // Step 1: Assert ownership — verify the target address exists and belongs to the buyer
    const targetAddress = await getAddressItem(buyerId, addressId);

    if (!targetAddress) {
      createNotFoundError(`Address '${addressId}' not found`);
    }

    // If the target address is already the default, return it as-is
    if (targetAddress['isDefault'] === true) {
      return mapItemToAddressRecord(targetAddress);
    }

    // Step 2: Find the currently default address (if any)
    const allAddresses = await findCurrentDefaultAddress(buyerId);
    const now = new Date().toISOString();

    // Step 3: Build TransactWriteItems for atomic update
    const transactItems: Array<{
      Update: {
        TableName: string;
        Key: Record<string, string>;
        UpdateExpression: string;
        ExpressionAttributeNames: Record<string, string>;
        ExpressionAttributeValues: Record<string, unknown>;
      };
    }> = [
      {
        // Set isDefault = true on the target address
        Update: {
          TableName: tableName,
          Key: {
            PK: `BUYER#${buyerId}`,
            SK: `ADDRESS#${addressId}`,
          },
          UpdateExpression: 'SET #isDefault = :true, #updatedAt = :now',
          ExpressionAttributeNames: {
            '#isDefault': 'isDefault',
            '#updatedAt': 'updatedAt',
          },
          ExpressionAttributeValues: {
            ':true': true,
            ':now': now,
          },
        },
      },
    ];

    // If there's a previously default address, unset it
    if (allAddresses) {
      transactItems.push({
        Update: {
          TableName: tableName,
          Key: {
            PK: `BUYER#${buyerId}`,
            SK: `ADDRESS#${allAddresses.addressId}`,
          },
          UpdateExpression: 'SET #isDefault = :false, #updatedAt = :now',
          ExpressionAttributeNames: {
            '#isDefault': 'isDefault',
            '#updatedAt': 'updatedAt',
          },
          ExpressionAttributeValues: {
            ':false': false,
            ':now': now,
          },
        },
      });
    }

    const transactCommand = new TransactWriteCommand({
      TransactItems: transactItems,
    });

    await docClient.send(transactCommand);

    // Step 4: Return the updated target address
    return mapItemToAddressRecord({
      ...targetAddress,
      isDefault: true,
      updatedAt: now,
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/**
 * Finds the currently default address for a buyer.
 * Returns the addressId of the default address, or null if none is set.
 */
async function findCurrentDefaultAddress(buyerId: string): Promise<{ addressId: string } | null> {
  const tableName = getAddressesTableName();

  const queryCommand = new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :skPrefix)',
    FilterExpression: '#isDefault = :true',
    ExpressionAttributeNames: {
      '#pk': 'PK',
      '#sk': 'SK',
      '#isDefault': 'isDefault',
    },
    ExpressionAttributeValues: {
      ':pk': `BUYER#${buyerId}`,
      ':skPrefix': 'ADDRESS#',
      ':true': true,
    },
  });

  const result = await docClient.send(queryCommand);
  const items = result.Items ?? [];

  if (items.length === 0) {
    return null;
  }

  // Return the first default address found
  const defaultItem = items[0] as Record<string, unknown> | undefined;
  const sk = defaultItem?.['SK'];
  const addressId = typeof sk === 'string' ? sk.replace('ADDRESS#', '') : '';
  return { addressId };
}
