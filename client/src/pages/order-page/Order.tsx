import { useAxios } from "../../service/useAxios";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Package,
  Calendar,
  MapPin,
  CreditCard,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  Check,
  FileText,
  ExternalLink,
  ShoppingBag,
} from "lucide-react";

interface OrderItemProps {
  productId: number;
  quantity: number;
  unitPrice: number;
  productName: string;
  productImage: string;
}

interface Order {
  orderId: number;
  address: string;
  totalAmount: number;
  paymentMethod: string;
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  createdAt: string;
  orderItems: OrderItemProps[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getStatusConfig = (status: string) => {
  const configs: Record<
    string,
    { color: string; icon: React.ReactNode; label: string; bg: string }
  > = {
    PENDING: {
      bg: "bg-amber-50",
      color: "text-amber-700 border-amber-200",
      icon: <Clock size={14} />,
      label: "Pending",
    },
    PAID: {
      bg: "bg-blue-50",
      color: "text-blue-700 border-blue-200",
      icon: <CreditCard size={14} />,
      label: "Paid",
    },
    SHIPPED: {
      bg: "bg-indigo-50",
      color: "text-indigo-700 border-indigo-200",
      icon: <Truck size={14} />,
      label: "Shipped",
    },
    DELIVERED: {
      bg: "bg-emerald-50",
      color: "text-emerald-700 border-emerald-200",
      icon: <CheckCircle size={14} />,
      label: "Delivered",
    },
    CANCELLED: {
      bg: "bg-red-50",
      color: "text-red-700 border-red-200",
      icon: <XCircle size={14} />,
      label: "Cancelled",
    },
  };
  return (
    configs[status] || {
      bg: "bg-gray-50",
      color: "text-gray-700 border-gray-200",
      icon: <Clock size={14} />,
      label: status,
    }
  );
};

const OrderSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="bg-white rounded-xl h-28 w-full border border-gray-100 shadow-sm animate-pulse"
      />
    ))}
  </div>
);

const OrderCard = ({ order }: { order: Order }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const statusConfig = getStatusConfig(order.status);
  const total =
    order.totalAmount ||
    order.orderItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`#${order.orderId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border rounded-2xl shadow-sm transition-shadow duration-300 overflow-hidden ${
        isExpanded
          ? "shadow-md ring-1 ring-indigo-50 border-indigo-100"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 cursor-pointer relative group"
      >
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex gap-4 items-center">
            <div
              className={`p-3 rounded-xl ${statusConfig.bg} ${statusConfig.color} bg-opacity-50`}
            >
              <Package size={24} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-lg">
                  Order #{order.orderId}
                </span>
                <button
                  onClick={handleCopyId}
                  className="text-gray-400 hover:text-indigo-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                  title="Copy Order ID"
                >
                  {copied ? (
                    <Check size={14} className="text-green-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.bg} ${statusConfig.color}`}
                >
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(order.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between w-full md:w-auto gap-8 pl-16 md:pl-0">
            <div className="text-right">
              <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
                Total
              </span>
              <span className="block text-lg font-bold text-gray-900">
                {formatCurrency(total)}
              </span>
            </div>

            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-gray-400 group-hover:text-indigo-600 transition-colors"
            >
              <ChevronDown size={20} />
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden bg-gray-50/50"
          >
            <div className="p-5 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingBag size={16} /> Items in this order
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {order.orderItems.map((item) => (
                  <div
                    key={item.productId}
                    className="flex gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="h-16 w-16 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                      <img
                        src={item.productImage || "https://placehold.co/100"}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-between flex-1 py-0.5">
                      <div>
                        <p
                          className="text-sm font-medium text-gray-900 line-clamp-1"
                          title={item.productName}
                        >
                          {item.productName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.quantity} x {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 text-right">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 border-dashed flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={16} className="text-gray-400" />
                    <span className="max-w-xs truncate" title={order.address}>
                      {order.address}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CreditCard size={16} className="text-gray-400" />
                    <span>
                      Paid via{" "}
                      <span className="font-medium text-gray-900">
                        {order.paymentMethod}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex w-full md:w-auto gap-3">
                  <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition shadow-sm">
                    <FileText size={16} /> Invoice
                  </button>
                  <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition shadow-sm shadow-indigo-200">
                    <ExternalLink size={16} /> Track Order
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Order = () => {
  const { fetchData } = useAxios();

  const GetData = async () => {
    const response = (await fetchData("/orders", "GET")) as {
      content: Order[];
    };
    return response.content;
  };

  const { data, isPending } = useQuery({
    queryKey: ["orders"],
    queryFn: GetData,
  });

  if (isPending) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Orders</h1>
        <OrderSkeleton />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] p-4 text-center">
        <div className="bg-gray-50 p-8 rounded-full mb-6 animate-in zoom-in duration-300">
          <ShoppingBag size={64} className="text-gray-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          No orders found
        </h3>
        <p className="text-gray-500 max-w-sm mx-auto mb-8">
          It looks like you haven't placed any orders yet. Start shopping to
          fill this page up!
        </p>
        <button className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition shadow-lg">
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Order History
            </h1>
            <p className="text-gray-500 mt-2">
              View and track your recent orders ({data.length})
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {data.map((order) => (
            <OrderCard key={order.orderId} order={order} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Order;
