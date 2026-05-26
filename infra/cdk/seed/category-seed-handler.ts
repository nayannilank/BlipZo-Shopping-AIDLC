/**
 * CDK Custom Resource Lambda handler for seeding category nodes and
 * attribute schemas into the categories DynamoDB table.
 *
 * Runs on CloudFormation CREATE and UPDATE events during `cdk deploy`.
 * Uses PutItem with ConditionExpression: attribute_not_exists(PK) for
 * idempotency — safe to re-run on subsequent deployments without
 * overwriting existing data.
 *
 * On DELETE events, returns success without removing seed data.
 */

import {
  DynamoDBClient,
  PutItemCommand,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

import { TOP_LEVEL_CATEGORIES, SUBCATEGORIES, ATTRIBUTE_SCHEMAS } from './category-seed-data';

const dynamoClient = new DynamoDBClient({});

interface CloudFormationEvent {
  RequestType: 'Create' | 'Update' | 'Delete';
  ResourceProperties: {
    TableName: string;
    [key: string]: string;
  };
  [key: string]: unknown;
}

interface CloudFormationResponse {
  Status: 'SUCCESS' | 'FAILED';
  PhysicalResourceId: string;
  Data?: Record<string, string>;
}

/**
 * Writes a single DynamoDB item with idempotency guard.
 * Silently catches ConditionalCheckFailedException (item already exists).
 */
async function putItemIdempotent(tableName: string, item: Record<string, unknown>): Promise<void> {
  try {
    await dynamoClient.send(
      new PutItemCommand({
        TableName: tableName,
        Item: marshall(item, { removeUndefinedValues: true }),
        ConditionExpression: 'attribute_not_exists(PK)',
      }),
    );
  } catch (error: unknown) {
    if (error instanceof ConditionalCheckFailedException) {
      // Item already exists — idempotent, skip silently
      return;
    }
    throw error;
  }
}

export async function handler(event: CloudFormationEvent): Promise<CloudFormationResponse> {
  const physicalResourceId = 'category-seed-data';

  // On DELETE, return success without removing seed data
  if (event.RequestType === 'Delete') {
    return {
      Status: 'SUCCESS',
      PhysicalResourceId: physicalResourceId,
    };
  }

  const tableName = event.ResourceProperties.TableName;

  if (!tableName) {
    throw new Error('TableName resource property is required');
  }

  const now = new Date().toISOString();

  // Seed top-level categories
  for (const category of TOP_LEVEL_CATEGORIES) {
    const item = {
      PK: `CAT#${category.categoryId}`,
      SK: 'METADATA',
      categoryId: category.categoryId,
      parentId: category.parentId,
      name: category.name,
      slug: category.slug,
      level: category.level,
      isActive: category.isActive,
      icon: category.icon,
      createdAt: now,
      updatedAt: now,
      GSI1PK: 'PARENT#ROOT',
      GSI1SK: `NAME#${category.name}`,
    };
    await putItemIdempotent(tableName, item);
  }

  // Seed subcategories
  for (const subcategory of SUBCATEGORIES) {
    const item = {
      PK: `CAT#${subcategory.categoryId}`,
      SK: 'METADATA',
      categoryId: subcategory.categoryId,
      parentId: subcategory.parentId,
      name: subcategory.name,
      slug: subcategory.slug,
      level: subcategory.level,
      isActive: subcategory.isActive,
      icon: subcategory.icon,
      createdAt: now,
      updatedAt: now,
      GSI1PK: `PARENT#${subcategory.parentId}`,
      GSI1SK: `NAME#${subcategory.name}`,
    };
    await putItemIdempotent(tableName, item);
  }

  // Seed attribute schemas
  for (const schema of ATTRIBUTE_SCHEMAS) {
    const item = {
      PK: `CAT#${schema.subcategoryId}`,
      SK: `SCHEMA#v${schema.schemaVersion}`,
      subcategoryId: schema.subcategoryId,
      schemaVersion: schema.schemaVersion,
      attributes: schema.attributes,
      createdAt: now,
    };
    await putItemIdempotent(tableName, item);
  }

  return {
    Status: 'SUCCESS',
    PhysicalResourceId: physicalResourceId,
    Data: {
      CategoriesSeeded: String(TOP_LEVEL_CATEGORIES.length),
      SubcategoriesSeeded: String(SUBCATEGORIES.length),
      SchemasSeeded: String(ATTRIBUTE_SCHEMAS.length),
    },
  };
}
