import type { ProductType } from "../App";

interface ProductListProps {
  products: ProductType[];
  addToCart: (product: ProductType) => void;
}

function ProductList({ products, addToCart }: ProductListProps) {
  return (
    // Responsive grid: 1 col, then 2, then 3
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {products.map((p) => (
        <div
          key={p.id}
          className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col transition-transform duration-200 hover:scale-105"
        >
          <img
            src={p.image}
            alt={p.name}
            className="w-full h-48 object-cover"
          />

          {/* flex-grow pushes the button to the bottom */}
          <div className="p-4 grow">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {p.name}
            </h3>
            <p className="text-lg font-bold text-blue-600">${p.price}</p>
          </div>

          <button
            onClick={() => addToCart(p)}
            className="bg-blue-600 text-white font-semibold py-3 px-4 w-full hover:bg-blue-700 transition-colors duration-200"
          >
            Add to Cart
          </button>
        </div>
      ))}
    </div>
  );
}

export default ProductList;
