import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Product } from "../types";
import { useAxios } from "../service/useAxios";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  X,
  ShoppingBag,
  ArrowRight,
  Loader2,
  PackageOpen,
} from "lucide-react";

export interface CartItemProps extends Product {
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(amount);
};

function Cart({ closeCart }: { closeCart: () => void }) {
  const { fetchData } = useAxios();
  const navigate = useNavigate();

  const { data, isPending } = useQuery({
    queryKey: ["cart"],
    queryFn: GetData,
  });

  async function GetData() {
    const response = (await fetchData("/orders/my-cart", "GET")) as {
      content: CartItemProps[];
    };
    return response.content;
  }

  const totalAmount =
    data?.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0) || 0;

  const goToOrderCreate = () => {
    closeCart();
    navigate("/confirm-orders");
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-2xl w-full max-w-md ml-auto border-l border-gray-100 z-51">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <ShoppingBag className="text-indigo-600" size={20} />
          <h2 className="text-lg font-bold text-gray-800">
            Your Cart{" "}
            <span className="text-gray-400 font-normal">
              ({data?.length || 0})
            </span>
          </h2>
        </div>
        <button
          onClick={closeCart}
          className="text-gray-400 hover:text-gray-800 hover:bg-gray-100 p-2 rounded-full transition-all"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
        {isPending ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-gray-500">
            <div className="bg-gray-100 p-4 rounded-full">
              <PackageOpen size={48} className="text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-lg">
                Your cart is empty
              </p>
              <p className="text-sm">
                Looks like you haven't added anything yet.
              </p>
            </div>
            <button
              onClick={closeCart}
              className="mt-4 text-indigo-600 font-medium hover:underline"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {data && data.length > 0 && (
        <div className="border-t border-gray-100 p-6 bg-white safe-bottom">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold text-indigo-600">
                {formatPrice(totalAmount)}
              </span>
            </div>
          </div>

          <button
            onClick={goToOrderCreate}
            className="group w-full py-3.5 px-4 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>
        </div>
      )}
    </div>
  );
}

export default Cart;

const CartItem = ({ item }: { item: CartItemProps }) => {
  const { fetchData } = useAxios();
  const queryClient = useQueryClient();

  const deleteItem = async (): Promise<void> => {
    await fetchData(`/orders/my-cart/${item.id}`, "DELETE");
  };

  const { mutate: handleDelete, isPending: isDeleting } = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: () => {
      alert("Failed to remove item.");
    },
  });

  const imageUrl = Array.isArray(item.images) ? item.images[0] : item.images;

  return (
    <div className="group relative flex items-start gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="w-20 h-20 shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
        <img
          src={imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between h-20 py-0.5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 truncate pr-6">
            {item.name}
          </h3>
          <p className="text-xs text-gray-500 mt-1">{item.category}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
            Qty: {item.quantity}
          </div>
          <p className="text-sm font-bold text-gray-900">
            {formatPrice(item.unitPrice * item.quantity)}
          </p>
        </div>
      </div>

      <button
        onClick={() => handleDelete()}
        disabled={isDeleting}
        className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50 disabled:opacity-50"
        title="Remove item"
      >
        {isDeleting ? (
          <Loader2 size={16} className="animate-spin text-gray-400" />
        ) : (
          <Trash2 size={16} />
        )}
      </button>
    </div>
  );
};
