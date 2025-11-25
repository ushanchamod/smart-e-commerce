import { ShoppingBag } from "lucide-react";
import type { Product } from "../types";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const navigate = useNavigate();

  const handleAddToCart = () => {
    if (onAddToCart) onAddToCart(product);
  };

  // Support both string or array of image URLs
  const imageUrl = Array.isArray(product.images)
    ? product.images[0]
    : product.images;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl border shadow-sm hover:shadow-xl transition-all overflow-hidden cursor-pointer group"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      {/* IMAGE */}
      <div className="relative w-full h-56 overflow-hidden bg-gray-100">
        <motion.img
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.4 }}
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
        />

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition" />
      </div>

      {/* CONTENT */}
      <div className="p-5">
        <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-black">
          {product.name}
        </h3>
        <p className="text-gray-500 text-sm mb-3 line-clamp-1">
          {product.category}
        </p>

        {/* PRICE */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-xl font-bold text-black">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "LKR",
            }).format(product.price / 100)}
          </span>
        </div>

        {/* BUTTON */}
        <button
          onClick={handleAddToCart}
          className="w-full bg-black text-white py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-900 transition-all active:scale-95"
        >
          <ShoppingBag size={18} />
          Add to Cart
        </button>
      </div>
    </motion.div>
  );
};
