import { type Product } from "../../types";
import { ProductCard } from "../../components/ProductCard";
import { useQuery } from "@tanstack/react-query";
import { useAxios } from "../../service/useAxios";

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

  console.log(data);

  if (isLoading) {
    return <div className="p-4">Loading products...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-500">Error loading products.</div>;
  }

  return (
    <div
      className="
          grid 
          grid-cols-1 
          sm:grid-cols-2 
          md:grid-cols-3 
          lg:grid-cols-4 
          gap-6 
          p-4
        "
    >
      {data?.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
};

export default ProductsPage;
