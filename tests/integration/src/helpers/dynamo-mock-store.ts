/**
 * In-memory DynamoDB mock store for integration tests.
 * Simulates DynamoDB operations (PutItem, GetItem, Query, Delete, BatchWrite, TransactWrite)
 * without requiring a real DynamoDB instance or DynamoDB Local.
 */

export interface DynamoItem {
  [key: string]: unknown;
}

export class DynamoMockStore {
  private tables: Map<string, DynamoItem[]> = new Map();

  /**
   * Ensures a table exists in the store.
   */
  ensureTable(tableName: string): void {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, []);
    }
  }

  /**
   * Puts an item into a table. Replaces existing item with same PK/SK.
   */
  putItem(tableName: string, item: DynamoItem): void {
    this.ensureTable(tableName);
    const items = this.tables.get(tableName)!;
    const pk = item['PK'] as string;
    const sk = item['SK'] as string | undefined;

    const existingIndex = items.findIndex(
      (existing) => existing['PK'] === pk && existing['SK'] === sk,
    );

    if (existingIndex >= 0) {
      items[existingIndex] = { ...item };
    } else {
      items.push({ ...item });
    }
  }

  /**
   * Gets an item by PK and optional SK.
   */
  getItem(tableName: string, key: Record<string, unknown>): DynamoItem | undefined {
    this.ensureTable(tableName);
    const items = this.tables.get(tableName)!;
    const pk = key['PK'] as string;
    const sk = key['SK'] as string | undefined;

    return items.find((item) => item['PK'] === pk && (sk === undefined || item['SK'] === sk));
  }

  /**
   * Queries items by PK and optional SK prefix (begins_with).
   */
  query(
    tableName: string,
    pk: string,
    skPrefix?: string,
    indexName?: string,
    scanIndexForward: boolean = true,
    limit?: number,
  ): DynamoItem[] {
    this.ensureTable(tableName);
    const items = this.tables.get(tableName)!;

    let pkField = 'PK';
    let skField = 'SK';

    if (indexName) {
      // Map GSI names to their PK/SK fields
      if (indexName === 'GSI1-CategoryByDate' || indexName === 'GSI1-BuyerOrders') {
        pkField = 'GSI1PK';
        skField = 'GSI1SK';
      } else if (indexName === 'GSI2-SellerProducts') {
        pkField = 'GSI2PK';
        skField = 'GSI2SK';
      }
    }

    let results = items.filter((item) => {
      if (item[pkField] !== pk) return false;
      if (skPrefix) {
        const sk = item[skField] as string | undefined;
        return sk !== undefined && sk.startsWith(skPrefix);
      }
      return true;
    });

    // Sort by SK
    results.sort((a, b) => {
      const skA = (a[skField] as string) ?? '';
      const skB = (b[skField] as string) ?? '';
      return scanIndexForward ? skA.localeCompare(skB) : skB.localeCompare(skA);
    });

    if (limit && limit > 0) {
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Deletes an item by PK and SK.
   */
  deleteItem(tableName: string, key: Record<string, unknown>): void {
    this.ensureTable(tableName);
    const items = this.tables.get(tableName)!;
    const pk = key['PK'] as string;
    const sk = key['SK'] as string | undefined;

    const index = items.findIndex(
      (item) => item['PK'] === pk && (sk === undefined || item['SK'] === sk),
    );

    if (index >= 0) {
      items.splice(index, 1);
    }
  }

  /**
   * Updates an item's attributes.
   */
  updateItem(
    tableName: string,
    key: Record<string, unknown>,
    updates: Record<string, unknown>,
  ): DynamoItem | undefined {
    this.ensureTable(tableName);
    const items = this.tables.get(tableName)!;
    const pk = key['PK'] as string;
    const sk = key['SK'] as string | undefined;

    const item = items.find(
      (existing) => existing['PK'] === pk && (sk === undefined || existing['SK'] === sk),
    );

    if (item) {
      Object.assign(item, updates);
      return { ...item };
    }

    return undefined;
  }

  /**
   * Gets all items in a table (for debugging).
   */
  getAllItems(tableName: string): DynamoItem[] {
    this.ensureTable(tableName);
    return [...(this.tables.get(tableName) ?? [])];
  }

  /**
   * Batch gets items by keys.
   */
  batchGetItems(tableName: string, keys: Record<string, unknown>[]): DynamoItem[] {
    const results: DynamoItem[] = [];
    for (const key of keys) {
      const item = this.getItem(tableName, key);
      if (item) {
        results.push(item);
      }
    }
    return results;
  }

  /**
   * Counts items matching a PK.
   */
  countByPK(tableName: string, pk: string): number {
    this.ensureTable(tableName);
    const items = this.tables.get(tableName)!;
    return items.filter((item) => item['PK'] === pk).length;
  }

  /**
   * Clears all data from all tables.
   */
  clear(): void {
    this.tables.clear();
  }

  /**
   * Clears a specific table.
   */
  clearTable(tableName: string): void {
    this.tables.set(tableName, []);
  }
}

/**
 * Singleton store instance shared across all integration tests.
 */
export const mockStore = new DynamoMockStore();
