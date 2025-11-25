import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { type Product } from "../../types";
import { useParams } from "react-router-dom";
import { useAxios } from "../../service/useAxios";
import { useQuery } from "@tanstack/react-query";

export const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();

  const { fetchData } = useAxios();

  const fetchProducts = async (): Promise<Product> => {
    const response = await fetchData<{
      content: Product;
    }>(`/products/${id}`, "GET");
    return response.content;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["product-details", id],
    queryFn: fetchProducts,
  });

  console.log(data);

  const handleAdd = () => {};

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !data) {
    return <div>Error loading product details.</div>;
  }

  const product = data;
  const imageUrl = data?.images;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* PRODUCT IMAGE */}
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gray-100 rounded-3xl overflow-hidden shadow-sm"
        >
          <motion.img
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.4 }}
            src={imageUrl}
            alt={product.name}
            className="w-full h-[450px] object-cover"
          />
        </motion.div>
      </div>

      {/* PRODUCT DETAILS */}
      <div className="flex flex-col justify-center">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold mb-3"
        >
          {product.name}
        </motion.h1>

        <p className="text-gray-600 text-sm mb-6">{product.category}</p>

        {/* PRICE */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-4xl font-extrabold text-black mb-6"
        >
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "LKR",
          }).format(product.price / 100)}
        </motion.p>

        {/* INVENTORY */}
        {product.inventory > 0 ? (
          <span className="inline-block bg-green-100 text-green-700 text-sm font-medium py-1 px-3 rounded-full mb-6">
            In Stock
          </span>
        ) : (
          <span className="inline-block bg-red-100 text-red-700 text-sm font-medium py-1 px-3 rounded-full mb-6">
            Out of Stock
          </span>
        )}

        {/* DESCRIPTION */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-gray-700 leading-relaxed mb-8"
        >
          {product.description}
        </motion.p>

        {/* BUTTONS */}
        <div className="flex gap-4">
          <button
            onClick={handleAdd}
            disabled={product.inventory === 0}
            className="flex-1 bg-black text-white flex items-center justify-center gap-2 py-3 rounded-xl text-lg hover:bg-gray-900 transition-all active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <ShoppingBag size={20} />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};
