export interface CartItem {
    productId: string;
    quantity: number;
}
export interface CartResponse {
    buyerId: string;
    items: CartItemEnriched[];
    total: number;
}
export interface CartItemEnriched {
    productId: string;
    name: string;
    price: number;
    primaryImageUrl: string;
    quantity: number;
    subtotal: number;
}
//# sourceMappingURL=cart.d.ts.map