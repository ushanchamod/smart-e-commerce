// src/store/cartStore.ts
import { create } from "zustand";
import type { CartItem, GiftOptions, Product } from "../types";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  // Actions
  addItem: (product: Product, giftOptions?: GiftOptions) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  toggleCart: () => void;
  getCartTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,

  addItem: (product, giftOptions) => {
    set((state) => {
      // Create a unique ID based on product AND gift configuration
      // This prevents merging a "Wrapped" mug with an "Unwrapped" mug
      const uniqueId = `${product.id}-${JSON.stringify(giftOptions || {})}`;

      const existingItem = state.items.find((i) => i.cartItemId === uniqueId);

      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.cartItemId === uniqueId ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            ...product,
            cartItemId: uniqueId,
            quantity: 1,
            selectedGiftOptions: giftOptions,
          },
        ],
      };
    });
  },

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.cartItemId !== id) })),

  updateQuantity: (id, delta) =>
    set((state) => ({
      items: state.items
        .map((item) => {
          if (item.cartItemId === id) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((i) => i.quantity > 0), // Remove if 0
    })),

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

  getCartTotal: () => {
    const { items } = get();
    return items.reduce((total, item) => {
      let itemPrice = item.price;
      // Add $5.00 (500 cents) if wrapped
      if (item.selectedGiftOptions?.isWrapped) {
        itemPrice += 500;
      }
      return total + itemPrice * item.quantity;
    }, 0);
  },
}));
