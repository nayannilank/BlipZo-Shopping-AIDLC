export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  categoryId?: string;
  subcategoryId?: string;
  dynamicAttributes?: Record<string, string | number | boolean | string[]>;
  images: ImageUpload[];
  /** @deprecated Use categoryId and subcategoryId instead */
  categories?: string[];
}

export interface ImageUpload {
  filename: string;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
}

export interface ProductRecord {
  productId: string;
  sellerId: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  categoryId?: string;
  subcategoryId?: string;
  dynamicAttributes?: Record<string, string | number | boolean | string[]>;
  schemaVersion?: number;
  imageUrls: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  sellerPolicy?: SellerPolicy;
  /** @deprecated Legacy field — retained for backward compatibility */
  categories?: string[];
}

/** Product list item returned in browsing and search responses */
export interface ProductListItem {
  productId: string;
  name: string;
  price: number;
  primaryImageUrl: string;
  averageRating: number;
  sellerName: string;
  categoryName: string;
  subcategoryName: string;
  previewAttributes: Record<string, string | number | boolean | string[]>;
}

export interface SellerPolicy {
  returnWindowDays: number;
  exchangeAllowed: boolean;
  conditions?: string;
  policyVersion: string;
  createdAt: string;
}
