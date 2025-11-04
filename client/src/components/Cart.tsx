import type { ProductType } from "../App";

interface CartProps {
  cart: ProductType[];
  removeFromCart: (id: number) => void;
  checkout: () => void;
}

function Cart({ cart, removeFromCart, checkout }: CartProps) {
  const total = cart.reduce((acc, item) => acc + item.price, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-4">
        Your Cart
      </h2>

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
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-md object-cover border"
                  />
                  <div>
                    <span className="font-semibold text-gray-800">
                      {item.name}
                    </span>
                    <span className="block text-sm text-gray-500">
                      ${item.price}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
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
            <span>${total.toFixed(2)}</span>
          </div>

          {/* Checkout Button */}
          <button
            onClick={checkout}
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
