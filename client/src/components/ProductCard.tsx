import React from "react";

// Define the shape of your product
export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
  url: string;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    // 1. REMOVED bg-white, border, shadow
    // 2. ADDED padding and a border-b for separation inside a list
    <div className="group flex gap-4 p-2 border-b border-gray-100 last:border-b-0 last:pb-0">
      {/* Image: Make it a link */}
      <a
        href={product.url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0" // Prevents image from shrinking
      >
        <img
          src={product.image}
          alt={product.name}
          // Slightly larger image, rounded, subtle border
          className="w-20 h-20 rounded-md object-cover border border-gray-200"
        />
      </a>

      {/* Details Container: Takes remaining space, flex-col to structure content */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        {/* Top section: Title and Description */}
        <div>
          {/* Title: Make it a link with hover effect */}
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <h4 className="font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
              {product.name}
            </h4>
          </a>

          {/* Description: Use line-clamp for 2 lines of text */}
          <p className="text-sm text-gray-500 line-clamp-2 mt-1">
            {product.description}
          </p>
        </div>

        {/* Bottom section: Price and Button */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-xl font-bold text-gray-900">
            {/* Use toFixed(2) for consistent price formatting (e.g., $25.00) */}
            ${product.price.toFixed(2)}
          </span>

          {/* Button: Styled as a "pill" for a modern look */}
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-semibold hover:bg-blue-100 transition-colors"
          >
            View Details
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
