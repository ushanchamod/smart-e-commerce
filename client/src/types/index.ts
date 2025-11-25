// src/types/index.ts

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string;
  category: string;
  inventory: number;
}

// Specific logic for a Gift Shop
export interface GiftOptions {
  isWrapped: boolean;
  wrapColor?: "red" | "blue" | "gold" | "rustic";
  message?: string;
  recipientName?: string;
}

export interface CartItem extends Product {
  cartItemId: string; // Unique ID (Product ID + Gift Options combo)
  quantity: number;
  selectedGiftOptions?: GiftOptions;
}
