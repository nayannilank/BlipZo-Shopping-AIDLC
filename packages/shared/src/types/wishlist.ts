export interface WishlistItem {
  productId: string;
  addedAt: string;
}

export interface WishlistResponse {
  buyerId: string;
  items: WishlistItemEnriched[];
  count: number;
}

export interface WishlistItemEnriched {
  productId: string;
  name: string;
  price: number;
  primaryImageUrl: string;
  isAvailable: boolean;
  addedAt: string;
}
