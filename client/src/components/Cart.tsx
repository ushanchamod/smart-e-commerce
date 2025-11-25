import { type Product } from "../types";

function Cart({ closeCart }: { closeCart: () => void }) {
  const total = 0;
  const cart: Product[] = [
    {
      id: "1",
      name: "Elegant Mug",
      price: 1999,
      description: "A stylish mug for your favorite beverages.",
      images: "https://example.com/images/mug1.jpg",
      category: "gifts-for-him",
      inventory: 50,
    },
  ];

  return (
    <div className="bg-white rounded-bl-md rounded-tl-md shadow-md p-6 w-full h-full border-b border-gray-200 pb-4">
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-800 ">Your Cart</h2>

        <button className="" title="Close cart" onClick={() => closeCart()}>
          close
        </button>
      </div>

      {cart.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No items in cart.</p>
      ) : (
        <>
          {/* Cart items list */}
          <div className="space-y-4 mb-6">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={item.images}
                    alt={item.name}
                    className="w-12 h-12 rounded-md object-cover border"
                  />
                  <div>
                    <span className="font-semibold text-gray-800">
                      {item.name}
                    </span>
                    <span className="block text-sm text-gray-500">
                      LKR {item.price}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => null}
                  className="text-red-500 hover:text-red-700 font-bold text-xl px-2 rounded-full transition-colors"
                  title="Remove item"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          {/* Cart Total */}
          <hr className="my-6 border-gray-200" />
          <div className="flex justify-between items-center text-xl font-bold text-gray-800 mb-6">
            <span>Total:</span>
            <span>LKR {total.toFixed(2)}</span>
          </div>

          {/* Checkout Button */}
          <button
            onClick={() => null}
            className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors duration-200"
          >
            Checkout
          </button>
        </>
      )}
    </div>
  );
}

export default Cart;
