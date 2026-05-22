import { create } from 'zustand';
function recalculateTotal(items) {
  return Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
}
export const useCartStore = create()((set) => ({
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
      let items;
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
