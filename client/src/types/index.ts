export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string;
  category: string;
  inventory: number;
}

export interface GiftOptions {
  isWrapped: boolean;
  wrapColor?: "red" | "blue" | "gold" | "rustic";
  message?: string;
  recipientName?: string;
}

export interface CartItem extends Product {
  cartItemId: string;
  quantity: number;
  selectedGiftOptions?: GiftOptions;
}
