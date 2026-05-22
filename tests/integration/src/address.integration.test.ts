/**
 * Integration tests for Address_Service flow:
 * create → set default → verify single default invariant → delete
 *
 * Validates: Requirements 9.1, 9.3, 9.4, 9.6, 15.1, 15.2
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

import { setupAllMocks, resetAllMocks } from './helpers/aws-mocks.js';
import { mockStore } from './helpers/dynamo-mock-store.js';
import {
  createPostEvent,
  createGetEvent,
  createDeleteEvent,
  withAuth,
} from './helpers/event-factory.js';

let createAddressHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let listAddressesHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let deleteAddressHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let setDefaultAddressHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;

const BUYER_ID = 'buyer-address-123';

describe('Address Service Integration Flow', () => {
  beforeAll(async () => {
    setupAllMocks();
    const addressModule = await import('../../../services/address-service/src/handler.js');
    createAddressHandler =
      addressModule.createAddressHandler as unknown as typeof createAddressHandler;
    listAddressesHandler =
      addressModule.listAddressesHandler as unknown as typeof listAddressesHandler;
    deleteAddressHandler =
      addressModule.deleteAddressHandler as unknown as typeof deleteAddressHandler;
    setDefaultAddressHandler =
      addressModule.setDefaultAddressHandler as unknown as typeof setDefaultAddressHandler;
  });

  beforeEach(() => {
    setupAllMocks();
  });

  afterEach(() => {
    resetAllMocks();
  });

  const validAddress = {
    fullName: 'John Doe',
    phone: '+919876543210',
    line1: '123 Main Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'IN',
  };

  describe('Create → Set Default → Verify Single Default → Delete', () => {
    it('should create an address successfully', async () => {
      const event = withAuth(createPostEvent('/addresses', validAddress), {
        sub: BUYER_ID,
        'custom:role': 'Buyer',
      });

      const response = await createAddressHandler(event);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as {
        addressId: string;
        buyerId: string;
        fullName: string;
        phone: string;
        line1: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
        isDefault: boolean;
      };

      expect(body.addressId).toBeDefined();
      expect(body.buyerId).toBe(BUYER_ID);
      expect(body.fullName).toBe('John Doe');
      expect(body.phone).toBe('+919876543210');
      expect(body.line1).toBe('123 Main Street');
      expect(body.city).toBe('Mumbai');
      expect(body.isDefault).toBe(false);
    });

    it('should list all addresses for a buyer', async () => {
      // Create two addresses
      const event1 = withAuth(createPostEvent('/addresses', validAddress), {
        sub: BUYER_ID,
        'custom:role': 'Buyer',
      });
      await createAddressHandler(event1);

      const event2 = withAuth(
        createPostEvent('/addresses', {
          ...validAddress,
          fullName: 'Jane Doe',
          line1: '456 Oak Avenue',
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      await createAddressHandler(event2);

      // List addresses
      const listEvent = withAuth(createGetEvent('/addresses'), {
        sub: BUYER_ID,
        'custom:role': 'Buyer',
      });
      const response = await listAddressesHandler(listEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        addresses: Array<{ addressId: string; fullName: string }>;
      };
      expect(body.addresses.length).toBe(2);
    });

    it('should set an address as default', async () => {
      // Create address
      const createEvent = withAuth(createPostEvent('/addresses', validAddress), {
        sub: BUYER_ID,
        'custom:role': 'Buyer',
      });
      const createResponse = await createAddressHandler(createEvent);
      const { addressId } = JSON.parse(createResponse.body) as { addressId: string };

      // Set as default
      const defaultEvent = withAuth(
        createPostEvent(
          `/addresses/${addressId}/default`,
          {},
          {
            pathParameters: { addressId },
          },
        ),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const response = await setDefaultAddressHandler(defaultEvent);

      expect(response.statusCode).toBe(200);

      // Verify in store
      const items = mockStore.query('blipzo-test-addresses', `BUYER#${BUYER_ID}`);
      const defaultItems = items.filter((item) => item['isDefault'] === true);
      expect(defaultItems.length).toBe(1);
      expect(defaultItems[0]!['SK']).toBe(`ADDRESS#${addressId}`);
    });

    it('should enforce single default invariant (only one default per buyer)', async () => {
      // Create two addresses
      const event1 = withAuth(createPostEvent('/addresses', validAddress), {
        sub: BUYER_ID,
        'custom:role': 'Buyer',
      });
      const response1 = await createAddressHandler(event1);
      const { addressId: addr1 } = JSON.parse(response1.body) as { addressId: string };

      const event2 = withAuth(
        createPostEvent('/addresses', {
          ...validAddress,
          fullName: 'Jane Doe',
          line1: '456 Oak Avenue',
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const response2 = await createAddressHandler(event2);
      const { addressId: addr2 } = JSON.parse(response2.body) as { addressId: string };

      // Set first as default
      const default1Event = withAuth(
        createPostEvent(
          `/addresses/${addr1}/default`,
          {},
          {
            pathParameters: { addressId: addr1 },
          },
        ),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      await setDefaultAddressHandler(default1Event);

      // Set second as default
      const default2Event = withAuth(
        createPostEvent(
          `/addresses/${addr2}/default`,
          {},
          {
            pathParameters: { addressId: addr2 },
          },
        ),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      await setDefaultAddressHandler(default2Event);

      // Verify only one default exists
      const items = mockStore.query('blipzo-test-addresses', `BUYER#${BUYER_ID}`);
      const defaultItems = items.filter((item) => item['isDefault'] === true);
      expect(defaultItems.length).toBe(1);
      expect(defaultItems[0]!['SK']).toBe(`ADDRESS#${addr2}`);
    });

    it('should delete an address', async () => {
      // Create address
      const createEvent = withAuth(createPostEvent('/addresses', validAddress), {
        sub: BUYER_ID,
        'custom:role': 'Buyer',
      });
      const createResponse = await createAddressHandler(createEvent);
      const { addressId } = JSON.parse(createResponse.body) as { addressId: string };

      // Delete address
      const deleteEvent = withAuth(
        createDeleteEvent(`/addresses/${addressId}`, {
          pathParameters: { addressId },
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const response = await deleteAddressHandler(deleteEvent);

      expect(response.statusCode).toBe(200);

      // Verify deleted from store
      const item = mockStore.getItem('blipzo-test-addresses', {
        PK: `BUYER#${BUYER_ID}`,
        SK: `ADDRESS#${addressId}`,
      });
      expect(item).toBeUndefined();
    });

    it('should return 404 when deleting non-existent address', async () => {
      const deleteEvent = withAuth(
        createDeleteEvent('/addresses/non-existent-id', {
          pathParameters: { addressId: 'non-existent-id' },
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const response = await deleteAddressHandler(deleteEvent);

      expect(response.statusCode).toBe(404);
    });
  });
});
