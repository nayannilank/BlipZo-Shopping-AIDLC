import { randomUUID } from 'node:crypto';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { PaymentRequest, PaymentResponse } from '@blipzo/shared';

import { createInternalError, createServiceUnavailableError } from './errors.js';

const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

function getPaymentsTableName(): string {
  return process.env['PAYMENTS_TABLE_NAME'] ?? '';
}

/**
 * Fields that must NEVER be written to DynamoDB or logs.
 * Security constraint: Requirement 11.5
 */
const SENSITIVE_FIELDS = ['mockCardLast4', 'mockUpiRef'] as const;

/**
 * Payment methods that produce an immediate "Paid" status with a transaction ID.
 */
const INSTANT_PAYMENT_METHODS = ['UPI', 'CreditCard', 'DebitCard'] as const;

/**
 * Processes a payment request and writes a PaymentRecord to DynamoDB.
 *
 * - For UPI/CreditCard/DebitCard: returns { success: true, transactionId: uuid(), paymentStatus: 'Paid' }
 * - For CashOnDelivery: returns { success: true, paymentStatus: 'Pending' }
 *
 * Security: Never writes mockCardLast4, mockUpiRef, or any credential field to DynamoDB.
 *
 * Requirements: 11.1, 11.2, 11.4, 11.5
 */
export async function processPayment(request: PaymentRequest): Promise<PaymentResponse> {
  const { orderId, amount, method } = request;

  try {
    const isInstantPayment = (INSTANT_PAYMENT_METHODS as readonly string[]).includes(method);

    const transactionId = isInstantPayment ? randomUUID() : undefined;
    const paymentStatus: 'Paid' | 'Pending' = isInstantPayment ? 'Paid' : 'Pending';

    // Write PaymentRecord to DynamoDB — never include sensitive fields
    await writePaymentRecord({
      orderId,
      amount,
      method,
      status: paymentStatus,
      transactionId,
    });

    const response: PaymentResponse = {
      success: true,
      paymentStatus,
    };

    if (transactionId) {
      response.transactionId = transactionId;
    }

    return response;
  } catch (error) {
    // Re-throw known HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Requirement 11.4: Internal error returns standardized error response
    createInternalError();
  }
}

/**
 * Writes a PaymentRecord to the payments DynamoDB table.
 * Explicitly excludes any sensitive/credential fields.
 *
 * Requirement 11.5: Never store real card numbers, UPI IDs, or sensitive financial credentials.
 */
interface PaymentRecordInput {
  orderId: string;
  amount: number;
  method: string;
  status: 'Paid' | 'Pending';
  transactionId?: string | undefined;
}

async function writePaymentRecord(record: PaymentRecordInput): Promise<void> {
  const tableName = getPaymentsTableName();
  const now = new Date().toISOString();
  const paymentId = randomUUID();

  // Build the item — explicitly only include safe fields
  const item: Record<string, unknown> = {
    PK: `ORDER#${record.orderId}`,
    SK: `PAYMENT#${paymentId}`,
    orderId: record.orderId,
    paymentId,
    amount: record.amount,
    method: record.method,
    status: record.status,
    createdAt: now,
  };

  // Only include transactionId if present (not for CoD)
  if (record.transactionId) {
    item['transactionId'] = record.transactionId;
  }

  // Security assertion: ensure no sensitive fields are present
  for (const field of SENSITIVE_FIELDS) {
    if (field in item) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete item[field];
    }
  }

  try {
    const putCommand = new PutCommand({
      TableName: tableName,
      Item: item,
    });

    await docClient.send(putCommand);
  } catch {
    createServiceUnavailableError();
  }
}
