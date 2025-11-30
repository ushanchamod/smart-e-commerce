import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "../../service/useAxios";
import { useState } from "react";
import type { CartItemProps } from "../../components/Cart";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  MapPin,
  ChevronLeft,
  ShieldCheck,
  Loader2,
  Banknote,
  ShoppingBag,
} from "lucide-react";

const CheckoutSkeleton = () => (
  <div className="min-h-screen bg-gray-50 max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div className="lg:col-span-2 space-y-6">
      <div className="h-40 bg-white rounded-2xl animate-pulse" />
      <div className="h-64 bg-white rounded-2xl animate-pulse" />
    </div>
    <div className="h-96 bg-white rounded-2xl animate-pulse" />
  </div>
);

const ConfirmOrder = () => {
  const { fetchData } = useAxios();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod" | "">("");
  const [address, setAddress] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const GetData = async () => {
    const response = (await fetchData("/orders/my-cart", "GET")) as {
      content: CartItemProps[];
    };
    return response.content;
  };

  const { data: cartItems, isPending } = useQuery({
    queryKey: ["cart"],
    queryFn: GetData,
  });

  const createOrder = async () => {
    await fetchData("/orders", "POST", {
      address,
      paymentMethod,
    });
  };

  const { mutate, isPending: isCreatingOrder } = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setIsSuccess(true);
      setTimeout(() => {
        navigate("/");
      }, 2000);
    },
    onError: (error) => {
      console.error("Error creating order:", error);
      alert("Failed to place order. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethod) return alert("Please select a payment method");
    mutate();
  };

  if (isPending) return <CheckoutSkeleton />;

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500 gap-4">
        <ShoppingBag size={48} className="text-gray-300" />
        <p className="text-lg font-medium">Your cart is empty.</p>
        <button
          onClick={() => navigate("/")}
          className="text-indigo-600 hover:underline"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.unitPrice) * Number(item.quantity),
    0
  );
  const shipping = 0;
  const total = subtotal + shipping;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
        >
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4 text-gray-800">
                <MapPin className="text-indigo-600" size={20} />
                <h2 className="text-lg font-semibold">Delivery Address</h2>
              </div>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-700 bg-gray-50 
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none"
                placeholder="Street, City, Province, Postal Code"
                required
              />
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4 text-gray-800">
                <CreditCard className="text-indigo-600" size={20} />
                <h2 className="text-lg font-semibold">Payment Method</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setPaymentMethod("online")}
                  className={`cursor-pointer border rounded-xl p-4 flex items-center gap-4 transition-all duration-200
                        ${
                          paymentMethod === "online"
                            ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                >
                  <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm text-indigo-600">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Pay Online</p>
                    <p className="text-xs text-gray-500">
                      Visa, Mastercard, Amex
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setPaymentMethod("cod")}
                  className={`cursor-pointer border rounded-xl p-4 flex items-center gap-4 transition-all duration-200
                        ${
                          paymentMethod === "cod"
                            ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                >
                  <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm text-green-600">
                    <Banknote size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Cash on Delivery
                    </p>
                    <p className="text-xs text-gray-500">
                      Pay when you receive
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Order Summary
              </h2>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-6 custom-scrollbar">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center">
                    <div className="relative w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                      <img
                        src={item.images}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 right-0 bg-black text-white text-[10px] px-1.5 py-0.5 rounded-tl-md font-bold">
                        x{item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {item.category}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Intl.NumberFormat("en-LK", {
                        style: "currency",
                        currency: "LKR",
                        maximumFractionDigits: 0,
                      }).format(Number(item.unitPrice) * Number(item.quantity))}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>
                    {new Intl.NumberFormat("en-LK", {
                      style: "currency",
                      currency: "LKR",
                    }).format(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="flex justify-between items-end pt-2 border-t border-gray-100">
                  <span className="text-base font-bold text-gray-900">
                    Total
                  </span>
                  <span className="text-xl font-bold text-indigo-600">
                    {new Intl.NumberFormat("en-LK", {
                      style: "currency",
                      currency: "LKR",
                    }).format(total)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingOrder || isSuccess}
                className={`w-full mt-6 py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg
                    ${
                      isSuccess
                        ? "bg-green-500 shadow-green-200"
                        : "bg-black hover:bg-gray-800 shadow-gray-200 active:scale-[0.98]"
                    }`}
              >
                {isCreatingOrder ? (
                  <>
                    <Loader2 className="animate-spin" size={20} /> Processing...
                  </>
                ) : isSuccess ? (
                  <>
                    <ShieldCheck size={20} /> Order Confirmed!
                  </>
                ) : (
                  "Place Order"
                )}
              </button>

              <div className="mt-4 flex justify-center items-center gap-2 text-xs text-gray-400">
                <ShieldCheck size={14} />
                <span>Secure Encrypted Transaction</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfirmOrder;
