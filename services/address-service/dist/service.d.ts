import type { AddressRecord, AddressSchemaInput, UpdateAddressSchemaInput } from '@blipzo/shared';
/**
 * Creates a new address for the buyer.
 * PutItem with PK = BUYER#{buyerId}, SK = ADDRESS#{uuid}.
 *
 * Requirement 9.1
 */
export declare function createAddress(buyerId: string, input: AddressSchemaInput): Promise<AddressRecord>;
/**
 * Retrieves all addresses for a buyer.
 * Query by PK = BUYER#{buyerId}.
 *
 * Requirement 9.3
 */
export declare function listAddresses(buyerId: string): Promise<AddressRecord[]>;
/**
 * Updates an address owned by the buyer.
 * Asserts ownership (GetItem and check buyerId), validates supplied fields,
 * UpdateExpression for changed fields only.
 *
 * Requirements: 9.5, 9.7
 */
export declare function updateAddress(buyerId: string, addressId: string, input: UpdateAddressSchemaInput): Promise<AddressRecord>;
/**
 * Deletes an address owned by the buyer.
 * Asserts ownership, then DeleteItem.
 *
 * Requirements: 9.4, 9.7
 */
export declare function deleteAddress(buyerId: string, addressId: string): Promise<void>;
/**
 * Sets an address as the default for the buyer.
 * Uses TransactWriteItems to atomically:
 * 1. Set isDefault = true on the target address
 * 2. Set isDefault = false on the previously default address (if any)
 *
 * Requirement 9.6
 */
export declare function setDefaultAddress(buyerId: string, addressId: string): Promise<AddressRecord>;
//# sourceMappingURL=service.d.ts.map