import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, it, expect } from 'vitest';

import { validateRegisterInput } from './validators.js';

function createEvent(body: unknown): APIGatewayProxyEvent {
  return {
    body: body as APIGatewayProxyEvent['body'],
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/auth/register',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

const validBuyerPayload = {
  firstName: 'John',
  lastName: 'Doe',
  username: 'johndoe',
  email: 'user@example.com',
  phone: '+919876543210',
  password: 'SecurePass1',
  role: 'Buyer',
  dateOfBirth: '2000-01-15',
  gender: 'Male',
};

const validSellerPayload = {
  firstName: 'Jane',
  lastName: 'Smith',
  username: 'seller_user',
  email: 'seller@example.com',
  phone: '+919876543210',
  password: 'SecurePass1',
  role: 'Seller',
  companyName: 'Acme Corp',
  companyUrl: 'https://acme.example.com',
  companyAddress: '123 Business St, Mumbai, India',
  tanPanNumber: 'ABCDE1234F',
  gstNumber: '22ABCDE1234F1Z5',
  inceptionDate: '2020-06-15',
};

describe('validateRegisterInput', () => {
  describe('Buyer registration', () => {
    it('should return valid RegisterRequest for valid buyer registration', () => {
      const event = createEvent(validBuyerPayload);

      const result = validateRegisterInput(event);

      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'user@example.com',
        phone: '+919876543210',
        password: 'SecurePass1',
        role: 'Buyer',
        dateOfBirth: '2000-01-15',
        gender: 'Male',
      });
    });

    it('should throw 400 when dateOfBirth is missing for buyer', () => {
      const { dateOfBirth: _, ...payload } = validBuyerPayload;
      const event = createEvent(payload);

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 when gender is missing for buyer', () => {
      const { gender: _, ...payload } = validBuyerPayload;
      const event = createEvent(payload);

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 when buyer is under 13 years old', () => {
      const event = createEvent({
        ...validBuyerPayload,
        dateOfBirth: new Date().toISOString().split('T')[0],
      });

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 for invalid gender value', () => {
      const event = createEvent({
        ...validBuyerPayload,
        gender: 'Unknown',
      });

      expect(() => validateRegisterInput(event)).toThrow();
    });
  });

  describe('Seller registration', () => {
    it('should return valid RegisterRequest for valid seller registration', () => {
      const event = createEvent(validSellerPayload);

      const result = validateRegisterInput(event);

      expect(result).toEqual({
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'seller_user',
        email: 'seller@example.com',
        phone: '+919876543210',
        password: 'SecurePass1',
        role: 'Seller',
        companyName: 'Acme Corp',
        companyUrl: 'https://acme.example.com',
        companyAddress: '123 Business St, Mumbai, India',
        tanPanNumber: 'ABCDE1234F',
        gstNumber: '22ABCDE1234F1Z5',
        inceptionDate: '2020-06-15',
      });
    });

    it('should throw 400 when companyName is missing for seller', () => {
      const { companyName: _, ...payload } = validSellerPayload;
      const event = createEvent(payload);

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 when companyUrl does not start with https://', () => {
      const event = createEvent({
        ...validSellerPayload,
        companyUrl: 'http://acme.example.com',
      });

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 for invalid PAN format', () => {
      const event = createEvent({
        ...validSellerPayload,
        tanPanNumber: '1234567890',
      });

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 for invalid GST format', () => {
      const event = createEvent({
        ...validSellerPayload,
        gstNumber: 'INVALID_GST_NUM',
      });

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 when inception date is in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const event = createEvent({
        ...validSellerPayload,
        inceptionDate: futureDate.toISOString().split('T')[0],
      });

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 when gstNumber is missing for seller', () => {
      const { gstNumber: _, ...payload } = validSellerPayload;
      const event = createEvent(payload);

      expect(() => validateRegisterInput(event)).toThrow();
    });
  });

  describe('Common field validation', () => {
    it('should throw 400 when body is null', () => {
      const event = createEvent(null);

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 when username is missing', () => {
      const { username: _, ...payload } = validBuyerPayload;
      const event = createEvent(payload);

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 when phone is missing', () => {
      const { phone: _, ...payload } = validBuyerPayload;
      const event = createEvent(payload);

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 when email is missing', () => {
      const { email: _, ...payload } = validBuyerPayload;
      const event = createEvent(payload);

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 when firstName is missing', () => {
      const { firstName: _, ...payload } = validBuyerPayload;
      const event = createEvent(payload);

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 when lastName is missing', () => {
      const { lastName: _, ...payload } = validBuyerPayload;
      const event = createEvent(payload);

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 for invalid password (too short)', () => {
      const event = createEvent({
        ...validBuyerPayload,
        password: 'Short1',
      });

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 for invalid role', () => {
      const event = createEvent({
        ...validBuyerPayload,
        role: 'Admin',
      });

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 for invalid email format', () => {
      const event = createEvent({
        ...validBuyerPayload,
        email: 'invalid-email',
      });

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 for invalid phone format', () => {
      const event = createEvent({
        ...validBuyerPayload,
        phone: '12345',
      });

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 for invalid username (too short)', () => {
      const event = createEvent({
        ...validBuyerPayload,
        username: 'ab',
      });

      expect(() => validateRegisterInput(event)).toThrow();
    });

    it('should throw 400 for invalid username (special characters)', () => {
      const event = createEvent({
        ...validBuyerPayload,
        username: 'john doe!',
      });

      expect(() => validateRegisterInput(event)).toThrow();
    });
  });
});
