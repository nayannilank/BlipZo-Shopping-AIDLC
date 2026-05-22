import { create } from 'zustand';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  primaryImageUrl: string;
  quantity: number;
  subtotal: number;
}

interface CartState {
  items: CartItem[];
  total: number;
}

interface CartActions {
  setCart: (items: CartItem[], total: number) => void;
  optimisticUpdateQuantity: (productId: string, quantity: number) => void;
  optimisticRemoveItem: (productId: string) => void;
  optimisticAddItem: (item: CartItem) => void;
  clearCart: () => void;
}

type CartStore = CartState & CartActions;

function recalculateTotal(items: CartItem[]): number {
  return Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
}

export const useCartStore = create<CartStore>()((set) => ({
  items: [],
  total: 0,

  setCart: (items, total) => {
    set({ items, total });
  },

  optimisticUpdateQuantity: (productId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        const items = state.items.filter((item) => item.productId !== productId);
        return { items, total: recalculateTotal(items) };
      }

      const items = state.items.map((item) => {
        if (item.productId === productId) {
          const subtotal = Math.round(item.price * quantity * 100) / 100;
          return { ...item, quantity, subtotal };
        }
        return item;
      });
      return { items, total: recalculateTotal(items) };
    });
  },

  optimisticRemoveItem: (productId) => {
    set((state) => {
      const items = state.items.filter((item) => item.productId !== productId);
      return { items, total: recalculateTotal(items) };
    });
  },

  optimisticAddItem: (item) => {
    set((state) => {
      const existingIndex = state.items.findIndex((i) => i.productId === item.productId);
      let items: CartItem[];
      if (existingIndex >= 0) {
        items = state.items.map((i, idx) => (idx === existingIndex ? item : i));
      } else {
        items = [...state.items, item];
      }
      return { items, total: recalculateTotal(items) };
    });
  },

  clearCart: () => {
    set({ items: [], total: 0 });
  },
}));
