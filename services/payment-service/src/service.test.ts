import type { PaymentRequest } from '@blipzo/shared';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DynamoDB client
const mockSend = vi.fn();
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: () => ({ send: mockSend }),
  },
  PutCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

// Set environment variable before importing service
vi.stubEnv('PAYMENTS_TABLE_NAME', 'blipzo-test-payments');

const { processPayment } = await import('./service.js');

describe('processPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  describe('UPI/CreditCard/DebitCard payments (Requirement 11.1)', () => {
    it.each(['UPI', 'CreditCard', 'DebitCard'] as const)(
      'returns success with transactionId and Paid status for %s',
      async (method) => {
        const request: PaymentRequest = {
          orderId: 'order-123',
          amount: 999.99,
          method,
        };

        const response = await processPayment(request);

        expect(response.success).toBe(true);
        expect(response.paymentStatus).toBe('Paid');
        expect(response.transactionId).toBeDefined();
        expect(response.transactionId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
      },
    );
  });

  describe('CashOnDelivery payments (Requirement 11.2)', () => {
    it('returns success with Pending status and no transactionId', async () => {
      const request: PaymentRequest = {
        orderId: 'order-456',
        amount: 500.0,
        method: 'CashOnDelivery',
      };

      const response = await processPayment(request);

      expect(response.success).toBe(true);
      expect(response.paymentStatus).toBe('Pending');
      expect(response.transactionId).toBeUndefined();
    });
  });

  describe('DynamoDB write security (Requirement 11.5)', () => {
    it('never writes mockCardLast4 to DynamoDB', async () => {
      const request: PaymentRequest = {
        orderId: 'order-789',
        amount: 100.0,
        method: 'CreditCard',
        mockPayload: {
          mockCardLast4: '4242',
        },
      };

      await processPayment(request);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const putCommandArg = mockSend.mock.calls[0]?.[0] as {
        input?: { Item?: Record<string, unknown> };
      };
      const item = putCommandArg.input?.Item;

      expect(item).toBeDefined();
      expect(item).not.toHaveProperty('mockCardLast4');
      expect(item).not.toHaveProperty('mockUpiRef');
    });

    it('never writes mockUpiRef to DynamoDB', async () => {
      const request: PaymentRequest = {
        orderId: 'order-101',
        amount: 200.0,
        method: 'UPI',
        mockPayload: {
          mockUpiRef: 'mock-upi-ref-123',
        },
      };

      await processPayment(request);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const putCommandArg = mockSend.mock.calls[0]?.[0] as {
        input?: { Item?: Record<string, unknown> };
      };
      const item = putCommandArg.input?.Item;

      expect(item).toBeDefined();
      expect(item).not.toHaveProperty('mockCardLast4');
      expect(item).not.toHaveProperty('mockUpiRef');
    });

    it('writes orderId, method, status, and transactionId to DynamoDB', async () => {
      const request: PaymentRequest = {
        orderId: 'order-write-test',
        amount: 350.0,
        method: 'DebitCard',
      };

      await processPayment(request);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const putCommandArg = mockSend.mock.calls[0]?.[0] as {
        input?: { Item?: Record<string, unknown> };
      };
      const item = putCommandArg.input?.Item;

      expect(item).toBeDefined();
      expect(item?.['orderId']).toBe('order-write-test');
      expect(item?.['method']).toBe('DebitCard');
      expect(item?.['status']).toBe('Paid');
      expect(item?.['transactionId']).toBeDefined();
      expect(item?.['amount']).toBe(350.0);
      expect(item?.['PK']).toBe('ORDER#order-write-test');
      expect(item?.['SK']).toMatch(/^PAYMENT#/);
    });
  });

  describe('Internal error handling (Requirement 11.4)', () => {
    it('throws an internal error when DynamoDB write fails', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB connection failed'));

      const request: PaymentRequest = {
        orderId: 'order-error',
        amount: 100.0,
        method: 'UPI',
      };

      await expect(processPayment(request)).rejects.toMatchObject({
        statusCode: 503,
      });
    });
  });
});
