import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { CategoryNode, CategoryTreeResponse, SubcategoryListResponse } from '@blipzo/shared';

import { createServiceUnavailableError } from './errors.js';

const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

function getCategoriesTableName(): string {
  return process.env['CATEGORIES_TABLE_NAME'] ?? '';
}

/**
 * Maps a DynamoDB item from the categories table to a CategoryNode.
 */
function mapItemToCategoryNode(item: Record<string, unknown>): CategoryNode {
  const node: CategoryNode = {
    categoryId: item['categoryId'] as string,
    parentId: (item['parentId'] as string | null) ?? null,
    name: item['name'] as string,
    slug: item['slug'] as string,
    level: item['level'] as 1 | 2,
    isActive: item['isActive'] as boolean,
    createdAt: item['createdAt'] as string,
    updatedAt: item['updatedAt'] as string,
  };

  if (item['icon']) {
    node.icon = item['icon'] as string;
  }

  return node;
}

/**
 * Lists all active top-level categories by querying the ParentIndex GSI
 * where GSI1PK = PARENT#ROOT. Results are sorted alphabetically by name
 * (GSI1SK = NAME#{name}).
 *
 * Only returns nodes where isActive = true.
 *
 * Requirements: 1.2, 5.1
 */
export async function listCategories(): Promise<CategoryTreeResponse> {
  try {
    const command = new QueryCommand({
      TableName: getCategoriesTableName(),
      IndexName: 'ParentIndex',
      KeyConditionExpression: '#gsi1pk = :gsi1pk',
      FilterExpression: '#isActive = :isActive',
      ExpressionAttributeNames: {
        '#gsi1pk': 'GSI1PK',
        '#isActive': 'isActive',
      },
      ExpressionAttributeValues: {
        ':gsi1pk': 'PARENT#ROOT',
        ':isActive': true,
      },
    });

    const result = await docClient.send(command);

    const categories: CategoryNode[] = (result.Items ?? []).map((item) =>
      mapItemToCategoryNode(item as Record<string, unknown>),
    );

    return { categories };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/**
 * Lists all active subcategories under a given category by querying the
 * ParentIndex GSI where GSI1PK = PARENT#{categoryId}. Results are sorted
 * alphabetically by name (GSI1SK = NAME#{name}).
 *
 * Only returns nodes where isActive = true.
 *
 * Requirements: 1.3, 5.2
 */
export async function listSubcategories(categoryId: string): Promise<SubcategoryListResponse> {
  try {
    const command = new QueryCommand({
      TableName: getCategoriesTableName(),
      IndexName: 'ParentIndex',
      KeyConditionExpression: '#gsi1pk = :gsi1pk',
      FilterExpression: '#isActive = :isActive',
      ExpressionAttributeNames: {
        '#gsi1pk': 'GSI1PK',
        '#isActive': 'isActive',
      },
      ExpressionAttributeValues: {
        ':gsi1pk': `PARENT#${categoryId}`,
        ':isActive': true,
      },
    });

    const result = await docClient.send(command);

    const subcategories: CategoryNode[] = (result.Items ?? []).map((item) =>
      mapItemToCategoryNode(item as Record<string, unknown>),
    );

    return { subcategories };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}
