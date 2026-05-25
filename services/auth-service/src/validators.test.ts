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

describe('validateRegisterInput', () => {
  it('should return valid RegisterRequest for valid registration with email', () => {
    const event = createEvent({
      username: 'johndoe',
      email: 'user@example.com',
      phone: '+919876543210',
      password: 'SecurePass1',
      role: 'Buyer',
    });

    const result = validateRegisterInput(event);

    expect(result).toEqual({
      username: 'johndoe',
      email: 'user@example.com',
      phone: '+919876543210',
      password: 'SecurePass1',
      role: 'Buyer',
    });
  });

  it('should return valid RegisterRequest without email (optional)', () => {
    const event = createEvent({
      username: 'seller_user',
      phone: '+919876543210',
      password: 'SecurePass1',
      role: 'Seller',
    });

    const result = validateRegisterInput(event);

    expect(result).toEqual({
      username: 'seller_user',
      email: undefined,
      phone: '+919876543210',
      password: 'SecurePass1',
      role: 'Seller',
    });
  });

  it('should throw 400 when body is null', () => {
    const event = createEvent(null);

    expect(() => validateRegisterInput(event)).toThrow();
  });

  it('should throw 400 when username is missing', () => {
    const event = createEvent({
      phone: '+919876543210',
      password: 'SecurePass1',
      role: 'Buyer',
    });

    expect(() => validateRegisterInput(event)).toThrow();
  });

  it('should throw 400 when phone is missing', () => {
    const event = createEvent({
      username: 'johndoe',
      password: 'SecurePass1',
      role: 'Buyer',
    });

    expect(() => validateRegisterInput(event)).toThrow();
  });

  it('should throw 400 for invalid password (too short)', () => {
    const event = createEvent({
      username: 'johndoe',
      phone: '+919876543210',
      password: 'Short1',
      role: 'Buyer',
    });

    expect(() => validateRegisterInput(event)).toThrow();
  });

  it('should throw 400 for invalid role', () => {
    const event = createEvent({
      username: 'johndoe',
      email: 'user@example.com',
      phone: '+919876543210',
      password: 'SecurePass1',
      role: 'Admin',
    });

    expect(() => validateRegisterInput(event)).toThrow();
  });

  it('should throw 400 for invalid email format', () => {
    const event = createEvent({
      username: 'johndoe',
      email: 'invalid-email',
      phone: '+919876543210',
      password: 'SecurePass1',
      role: 'Buyer',
    });

    expect(() => validateRegisterInput(event)).toThrow();
  });

  it('should throw 400 for invalid phone format', () => {
    const event = createEvent({
      username: 'johndoe',
      phone: '12345',
      password: 'SecurePass1',
      role: 'Buyer',
    });

    expect(() => validateRegisterInput(event)).toThrow();
  });

  it('should throw 400 for invalid username (too short)', () => {
    const event = createEvent({
      username: 'ab',
      phone: '+919876543210',
      password: 'SecurePass1',
      role: 'Buyer',
    });

    expect(() => validateRegisterInput(event)).toThrow();
  });

  it('should throw 400 for invalid username (special characters)', () => {
    const event = createEvent({
      username: 'john doe!',
      phone: '+919876543210',
      password: 'SecurePass1',
      role: 'Buyer',
    });

    expect(() => validateRegisterInput(event)).toThrow();
  });
});
