import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AWS SDK - use vi.hoisted to make mockSend available at hoist time
const { mockSend } = vi.hoisted(() => {
  return { mockSend: vi.fn() };
});

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockReturnValue({ send: mockSend }),
  },
  GetCommand: vi.fn().mockImplementation((input: unknown) => ({ input, _type: 'Get' })),
  QueryCommand: vi.fn().mockImplementation((input: unknown) => ({ input, _type: 'Query' })),
  PutCommand: vi.fn().mockImplementation((input: unknown) => ({ input, _type: 'Put' })),
  UpdateCommand: vi.fn().mockImplementation((input: unknown) => ({ input, _type: 'Update' })),
  DeleteCommand: vi.fn().mockImplementation((input: unknown) => ({ input, _type: 'Delete' })),
  TransactWriteCommand: vi
    .fn()
    .mockImplementation((input: unknown) => ({ input, _type: 'TransactWrite' })),
}));

// Set environment variables before importing service
process.env['ADDRESSES_TABLE_NAME'] = 'blipzo-dev-addresses';

import {
  createAddress,
  listAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from './service.js';

describe('createAddress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an address and return AddressRecord with 201 fields (Requirement 9.1)', async () => {
    // PutCommand succeeds
    mockSend.mockResolvedValueOnce({});

    const input = {
      fullName: 'John Doe',
      phone: '+919876543210',
      line1: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    };

    const result = await createAddress('buyer-1', input);

    expect(result.buyerId).toBe('buyer-1');
    expect(result.fullName).toBe('John Doe');
    expect(result.phone).toBe('+919876543210');
    expect(result.line1).toBe('123 Main Street');
    expect(result.city).toBe('Mumbai');
    expect(result.state).toBe('Maharashtra');
    expect(result.postalCode).toBe('400001');
    expect(result.country).toBe('India');
    expect(result.isDefault).toBe(false);
    expect(result.addressId).toBeDefined();
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it('should create an address with optional line2', async () => {
    mockSend.mockResolvedValueOnce({});

    const input = {
      fullName: 'Jane Smith',
      phone: '+14155551234',
      line1: '456 Oak Avenue',
      line2: 'Apt 7B',
      city: 'San Francisco',
      state: 'California',
      postalCode: '94102',
      country: 'US',
    };

    const result = await createAddress('buyer-2', input);

    expect(result.line2).toBe('Apt 7B');
    expect(result.buyerId).toBe('buyer-2');
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    const input = {
      fullName: 'John Doe',
      phone: '+919876543210',
      line1: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    };

    await expect(createAddress('buyer-1', input)).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});

describe('listAddresses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when no addresses exist (Requirement 9.3)', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    const result = await listAddresses('buyer-1');

    expect(result).toEqual([]);
  });

  it('should return all addresses for the buyer (Requirement 9.3)', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          PK: 'BUYER#buyer-1',
          SK: 'ADDRESS#addr-1',
          addressId: 'addr-1',
          buyerId: 'buyer-1',
          fullName: 'John Doe',
          phone: '+919876543210',
          line1: '123 Main Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
          isDefault: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          PK: 'BUYER#buyer-1',
          SK: 'ADDRESS#addr-2',
          addressId: 'addr-2',
          buyerId: 'buyer-1',
          fullName: 'John Doe',
          phone: '+919876543210',
          line1: '456 Oak Avenue',
          line2: 'Floor 3',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          country: 'India',
          isDefault: false,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ],
    });

    const result = await listAddresses('buyer-1');

    expect(result).toHaveLength(2);
    expect(result[0]?.addressId).toBe('addr-1');
    expect(result[0]?.isDefault).toBe(true);
    expect(result[1]?.addressId).toBe('addr-2');
    expect(result[1]?.line2).toBe('Floor 3');
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(listAddresses('buyer-1')).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});

describe('updateAddress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update only supplied fields (Requirement 9.5)', async () => {
    // GetCommand — address exists and is owned by buyer
    mockSend.mockResolvedValueOnce({
      Item: {
        PK: 'BUYER#buyer-1',
        SK: 'ADDRESS#addr-1',
        addressId: 'addr-1',
        buyerId: 'buyer-1',
        fullName: 'John Doe',
        phone: '+919876543210',
        line1: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
        isDefault: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    // UpdateCommand returns updated item
    mockSend.mockResolvedValueOnce({
      Attributes: {
        PK: 'BUYER#buyer-1',
        SK: 'ADDRESS#addr-1',
        addressId: 'addr-1',
        buyerId: 'buyer-1',
        fullName: 'Jane Doe',
        phone: '+919876543210',
        line1: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
        isDefault: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      },
    });

    const result = await updateAddress('buyer-1', 'addr-1', { fullName: 'Jane Doe' });

    expect(result.fullName).toBe('Jane Doe');
    expect(result.addressId).toBe('addr-1');
  });

  it('should return 404 when address does not exist (Requirement 9.7)', async () => {
    // GetCommand — address not found
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(
      updateAddress('buyer-1', 'nonexistent-addr', { fullName: 'Jane Doe' }),
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('should return 404 when address is owned by another buyer (Requirement 9.7)', async () => {
    // GetCommand — address exists but owned by different buyer
    mockSend.mockResolvedValueOnce({
      Item: {
        PK: 'BUYER#buyer-2',
        SK: 'ADDRESS#addr-1',
        addressId: 'addr-1',
        buyerId: 'buyer-2',
        fullName: 'Other User',
        phone: '+919876543210',
        line1: '789 Elm Street',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
        country: 'India',
        isDefault: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    await expect(updateAddress('buyer-1', 'addr-1', { fullName: 'Hacker' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(
      updateAddress('buyer-1', 'addr-1', { fullName: 'Jane Doe' }),
    ).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});

describe('deleteAddress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete an address owned by the buyer (Requirement 9.4)', async () => {
    // GetCommand — address exists and is owned by buyer
    mockSend.mockResolvedValueOnce({
      Item: {
        PK: 'BUYER#buyer-1',
        SK: 'ADDRESS#addr-1',
        addressId: 'addr-1',
        buyerId: 'buyer-1',
        fullName: 'John Doe',
        phone: '+919876543210',
        line1: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
        isDefault: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    // DeleteCommand succeeds
    mockSend.mockResolvedValueOnce({});

    await expect(deleteAddress('buyer-1', 'addr-1')).resolves.toBeUndefined();
  });

  it('should return 404 when address does not exist (Requirement 9.7)', async () => {
    // GetCommand — address not found
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(deleteAddress('buyer-1', 'nonexistent-addr')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('should return 404 when address is owned by another buyer (Requirement 9.7)', async () => {
    // GetCommand — address exists but owned by different buyer
    mockSend.mockResolvedValueOnce({
      Item: {
        PK: 'BUYER#buyer-2',
        SK: 'ADDRESS#addr-1',
        addressId: 'addr-1',
        buyerId: 'buyer-2',
        fullName: 'Other User',
        phone: '+919876543210',
        line1: '789 Elm Street',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
        country: 'India',
        isDefault: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    await expect(deleteAddress('buyer-1', 'addr-1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(deleteAddress('buyer-1', 'addr-1')).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});

describe('setDefaultAddress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set the target address as default and unset the previous default (Requirement 9.6)', async () => {
    // GetCommand — target address exists and is owned by buyer
    mockSend.mockResolvedValueOnce({
      Item: {
        PK: 'BUYER#buyer-1',
        SK: 'ADDRESS#addr-2',
        addressId: 'addr-2',
        buyerId: 'buyer-1',
        fullName: 'John Doe',
        phone: '+919876543210',
        line1: '456 Oak Avenue',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        country: 'India',
        isDefault: false,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    });

    // QueryCommand — find current default address
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          PK: 'BUYER#buyer-1',
          SK: 'ADDRESS#addr-1',
          addressId: 'addr-1',
          buyerId: 'buyer-1',
          isDefault: true,
        },
      ],
    });

    // TransactWriteCommand succeeds
    mockSend.mockResolvedValueOnce({});

    const result = await setDefaultAddress('buyer-1', 'addr-2');

    expect(result.addressId).toBe('addr-2');
    expect(result.isDefault).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it('should set the target address as default when no previous default exists (Requirement 9.6)', async () => {
    // GetCommand — target address exists
    mockSend.mockResolvedValueOnce({
      Item: {
        PK: 'BUYER#buyer-1',
        SK: 'ADDRESS#addr-1',
        addressId: 'addr-1',
        buyerId: 'buyer-1',
        fullName: 'John Doe',
        phone: '+919876543210',
        line1: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
        isDefault: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    // QueryCommand — no current default address
    mockSend.mockResolvedValueOnce({ Items: [] });

    // TransactWriteCommand succeeds
    mockSend.mockResolvedValueOnce({});

    const result = await setDefaultAddress('buyer-1', 'addr-1');

    expect(result.addressId).toBe('addr-1');
    expect(result.isDefault).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it('should return the address unchanged if it is already the default', async () => {
    // GetCommand — target address is already default
    mockSend.mockResolvedValueOnce({
      Item: {
        PK: 'BUYER#buyer-1',
        SK: 'ADDRESS#addr-1',
        addressId: 'addr-1',
        buyerId: 'buyer-1',
        fullName: 'John Doe',
        phone: '+919876543210',
        line1: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
        isDefault: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    const result = await setDefaultAddress('buyer-1', 'addr-1');

    expect(result.addressId).toBe('addr-1');
    expect(result.isDefault).toBe(true);
    // Should not query for current default or run transaction
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should return 404 when address does not exist (Requirement 9.7)', async () => {
    // GetCommand — address not found
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(setDefaultAddress('buyer-1', 'nonexistent-addr')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('should return 404 when address is owned by another buyer (Requirement 9.7)', async () => {
    // GetCommand — address exists but owned by different buyer (PK mismatch returns null)
    mockSend.mockResolvedValueOnce({
      Item: {
        PK: 'BUYER#buyer-2',
        SK: 'ADDRESS#addr-1',
        addressId: 'addr-1',
        buyerId: 'buyer-2',
        fullName: 'Other User',
        phone: '+919876543210',
        line1: '789 Elm Street',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
        country: 'India',
        isDefault: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    await expect(setDefaultAddress('buyer-1', 'addr-1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(setDefaultAddress('buyer-1', 'addr-1')).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});
