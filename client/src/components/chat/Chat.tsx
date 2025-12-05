import { useState, useRef, useEffect, memo } from "react";
import {
  MessageSquare,
  X,
  Send,
  ChevronRight,
  ExternalLink,
  Minimize2,
  Maximize2,
  ShoppingBag,
  ArrowDown,
  Sparkles,
  User,
  RefreshCcw,
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import { getSocket, resetSocket } from "../../service/socket";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/userAuthStore";
import { Socket } from "socket.io-client";

// --- Types ---
export interface Product {
  id: string | number;
  name: string;
  price: string;
  image?: string;
  description?: string;
  category?: string;
  product_path?: string;
}

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  products?: Product[];
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
}

interface CartPayload {
  data: string;
}

const SUGGESTED_QUESTIONS = [
  "🎁 Gift ideas under 5000",
  "📦 Track my order",
  "💳 Payment methods",
];

// --- Components ---

// 1. Product Card (Accessible & Memoized)
const ProductCard = memo(
  ({ product, onClick }: { product: Product; onClick: () => void }) => (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="min-w-[140px] max-w-[140px] text-left border border-gray-100 rounded-xl overflow-hidden bg-white cursor-pointer hover:border-black hover:shadow-md transition-all duration-300 snap-start flex flex-col group focus:outline-none focus:ring-2 focus:ring-black/10"
    >
      <div className="h-24 w-full bg-gray-50 relative overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">
            No Image
          </div>
        )}
      </div>
      <div className="p-2.5 flex flex-col flex-1 w-full">
        <h5 className="text-[11px] font-medium text-gray-900 line-clamp-2 leading-relaxed mb-2 w-full">
          {product.name}
        </h5>
        <div className="mt-auto flex justify-between items-center border-t border-gray-50 pt-2 w-full">
          <span className="text-[11px] font-bold text-black">
            {product.price}
          </span>
          <ExternalLink
            size={10}
            className="text-gray-400 group-hover:text-black transition-colors"
          />
        </div>
      </div>
    </motion.button>
  )
);

const ChatSkeleton = () => (
  <div className="space-y-6 p-2 animate-pulse">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className={`flex gap-3 ${
          i % 2 === 0 ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
        <div
          className={`flex flex-col gap-2 ${
            i % 2 === 0 ? "items-end" : "items-start"
          } max-w-[70%]`}
        >
          <div className="h-10 w-full rounded-2xl bg-gray-100" />
          {i === 1 && (
            <div className="h-24 w-48 rounded-xl bg-gray-50 border border-gray-100" />
          )}
          <div className="h-3 w-10 bg-gray-100 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

const Chat = () => {
  const navigation = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [socketKey, setSocketKey] = useState(0);
  const socketRef = useRef<Socket>(getSocket());

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [agentStatus, setAgentStatus] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const [isConnected, setIsConnected] = useState<boolean>(
    socketRef.current.connected
  );

  const [fullScreen, setFullScreen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isUserScrolledUp = distanceFromBottom > 100;
    setShowScrollButton(isUserScrolledUp);
    setIsAtBottom(!isUserScrolledUp);
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    if (isAtBottom) {
      const isStreaming = messages.some((m) => m.isStreaming);
      scrollToBottom(isStreaming ? "auto" : "smooth");
    }
  }, [messages, isAtBottom]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setIsLoadingHistory(true);
      const timer = setTimeout(() => setIsLoadingHistory(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    const socket = socketRef.current;

    const initSession = () => {
      let sessionId = localStorage.getItem("chat_session_id");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("chat_session_id", sessionId);
      }
      socket.emit("restoreChat", { session_id: sessionId });
    };

    const onConnect = () => {
      setIsConnected(true);
      initSession();
    };

    const onDisconnect = () => setIsConnected(false);

    const onChatHistory = (history: Message[]) => {
      setTimeout(() => {
        setMessages(
          history.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }))
        );
        setIsLoadingHistory(false);
        setIsAtBottom(true);
      }, 600);
    };

    const onAgentState = (data: { status: string }) => {
      setAgentStatus(data.status);
      setIsTyping(true);
    };

    const onSuggestedProducts = (data: { data: Product[] }) => {
      setAgentStatus("");
      setIsTyping(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.sender === "bot") {
          const existing = last.products || [];
          const unique = data.data.filter(
            (np) => !existing.some((ep) => ep.id === np.id)
          );
          if (unique.length === 0) return prev;

          return [
            ...prev.slice(0, -1),
            { ...last, products: [...existing, ...unique], isStreaming: true },
          ];
        }
        return [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "bot",
            text: "",
            products: data.data,
            timestamp: new Date(),
            isStreaming: true,
          },
        ];
      });
    };

    const onOrderCancelled = (data: { data: string }) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setMessages((p) => [
        ...p,
        {
          id: Date.now().toString(),
          sender: "bot",
          text: `✅ ${data.data || "Order cancelled."}`,
          timestamp: new Date(),
          isStreaming: false,
        },
      ]);
    };

    const onChatStream = (data: { chunk?: string; content?: string }) => {
      const text = data.chunk || data.content || "";
      setAgentStatus("");
      setIsTyping(false);

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.sender === "bot" && last.isStreaming) {
          return [...prev.slice(0, -1), { ...last, text: last.text + text }];
        }
        return [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "bot",
            text,
            timestamp: new Date(),
            isStreaming: true,
          },
        ];
      });
    };

    const onAddedToCart = (payload: CartPayload) => {
      let productName = "Item";
      try {
        const parsed = JSON.parse(payload.data);
        productName = parsed.productName || "Item";
      } catch (e) {
        console.error("Failed to parse cart payload", e);
      }

      setMessages((p) => [
        ...p,
        {
          id: Date.now().toString(),
          sender: "bot",
          text: `🛒 "${productName}" added to cart.`,
          timestamp: new Date(),
          isStreaming: false,
        },
      ]);
    };

    const onChatEnd = (data: { status: string; error?: string }) => {
      setIsTyping(false);
      setAgentStatus("");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.sender === "bot") {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...last,
            isStreaming: false,
            text:
              last.text +
              (data.status === "error" ? `\n\n❌ ${data.error}` : ""),
            isError: data.status === "error",
          };
          return updated;
        }
        return prev;
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chatHistory", onChatHistory);
    socket.on("agentState", onAgentState);
    socket.on("chatStream", onChatStream);
    socket.on("itemAddedToCart", onAddedToCart);
    socket.on("suggestedProducts", onSuggestedProducts);
    socket.on("orderCancelled", onOrderCancelled);
    socket.on("chatEnd", onChatEnd);

    if (socket.connected) {
      setIsConnected(true);
      initSession();
    } else {
      socket.connect();
    }

    // Cleanup
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chatHistory", onChatHistory);
      socket.off("agentState", onAgentState);
      socket.off("chatStream", onChatStream);
      socket.off("itemAddedToCart", onAddedToCart);
      socket.off("suggestedProducts", onSuggestedProducts);
      socket.off("orderCancelled", onOrderCancelled);
      socket.off("chatEnd", onChatEnd);
    };
  }, [queryClient, user, socketKey]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    setIsAtBottom(true);
    setMessages((prev) => [
      ...prev.map((m) => ({ ...m, isStreaming: false })),
      {
        id: Date.now().toString(),
        sender: "user",
        text,
        timestamp: new Date(),
        isStreaming: false,
      },
    ]);

    setInput("");
    setIsTyping(true);
    setAgentStatus("");

    let sessionId = localStorage.getItem("chat_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("chat_session_id", sessionId);
    }

    const socket = socketRef.current;
    if (!socket.connected) socket.connect();
    socket.emit("chatMessage", { message: text, session_id: sessionId });
  };

  const handleClearChat = () => {
    setMessages([]);
    setIsOpen(false);
    setIsConnected(false);

    resetSocket();

    socketRef.current = getSocket();
    setSocketKey((prev) => prev + 1);

    setTimeout(() => {
      setIsOpen(true);
    }, 300);
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsOpen(true);
              setFullScreen(false);
            }}
            className="fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-neutral-800 transition-colors z-50 group"
            aria-label="Open Chat"
          >
            <MessageSquare
              size={24}
              strokeWidth={1.5}
              className="group-hover:scale-110 transition-transform"
            />
            {isConnected && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-white" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              width: fullScreen ? "100vw" : "min(420px, calc(100vw - 32px))",
              height: fullScreen
                ? "100dvh"
                : "min(700px, calc(100dvh - 100px))",
              borderRadius: fullScreen ? 0 : "24px",
              bottom: fullScreen ? 0 : "24px",
              right: fullScreen ? 0 : "24px",
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onAnimationComplete={() => inputRef.current?.focus()}
            className="fixed z-50 bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col font-sans"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100/50 bg-white/90 backdrop-blur-md sticky top-0 z-10 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white shadow-md shadow-gray-200">
                  <Sparkles size={16} fill="white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 leading-none tracking-tight">
                    Shopping Assistant
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        isConnected ? "bg-emerald-500" : "bg-amber-500"
                      } animate-pulse`}
                    ></div>
                    <p className="text-[10px] text-gray-500 font-medium">
                      {isConnected ? "Online" : "Reconnecting..."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-gray-400">
                <button
                  onClick={() => setFullScreen(!fullScreen)}
                  className="p-2 hover:text-black hover:bg-gray-100 rounded-full transition-colors hidden sm:flex"
                  title="Toggle Fullscreen"
                >
                  {fullScreen ? (
                    <Minimize2 size={16} />
                  ) : (
                    <Maximize2 size={16} />
                  )}
                </button>
                <button
                  onClick={handleClearChat}
                  className="p-2 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="Reset Chat"
                >
                  <RefreshCcw size={16} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                  title="Close Chat"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-5 bg-white scroll-smooth relative"
            >
              {isLoadingHistory ? (
                <ChatSkeleton />
              ) : messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center p-4"
                >
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 rotate-3">
                    <Sparkles size={28} className="text-black" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-8">
                    How can I help you today?
                  </p>
                  <div className="flex flex-col gap-2.5 w-full max-w-[260px]">
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => sendMessage(q)}
                        className="text-xs font-medium text-left px-4 py-3.5 border border-gray-100 bg-white shadow-sm rounded-xl hover:border-black hover:shadow-md transition-all text-gray-600 hover:text-black flex justify-between items-center group"
                      >
                        {q}
                        <ChevronRight
                          size={14}
                          className="opacity-0 group-hover:opacity-100 transition-transform group-hover:translate-x-1"
                        />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={msg.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 w-full ${
                        msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <div
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border shadow-sm mt-auto transition-transform hover:scale-105 ${
                          msg.sender === "user"
                            ? "bg-black border-black text-white"
                            : "bg-white border-gray-200 text-black"
                        }`}
                      >
                        {msg.sender === "user" ? (
                          <User size={14} />
                        ) : (
                          <Sparkles size={14} />
                        )}
                      </div>

                      <div
                        className={`flex flex-col max-w-[85%] ${
                          msg.sender === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        {msg.text && (
                          <div
                            className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm relative group ${
                              msg.sender === "user"
                                ? "bg-black text-white rounded-br-sm"
                                : "bg-gray-50 border border-gray-100 text-gray-800 rounded-bl-sm"
                            }`}
                          >
                            {msg.sender === "bot" ? (
                              <MarkdownRenderer content={msg.text} />
                            ) : (
                              msg.text
                            )}
                          </div>
                        )}

                        {msg.products && msg.products.length > 0 && (
                          <div className="mt-3 w-full">
                            <div className="flex items-center gap-1.5 mb-2 pl-1">
                              <ShoppingBag
                                size={10}
                                className="text-gray-400"
                              />
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Recommended
                              </span>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide snap-x -ml-1">
                              {msg.products.map((product) => (
                                <ProductCard
                                  key={product.id}
                                  product={product}
                                  onClick={() =>
                                    product.product_path &&
                                    (setFullScreen(false),
                                    navigation(product.product_path))
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <span
                          className={`text-[10px] text-gray-300 mt-1 px-1 transition-opacity duration-300 ${
                            msg.sender === "user" ? "text-right" : "text-left"
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-end gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                        <Sparkles size={14} />
                      </div>
                      <div className="px-4 py-3 bg-gray-50 rounded-2xl rounded-bl-sm border border-gray-100 flex items-center gap-1 h-10 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                        {agentStatus && (
                          <div className="flex items-center ml-2 border-l border-gray-300 pl-2">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              {agentStatus}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} className="h-px" />
                </div>
              )}
            </div>

            <AnimatePresence>
              {showScrollButton && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => scrollToBottom()}
                  className="absolute bottom-30 right-6 p-3 bg-white border border-gray-200 text-black rounded-full shadow-lg z-20 hover:bg-gray-50 hover:scale-105 transition-all"
                  aria-label="Scroll to bottom"
                >
                  <ArrowDown size={18} />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-20"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-black"></span>
                  </span>
                </motion.button>
              )}
            </AnimatePresence>

            <div className="p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-10">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="relative flex items-center gap-2 group"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={
                    !isConnected &&
                    !messages.length &&
                    !input &&
                    !isLoadingHistory
                  }
                  placeholder={
                    isLoadingHistory
                      ? "Loading history..."
                      : "Type a message..."
                  }
                  className="w-full bg-white border border-gray-200 group-hover:border-gray-300  rounded-full pl-5 pr-12 py-3.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all shadow-sm"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || !isConnected}
                  className={`absolute right-2 p-2 rounded-full transition-all duration-300 ${
                    input.trim()
                      ? "bg-black text-white hover:scale-105 hover:shadow-lg"
                      : "bg-transparent text-gray-300"
                  }`}
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
              <div className="text-center mt-2.5 flex items-center justify-center gap-1.5 opacity-60">
                <span className="text-[9px] text-gray-400 font-medium">
                  Powered by
                </span>
                <span className="text-[9px] font-bold text-gray-900 tracking-wide">
                  UshanAI
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chat;
