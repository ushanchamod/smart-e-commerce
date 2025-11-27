import { type Product } from "../../types";
import { ProductCard } from "../../components/ProductCard";
import { useQuery } from "@tanstack/react-query";
import { useAxios } from "../../service/useAxios";
import { Search } from "lucide-react";

// --- Skeleton Component ---
const ProductSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-0 overflow-hidden h-full">
    <div className="w-full aspect-4/3 bg-gray-200 animate-pulse" />
    <div className="p-5 space-y-3">
      <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
      <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
      <div className="pt-4 mt-2 border-t border-gray-50 flex justify-between items-center">
        <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="h-10 w-10 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  </div>
);

const ProductsPage = () => {
  const { fetchData } = useAxios();

  const fetchProducts = async (): Promise<Product[]> => {
    const response = await fetchData<{
      content: Product[];
    }>("/products", "GET");
    return response.content;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  if (error) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-red-500">
        <p className="font-semibold text-lg">Error loading products.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm underline text-gray-600 hover:text-black"
        >
          Try Refreshing
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Our Collection
          </h1>
          <p className="text-gray-500 mt-1">
            Browse the latest products added to our store.
          </p>
        </div>

        {/* Optional: Search Bar Visual */}
        <div className="relative w-full md:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5"
          />
        </div>
      </div>

      {/* PRODUCT GRID */}
      <div
        className="
          grid 
          grid-cols-1 
          sm:grid-cols-2 
          md:grid-cols-3 
          lg:grid-cols-4 
          gap-6 md:gap-8
        "
      >
        {isLoading
          ? // Render 8 Skeletons while loading
            Array.from({ length: 8 }).map((_, index) => (
              <ProductSkeleton key={index} />
            ))
          : data?.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>

      {/* Empty State */}
      {!isLoading && data?.length === 0 && (
        <div className="col-span-full py-20 text-center text-gray-400">
          No products found.
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
