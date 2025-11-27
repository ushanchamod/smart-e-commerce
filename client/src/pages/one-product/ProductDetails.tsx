import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  ChevronLeft,
  Plus,
  Minus,
  Check,
  Loader2,
  PackageX,
} from "lucide-react";
import { type Product } from "../../types";
import { useParams, useNavigate } from "react-router-dom";
import { useAxios } from "../../service/useAxios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

// --- Skeleton Component ---
const DetailsSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
    <div className="w-full h-[500px] bg-gray-100 rounded-3xl animate-pulse" />
    <div className="space-y-6 py-4">
      <div className="h-6 w-24 bg-gray-100 rounded-full animate-pulse" />
      <div className="h-10 w-3/4 bg-gray-100 rounded-lg animate-pulse" />
      <div className="h-8 w-32 bg-gray-100 rounded-lg animate-pulse" />
      <div className="space-y-2 pt-4">
        <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-14 w-full bg-gray-100 rounded-xl animate-pulse mt-8" />
    </div>
  </div>
);

export const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchData } = useAxios();
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- Fetch Data ---
  const fetchProduct = async (): Promise<Product> => {
    const response = await fetchData<{ content: Product }>(
      `/products/${id}`,
      "GET"
    );
    return response.content;
  };

  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["product-details", id],
    queryFn: fetchProduct,
  });

  // --- Add to Cart Logic ---
  const handleAddToCart = async () => {
    if (!product) return;
    await fetchData(`/orders/add-to-cart/${product.id}`, "PUT", {
      quantity: quantity,
    });
  };

  const { mutate, isPending } = useMutation({
    mutationFn: handleAddToCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);
    },
    onError: () => alert("Failed to add to cart"),
  });

  // --- Handlers ---
  const increment = () => {
    if (product && quantity < product.inventory) setQuantity((q) => q + 1);
  };

  const decrement = () => {
    if (quantity > 1) setQuantity((q) => q - 1);
  };

  // --- Render States ---
  if (isLoading) return <DetailsSkeleton />;

  if (error || !product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <PackageX size={64} className="text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Product Not Found</h2>
        <p className="text-gray-500 mt-2 mb-6">
          The product you are looking for does not exist or has been removed.
        </p>
        <button
          onClick={() => navigate("/")}
          className="text-indigo-600 font-medium hover:underline"
        >
          Back to Store
        </button>
      </div>
    );
  }

  const imageUrl = Array.isArray(product.images)
    ? product.images[0]
    : product.images;
  const isOutOfStock = product.inventory === 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Products
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        {/* --- LEFT: IMAGE --- */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative group"
        >
          <div className="aspect-4/3 lg:aspect-square bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 shadow-sm relative">
            <motion.img
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.7 }}
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover object-center"
            />
            {/* Overlay for OOS */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                <span className="bg-black text-white px-6 py-2 rounded-full font-bold text-lg shadow-xl transform -rotate-12">
                  SOLD OUT
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* --- RIGHT: DETAILS --- */}
        <div className="flex flex-col pt-2 lg:pt-8">
          {/* Header Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                {product.category}
              </span>
              {/* Mock Rating - Remove if real data exists */}
              {/* <div className="flex items-center gap-1 text-amber-400 text-sm font-medium">
                <Star fill="currentColor" size={14} />
                <span className="text-gray-600">4.8 (120 reviews)</span>
              </div> */}
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              {product.name}
            </h1>

            <div className="flex items-end gap-4 mb-8">
              <span className="text-3xl font-bold text-gray-900">
                {new Intl.NumberFormat("en-LK", {
                  style: "currency",
                  currency: "LKR",
                }).format(product.price)}
              </span>
              {/* Optional: Mock discount */}
              {/* <span className="text-lg text-gray-400 line-through mb-1">LKR 5,000.00</span> */}
            </div>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="prose prose-gray text-gray-600 mb-10 leading-relaxed"
          >
            <p>
              {product.description ||
                "No description available for this product."}
            </p>
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {!isOutOfStock && (
              <div className="flex items-center gap-6">
                <span className="text-sm font-semibold text-gray-900">
                  Quantity
                </span>
                <div className="flex items-center border border-gray-300 rounded-xl px-2 py-1">
                  <button
                    onClick={decrement}
                    className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition disabled:opacity-30"
                    disabled={quantity <= 1}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center font-semibold text-lg">
                    {quantity}
                  </span>
                  <button
                    onClick={increment}
                    className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition disabled:opacity-30"
                    disabled={quantity >= product.inventory}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <span className="text-xs text-gray-500">
                  {product.inventory} pieces available
                </span>
              </div>
            )}

            {/* Action Button */}
            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => mutate()}
                disabled={isOutOfStock || isPending || isSuccess}
                className={`
                    flex-1 h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300
                    ${
                      isOutOfStock
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : isSuccess
                        ? "bg-green-500 text-white shadow-green-200 shadow-lg scale-[1.02]"
                        : "bg-black text-white hover:bg-gray-800 shadow-xl shadow-gray-200 active:scale-[0.98]"
                    }
                  `}
              >
                <AnimatePresence mode="wait">
                  {isPending ? (
                    <motion.div
                      key="loader"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Loader2 className="animate-spin" />
                    </motion.div>
                  ) : isSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-2"
                    >
                      <Check size={24} /> <span>Added to Cart</span>
                    </motion.div>
                  ) : isOutOfStock ? (
                    <span>Out of Stock</span>
                  ) : (
                    <motion.div
                      key="default"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2"
                    >
                      <ShoppingBag size={20} /> <span>Add to Cart</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
