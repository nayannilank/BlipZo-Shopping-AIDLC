import type { APIGatewayProxyEvent } from 'aws-lambda';
/**
 * Extracts the categoryId from the path parameters.
 * Throws 400 if not present.
 *
 * Requirement 6.4
 */
export declare function extractCategoryId(event: APIGatewayProxyEvent): string;
/**
 * Extracts the productId from the path parameters.
 * Throws 400 if not present.
 */
export declare function extractProductId(event: APIGatewayProxyEvent): string;
/**
 * Extracts pagination parameters from query string.
 * Limit is clamped to 1-20 (default 20) per Requirement 6.5.
 * Cursor is an optional base64-encoded pagination token.
 */
export declare function extractPaginationParams(event: APIGatewayProxyEvent): {
    limit: number;
    cursor?: string;
};
/**
 * Extracts and validates search query parameters.
 * Query must be 1-100 non-whitespace-only characters.
 *
 * Requirement 6.6
 */
export declare function extractSearchParams(event: APIGatewayProxyEvent): {
    query: string;
    limit: number;
    cursor?: string;
};
//# sourceMappingURL=validators.d.ts.map