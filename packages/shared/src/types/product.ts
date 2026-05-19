export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  categories: string[];
  images: ImageUpload[];
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
  categories: string[];
  imageUrls: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  sellerPolicy?: SellerPolicy;
}

export interface SellerPolicy {
  returnWindowDays: number;
  exchangeAllowed: boolean;
  conditions?: string;
  policyVersion: string;
  createdAt: string;
}
