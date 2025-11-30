import { ShoppingBag, Check, Loader2, ImageOff } from "lucide-react";
import type { Product } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "../service/useAxios";
import { useState } from "react";
import { useAuthStore } from "../store/userAuthStore";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const navigate = useNavigate();
  const { fetchData } = useAxios();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [isSuccess, setIsSuccess] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleAddToCart = async (): Promise<void> => {
    if (!user) {
      const confirmed = confirm(
        "You need to be logged in to add items to the cart. Go to login page?"
      );
      if (confirmed) {
        navigate("/auth/login");
      }
      throw new Error("User not logged in");
    }
    try {
      await fetchData(`/orders/add-to-cart/${product.id}`, "PUT", {
        quantity: 1,
      });
    } catch (error) {
      console.error("Error adding product to cart:", error);
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: handleAddToCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);
    },
    onError: (error) => {
      console.error("Error adding product to cart:", error);
    },
  });

  const imageUrl = Array.isArray(product.images)
    ? product.images[0]
    : product.images;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group flex flex-col h-full"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative w-full aspect-4/3 overflow-hidden bg-gray-50">
        {!imgError ? (
          <motion.img
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.4 }}
            src={imageUrl}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <ImageOff size={32} />
            <span className="text-xs mt-2">No Image</span>
          </div>
        )}

        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-700 shadow-sm">
          {product.category}
        </div>
      </div>

      <div className="p-5 flex flex-col grow">
        <div className="grow">
          <h3 className="font-bold text-lg text-gray-900 line-clamp-1 mb-1 group-hover:text-indigo-600 transition-colors">
            {product.name}
          </h3>
          <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">
            {product.description || ""}
          </p>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
          <span className="text-xl font-bold text-gray-900">
            {new Intl.NumberFormat("en-LK", {
              style: "currency",
              currency: "LKR",
              minimumFractionDigits: 0,
            }).format(product.price)}
          </span>

          <button
            disabled={isPending || isSuccess}
            aria-label="Add to cart"
            onClick={(e) => {
              e.stopPropagation();
              mutate();
            }}
            className={`
    h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300
    ${
      isSuccess
        ? "bg-green-500 text-white"
        : "bg-black text-white hover:bg-gray-800 active:scale-95"
    }
  `}
          >
            <AnimatePresence mode="wait">
              {isPending ? (
                <motion.div
                  key="loading"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                >
                  <Loader2 size={15} className="animate-spin" />
                </motion.div>
              ) : isSuccess ? (
                <motion.div
                  key="success"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                >
                  <Check size={15} />
                </motion.div>
              ) : (
                <motion.div
                  key="default"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                >
                  <ShoppingBag size={15} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
