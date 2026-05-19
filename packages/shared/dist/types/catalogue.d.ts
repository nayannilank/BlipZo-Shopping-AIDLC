export interface CatalogueListRequest {
    categoryId: string;
    limit?: number;
    cursor?: string;
}
export interface CatalogueListResponse {
    items: CatalogueItem[];
    nextCursor?: string;
    total?: number;
}
export interface CatalogueItem {
    productId: string;
    name: string;
    price: number;
    primaryImageUrl: string;
    averageRating: number;
    sellerName: string;
}
export interface SearchRequest {
    query: string;
    limit?: number;
    cursor?: string;
}
//# sourceMappingURL=catalogue.d.ts.map