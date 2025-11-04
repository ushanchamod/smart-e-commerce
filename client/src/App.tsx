import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import ProductList from "./components/ProductList";
import Cart from "./components/Cart";
import ChatUI from "./components/Chat";

export interface ProductType {
  id: number;
  name: string;
  price: number;
  image: string;
}

const App = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [cart, setCart] = useState<ProductType[]>([]);

  useEffect(() => {
    const sampleProducts = [
      {
        id: 1,
        name: "Product 1",
        price: 100,
        image: "https://picsum.photos/200/300",
      },
      {
        id: 2,
        name: "Product 2",
        price: 150,
        image: "https://picsum.photos/200/300",
      },
      {
        id: 3,
        name: "Product 3",
        price: 200,
        image: "https://picsum.photos/200/300",
      },
      {
        id: 4,
        name: "Product 4",
        price: 250,
        image: "https://picsum.photos/200/300",
      },
      {
        id: 5,
        name: "Product 5",
        price: 300,
        image: "https://picsum.photos/200/300",
      },
      {
        id: 6,
        name: "Product 6",
        price: 350,
        image: "https://picsum.photos/200/300",
      },
    ];
    setProducts(sampleProducts);
    // If fetching from backend, use axios or fetch here
  }, []);

  const addToCart = (product: ProductType) => {
    setCart([...cart, product]);
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const checkout = async () => {
    alert("Checkout successful!");
    setCart([]);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar cartCount={cart.length} />

      {/* Main content layout */}
      <main className="container mx-auto max-w-7xl p-4 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Product List Section */}
          <div className="lg:col-span-2">
            <ProductList products={products} addToCart={addToCart} />
          </div>

          {/* Cart Section (Sidebar) */}
          <aside className="lg:col-span-1">
            <div className="sticky top-8">
              <Cart
                cart={cart}
                removeFromCart={removeFromCart}
                checkout={checkout}
              />
            </div>
          </aside>
        </div>
      </main>
      <ChatUI />
    </div>
  );
};

export default App;
