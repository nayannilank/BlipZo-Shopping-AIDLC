import { describe, it, expect } from 'vitest';

import { validatePaymentRequest } from './validators.js';

describe('validatePaymentRequest', () => {
  describe('valid requests', () => {
    it('accepts UPI payment request', () => {
      const result = validatePaymentRequest({
        orderId: 'order-123',
        amount: 100.0,
        method: 'UPI',
      });

      expect(result.orderId).toBe('order-123');
      expect(result.amount).toBe(100.0);
      expect(result.method).toBe('UPI');
    });

    it('accepts CreditCard payment request', () => {
      const result = validatePaymentRequest({
        orderId: 'order-456',
        amount: 999.99,
        method: 'CreditCard',
        mockPayload: { mockCardLast4: '4242' },
      });

      expect(result.method).toBe('CreditCard');
      expect(result.mockPayload?.mockCardLast4).toBe('4242');
    });

    it('accepts DebitCard payment request', () => {
      const result = validatePaymentRequest({
        orderId: 'order-789',
        amount: 50.0,
        method: 'DebitCard',
      });

      expect(result.method).toBe('DebitCard');
    });

    it('accepts CashOnDelivery payment request', () => {
      const result = validatePaymentRequest({
        orderId: 'order-cod',
        amount: 250.0,
        method: 'CashOnDelivery',
      });

      expect(result.method).toBe('CashOnDelivery');
    });
  });

  describe('unsupported payment method (Requirement 11.3)', () => {
    it('throws 400 VALIDATION_ERROR for unsupported method', () => {
      expect(() =>
        validatePaymentRequest({
          orderId: 'order-123',
          amount: 100.0,
          method: 'Bitcoin',
        }),
      ).toThrow();

      try {
        validatePaymentRequest({
          orderId: 'order-123',
          amount: 100.0,
          method: 'Bitcoin',
        });
      } catch (error) {
        const err = error as { statusCode: number; code: string };
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('VALIDATION_ERROR');
      }
    });

    it('throws 400 for empty method', () => {
      expect(() =>
        validatePaymentRequest({
          orderId: 'order-123',
          amount: 100.0,
          method: '',
        }),
      ).toThrow();
    });
  });

  describe('invalid input', () => {
    it('throws 400 for null payload', () => {
      expect(() => validatePaymentRequest(null)).toThrow();
    });

    it('throws 400 for missing orderId', () => {
      expect(() =>
        validatePaymentRequest({
          amount: 100.0,
          method: 'UPI',
        }),
      ).toThrow();
    });

    it('throws 400 for negative amount', () => {
      expect(() =>
        validatePaymentRequest({
          orderId: 'order-123',
          amount: -10,
          method: 'UPI',
        }),
      ).toThrow();
    });

    it('throws 400 for zero amount', () => {
      expect(() =>
        validatePaymentRequest({
          orderId: 'order-123',
          amount: 0,
          method: 'UPI',
        }),
      ).toThrow();
    });
  });
});
