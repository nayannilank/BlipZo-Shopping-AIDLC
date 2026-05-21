import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, } from '@aws-sdk/lib-dynamodb';
import { createNotFoundError, createServiceUnavailableError } from './errors.js';
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);
function getAddressesTableName() {
    return process.env['ADDRESSES_TABLE_NAME'] ?? '';
}
/**
 * Generates a UUID v4 for address IDs.
 */
function generateId() {
    return crypto.randomUUID();
}
/**
 * Creates a new address for the buyer.
 * PutItem with PK = BUYER#{buyerId}, SK = ADDRESS#{uuid}.
 *
 * Requirement 9.1
 */
export async function createAddress(buyerId, input) {
    const tableName = getAddressesTableName();
    const addressId = generateId();
    const now = new Date().toISOString();
    const addressRecord = {
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
    }
    catch (error) {
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
export async function listAddresses(buyerId) {
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
    }
    catch (error) {
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
export async function updateAddress(buyerId, addressId, input) {
    const tableName = getAddressesTableName();
    try {
        // Step 1: Assert ownership
        const existingAddress = await getAddressItem(buyerId, addressId);
        if (!existingAddress) {
            createNotFoundError(`Address '${addressId}' not found`);
        }
        // Step 2: Build UpdateExpression for changed fields only
        const now = new Date().toISOString();
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        const updateExpressions = [];
        const updatableFields = [
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
    }
    catch (error) {
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
export async function deleteAddress(buyerId, addressId) {
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
    }
    catch (error) {
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
async function getAddressItem(buyerId, addressId) {
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
function mapItemToAddressRecord(item) {
    const line2 = item['line2'];
    return {
        addressId: item['addressId'],
        buyerId: item['buyerId'],
        fullName: item['fullName'],
        phone: item['phone'],
        line1: item['line1'],
        ...(line2 !== undefined ? { line2 } : {}),
        city: item['city'],
        state: item['state'],
        postalCode: item['postalCode'],
        country: item['country'],
        isDefault: item['isDefault'] ?? false,
        createdAt: item['createdAt'],
        updatedAt: item['updatedAt'],
    };
}
//# sourceMappingURL=service.js.map