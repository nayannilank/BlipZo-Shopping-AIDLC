import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { AttributeDefinition, AttributeSchemaResponse } from '@blipzo/shared';

import { createNotFoundError, createServiceUnavailableError } from './errors.js';

const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

function getCategoriesTableName(): string {
  return process.env['CATEGORIES_TABLE_NAME'] ?? '';
}

/**
 * In-memory cache for attribute schemas within a single Lambda invocation.
 * Schemas change infrequently, so caching avoids redundant DynamoDB queries
 * when the same subcategory schema is requested multiple times during
 * a single Lambda execution (e.g., validating multiple products).
 */
const schemaCache = new Map<string, AttributeSchemaResponse>();

/**
 * Retrieves the latest attribute schema version for a given subcategory.
 *
 * Queries the Categories table with PK = CAT#{subcategoryId} and
 * SK begins_with "SCHEMA#", sorted descending to get the latest version.
 * Results are cached in-memory for the duration of the Lambda invocation.
 *
 * Requirements: 2.1, 2.2, 2.8
 *
 * @param subcategoryId - The subcategory identifier to fetch the schema for
 * @returns The attribute schema response with subcategoryId, schemaVersion, and attributes
 * @throws 404 SCHEMA_NOT_FOUND if no schema exists for the subcategory
 * @throws 503 SERVICE_UNAVAILABLE on DynamoDB errors
 */
export async function getAttributeSchema(subcategoryId: string): Promise<AttributeSchemaResponse> {
  // Check in-memory cache first
  const cached = schemaCache.get(subcategoryId);
  if (cached) {
    return cached;
  }

  try {
    const command = new QueryCommand({
      TableName: getCategoriesTableName(),
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :skPrefix)',
      ExpressionAttributeNames: {
        '#pk': 'PK',
        '#sk': 'SK',
      },
      ExpressionAttributeValues: {
        ':pk': `CAT#${subcategoryId}`,
        ':skPrefix': 'SCHEMA#',
      },
      ScanIndexForward: false, // Sort descending to get latest version first
      Limit: 1,
    });

    const result = await docClient.send(command);

    const items = result.Items ?? [];

    if (items.length === 0) {
      createNotFoundError(`Attribute schema not found for subcategory '${subcategoryId}'`);
    }

    const item = items[0] as Record<string, unknown>;

    const response: AttributeSchemaResponse = {
      subcategoryId: item['subcategoryId'] as string,
      schemaVersion: item['schemaVersion'] as number,
      attributes: item['attributes'] as AttributeDefinition[],
    };

    // Store in cache for subsequent calls within this Lambda invocation
    schemaCache.set(subcategoryId, response);

    return response;
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/**
 * Clears the in-memory schema cache.
 * Primarily used for testing purposes.
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
}
