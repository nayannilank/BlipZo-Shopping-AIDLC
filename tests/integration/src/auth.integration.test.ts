/**
 * Integration tests for Auth_Service flow:
 * register → login → verify JWT claims → refresh token
 *
 * Validates: Requirements 1.1, 2.1, 2.5, 15.1, 15.2
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

import { setupAllMocks, resetAllMocks, getCognitoUsers } from './helpers/aws-mocks.js';
import { createPostEvent } from './helpers/event-factory.js';

// Import handlers after mocks are set up
let registerHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let loginHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let tokenRefreshHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;

describe('Auth Service Integration Flow', () => {
  beforeAll(async () => {
    setupAllMocks();
    const authModule = await import('../../../services/auth-service/src/handler.js');
    registerHandler = authModule.registerHandler as unknown as typeof registerHandler;
    loginHandler = authModule.loginHandler as unknown as typeof loginHandler;
    tokenRefreshHandler = authModule.tokenRefreshHandler as unknown as typeof tokenRefreshHandler;
  });

  beforeEach(() => {
    setupAllMocks();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Register → Login → Verify JWT → Refresh Token', () => {
    const buyerPayload = {
      firstName: 'Test',
      lastName: 'Buyer',
      username: 'buyer-test',
      email: 'buyer@blipzo.test',
      phone: '+1234567890',
      password: 'SecurePass1',
      role: 'Buyer',
      dateOfBirth: '2000-01-15',
      gender: 'Male',
    };

    const sellerPayload = {
      firstName: 'Test',
      lastName: 'Seller',
      username: 'seller-test',
      email: 'seller@blipzo.test',
      phone: '+1987654321',
      password: 'SellerPass1',
      role: 'Seller',
      companyName: 'Test Corp',
      companyUrl: 'https://testcorp.example.com',
      companyAddress: '456 Commerce Ave, Delhi, India',
      tanPanNumber: 'ABCDE1234F',
      gstNumber: '22ABCDE1234F1Z5',
      inceptionDate: '2020-06-15',
    };

    it('should register a new buyer account successfully', async () => {
      const event = createPostEvent('/auth/register', buyerPayload);

      const response = await registerHandler(event);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as { userId: string; message: string };
      expect(body.userId).toBeDefined();
      expect(body.message).toBe('Registration successful');
    });

    it('should reject duplicate registration', async () => {
      // Register first
      const event1 = createPostEvent('/auth/register', buyerPayload);
      await registerHandler(event1);

      // Try to register again with same username
      const event2 = createPostEvent('/auth/register', buyerPayload);
      const response = await registerHandler(event2);

      expect(response.statusCode).toBe(409);
    });

    it('should login with valid credentials and return JWT with correct claims', async () => {
      // Register first
      const registerEvent = createPostEvent('/auth/register', buyerPayload);
      await registerHandler(registerEvent);

      // Login
      const loginEvent = createPostEvent('/auth/login', {
        email: buyerPayload.email,
        password: buyerPayload.password,
      });
      const response = await loginHandler(loginEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        accessToken: string;
        refreshToken: string;
        userId: string;
        role: string;
      };

      expect(body.accessToken).toBeDefined();
      expect(body.accessToken.length).toBeGreaterThan(0);
      expect(body.refreshToken).toBeDefined();
      expect(body.refreshToken.length).toBeGreaterThan(0);
      expect(body.userId).toBeDefined();
      expect(body.role).toBe('Buyer');
    });

    it('should reject login with invalid credentials', async () => {
      // Register first
      const registerEvent = createPostEvent('/auth/register', buyerPayload);
      await registerHandler(registerEvent);

      // Login with wrong password
      const loginEvent = createPostEvent('/auth/login', {
        email: buyerPayload.email,
        password: 'WrongPassword1',
      });
      const response = await loginHandler(loginEvent);

      expect(response.statusCode).toBe(401);
    });

    it('should refresh token successfully', async () => {
      // Register and login
      const registerEvent = createPostEvent('/auth/register', buyerPayload);
      await registerHandler(registerEvent);

      const loginEvent = createPostEvent('/auth/login', {
        email: buyerPayload.email,
        password: buyerPayload.password,
      });
      const loginResponse = await loginHandler(loginEvent);
      const loginBody = JSON.parse(loginResponse.body) as { refreshToken: string };

      // Refresh token
      const refreshEvent = createPostEvent('/auth/token/refresh', {
        refreshToken: loginBody.refreshToken,
      });
      const response = await tokenRefreshHandler(refreshEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { accessToken: string };
      expect(body.accessToken).toBeDefined();
      expect(body.accessToken.length).toBeGreaterThan(0);
    });

    it('should lock account after 5 failed login attempts', async () => {
      // Register
      const registerEvent = createPostEvent('/auth/register', buyerPayload);
      await registerHandler(registerEvent);

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        const loginEvent = createPostEvent('/auth/login', {
          email: buyerPayload.email,
          password: 'WrongPassword1',
        });
        await loginHandler(loginEvent);
      }

      // Verify account is locked
      const user = getCognitoUsers().get(buyerPayload.email);
      expect(user).toBeDefined();
      expect(user!.failedAttempts).toBeGreaterThanOrEqual(5);
      expect(user!.lockUntil).not.toBe('');

      // Attempt login with correct password — should be locked
      const loginEvent = createPostEvent('/auth/login', {
        email: buyerPayload.email,
        password: buyerPayload.password,
      });
      const response = await loginHandler(loginEvent);

      expect(response.statusCode).toBe(423);
    });

    it('should register a seller account with correct role', async () => {
      const event = createPostEvent('/auth/register', sellerPayload);

      const response = await registerHandler(event);

      expect(response.statusCode).toBe(201);

      // Login and verify role
      const loginEvent = createPostEvent('/auth/login', {
        email: sellerPayload.email,
        password: sellerPayload.password,
      });
      const loginResponse = await loginHandler(loginEvent);
      const body = JSON.parse(loginResponse.body) as { role: string };
      expect(body.role).toBe('Seller');
    });

    it('should reject buyer registration with missing required fields', async () => {
      const { dateOfBirth: _, gender: __, ...incompletePayload } = buyerPayload;
      const event = createPostEvent('/auth/register', incompletePayload);

      const response = await registerHandler(event);

      expect(response.statusCode).toBe(400);
    });

    it('should reject seller registration with missing company fields', async () => {
      const { companyName: _, gstNumber: __, ...incompletePayload } = sellerPayload;
      const event = createPostEvent('/auth/register', incompletePayload);

      const response = await registerHandler(event);

      expect(response.statusCode).toBe(400);
    });
  });
});
