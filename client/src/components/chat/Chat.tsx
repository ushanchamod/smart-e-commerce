/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  RefreshCcw,
  Sparkles,
  ChevronRight,
  Zap,
  ExternalLink,
  Minimize2,
  Maximize2,
  ShoppingBag,
  AlertCircle,
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import { getSocket, resetSocket } from "../../service/socket"; // Removed reconnectSocket import
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/userAuthStore";
import { Socket } from "socket.io-client";

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

const SUGGESTED_QUESTIONS = [
  "🎁 Gift ideas under 5000",
  "🍰 Can I order a chocolate cake?",
  "🚚 Where is my order?",
  "💳 What are the payment options?",
];

const Chat = () => {
  const [socket, setSocket] = useState<Socket>(getSocket());

  const navigation = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");

  const [agentStatus, setAgentStatus] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [fullScreen, setFullScreen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, agentStatus, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // FIX: Prevent infinite reconnection loop on page load.
  // We only sync the local socket state if the global singleton has changed
  // (e.g., set by Login.tsx). We do NOT call reconnectSocket() here.
  useEffect(() => {
    if (user) {
      const currentGlobalSocket = getSocket();
      if (socket !== currentGlobalSocket) {
        console.log("🔄 Syncing new socket instance...");
        setSocket(currentGlobalSocket);
      }
    }
  }, [user, socket]);

  useEffect(() => {
    // 1. Define Session Init Logic
    const initSession = () => {
      let sessionId = localStorage.getItem("chat_session_id");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("chat_session_id", sessionId);
      }
      console.log("🔄 Requesting Chat History Restore for Session:", sessionId);
      socket.emit("restoreChat", { session_id: sessionId });
    };

    const onConnect = () => {
      console.log("✅ Socket Connected via Event Listener");
      setIsConnected(true);
      initSession();
    };

    const onDisconnect = () => {
      console.log("🔌 Socket Disconnected");
      setIsConnected(false);
    };

    const onConnectError = (err: any) => {
      console.error("❌ Connection Error:", err.message);
      setIsConnected(false);
    };

    const onChatHistory = (history: Message[]) => {
      console.log("📜 Chat history loaded:", history.length, "messages");
      console.log("History", history);

      const processed = history.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
      setMessages(processed);
    };

    const onAgentState = (data: { status: string }) => {
      setAgentStatus(data.status);
      setIsTyping(true);
    };

    const onChatStream = (data: any) => {
      const textChunk = data.chunk || data.content || "";
      setAgentStatus("");
      setIsTyping(false);

      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];

        if (lastMsg && lastMsg.sender === "bot" && lastMsg.isStreaming) {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, text: lastMsg.text + textChunk },
          ];
        }

        return [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "bot",
            text: textChunk,
            timestamp: new Date(),
            isStreaming: true,
          },
        ];
      });
    };

    const onSuggestedProducts = (data: {
      toolName: string;
      data: Product[];
    }) => {
      setAgentStatus("");
      setIsTyping(false);

      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.sender === "bot") {
          const existingProducts = lastMsg.products || [];
          const newProducts = data.data;
          const uniqueNewProducts = newProducts.filter(
            (np) => !existingProducts.some((ep) => ep.id === np.id)
          );

          return [
            ...prev.slice(0, -1),
            {
              ...lastMsg,
              products: [...existingProducts, ...uniqueNewProducts],
              isStreaming: true,
            },
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
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "bot",
          text: `✅ **System Update:** ${
            data.data || "Order cancelled successfully."
          }`,
          timestamp: new Date(),
          isStreaming: false,
        },
      ]);
    };

    const onChatEnd = (data: { status: string; error?: string }) => {
      setIsTyping(false);
      setAgentStatus("");

      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.sender === "bot") {
          const updated = [...prev];
          const finalMsg = { ...lastMsg, isStreaming: false };

          if (data.status === "error") {
            finalMsg.text += `\n\n❌ **Error:** ${
              data.error || "Something went wrong."
            }`;
            finalMsg.isError = true;
          }
          updated[updated.length - 1] = finalMsg;
          return updated;
        }

        if (data.status === "error") {
          return [
            ...prev,
            {
              id: Date.now().toString(),
              sender: "bot",
              text: `❌ **Error:** ${data.error || "Connection failed."}`,
              timestamp: new Date(),
              isStreaming: false,
              isError: true,
            },
          ];
        }
        return prev;
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("chatHistory", onChatHistory);
    socket.on("agentState", onAgentState);
    socket.on("chatStream", onChatStream);
    socket.on("suggestedProducts", onSuggestedProducts);
    socket.on("orderCancelled", onOrderCancelled);
    socket.on("chatEnd", onChatEnd);

    // Immediate connection check
    if (socket.connected) {
      console.log("⚡ Socket already connected, initializing immediately.");
      setIsConnected(true);
      initSession();
    } else {
      console.log("⏳ Socket not connected, connecting now...");
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("chatHistory", onChatHistory);
      socket.off("agentState", onAgentState);
      socket.off("chatStream", onChatStream);
      socket.off("suggestedProducts", onSuggestedProducts);
      socket.off("orderCancelled", onOrderCancelled);
      socket.off("chatEnd", onChatEnd);
    };
  }, [queryClient, socket]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    setMessages((prev) => prev.map((m) => ({ ...m, isStreaming: false })));

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        text: text,
        timestamp: new Date(),
        isStreaming: false,
      },
    ]);

    setInput("");
    setIsTyping(true);
    setAgentStatus("");

    let session_id = localStorage.getItem("chat_session_id");
    if (!session_id) {
      session_id = crypto.randomUUID();
      localStorage.setItem("chat_session_id", session_id);
    }

    if (!socket.connected) {
      console.log("⚠️ Socket disconnected on send, reconnecting...");
      socket.connect();
    }

    socket.emit("chatMessage", { message: text, session_id });
  };

  const handleClearChat = () => {
    setMessages([]);
    resetSocket();
    setIsOpen(false);
    setTimeout(() => {
      setSocket(getSocket());
      setIsOpen(true);
    }, 500);
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0, rotate: 90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsOpen(true);
              setFullScreen(false);
            }}
            className="w-16 h-16 bg-black text-white rounded-full shadow-2xl flex items-center justify-center group hover:bg-gray-900 transition-colors"
          >
            <div className="relative">
              <MessageCircle size={28} />
              <span
                className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
            </div>
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
              height: fullScreen ? "calc(100vh - 40px)" : "600px",
              width: fullScreen ? "calc(100vw - 40px)" : "400px",
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 font-sans fixed bottom-4 right-4 z-50`}
          >
            {/* Header */}
            <div className="bg-white p-4 border-b border-gray-100 flex justify-between items-center z-10 sticky top-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-linear-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      isConnected ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    Sales Assistant
                  </h3>
                  <p className="text-xs text-gray-500">
                    {isConnected ? "Online" : "Reconnecting..."}
                  </p>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => setFullScreen(!fullScreen)}
                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-full transition"
                >
                  {fullScreen ? (
                    <Minimize2 size={16} />
                  ) : (
                    <Maximize2 size={16} />
                  )}
                </button>
                <button
                  onClick={handleClearChat}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                  title="Reset Chat"
                >
                  <RefreshCcw size={16} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50 scroll-smooth">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
                  <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-2">
                    <Sparkles className="text-indigo-600" size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">
                      How can I help you?
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Ask about products, orders, or policies.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 w-full">
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(q)}
                        className="text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-sm py-3 px-4 rounded-xl transition-all text-left flex items-center justify-between group"
                      >
                        {q}{" "}
                        <ChevronRight
                          size={14}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex w-full ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex flex-col max-w-[85%] ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    {msg.text && (
                      <div
                        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-xs ${
                          msg.sender === "user"
                            ? "bg-black text-white rounded-tr-sm"
                            : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
                        } ${
                          msg.isError
                            ? "border-red-200 bg-red-50 text-red-800"
                            : ""
                        }`}
                      >
                        {msg.isError && (
                          <AlertCircle size={16} className="inline mr-2 mb-1" />
                        )}
                        {msg.sender === "bot" ? (
                          <MarkdownRenderer content={msg.text} />
                        ) : (
                          msg.text
                        )}
                      </div>
                    )}

                    {msg.products && msg.products.length > 0 && (
                      <div className="w-full mt-3">
                        <div className="flex items-center gap-1.5 mb-2 px-1">
                          <ShoppingBag size={12} className="text-indigo-600" />
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Recommendations
                          </span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide snap-x">
                          {msg.products.map((product, i) => (
                            <div
                              key={product.id || i}
                              onClick={() => {
                                if (product.product_path) {
                                  setIsOpen(false);
                                  navigation(product.product_path);
                                }
                              }}
                              className="min-w-40 max-w-40 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden shrink-0 snap-start hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                            >
                              <div className="h-28 w-full bg-gray-100 relative overflow-hidden">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                    No Image
                                  </div>
                                )}
                              </div>
                              <div className="p-3">
                                <h5 className="text-xs font-bold text-gray-900 line-clamp-2 mb-1 h-8">
                                  {product.name}
                                </h5>
                                <div className="flex justify-between items-center mt-2">
                                  <span className="text-xs font-semibold text-indigo-600">
                                    {product.price}
                                  </span>
                                  <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <ExternalLink size={12} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <span className="text-[10px] text-gray-400 mt-1 px-1">
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                    <Bot size={16} className="text-indigo-600 animate-pulse" />
                  </div>
                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-3 h-10">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                    </div>

                    {agentStatus && (
                      <>
                        <div className="w-px h-4 bg-gray-200 mx-1"></div>
                        <span className="text-xs font-medium text-gray-500 animate-pulse">
                          {agentStatus}
                        </span>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="relative flex items-end gap-2 bg-gray-50 rounded-2xl border border-transparent focus-within:border-indigo-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50 transition-all p-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && sendMessage(input)
                  }
                  disabled={!isConnected && !messages.length && !input}
                  placeholder={
                    isConnected ? "Ask anything..." : "Connecting..."
                  }
                  className="w-full bg-transparent border-none focus:ring-0 outline-0 text-sm py-2 px-3 text-gray-800 placeholder-gray-400"
                  autoComplete="off"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || !isConnected}
                  className={`p-2.5 rounded-xl shrink-0 transition-all duration-200 flex items-center justify-center ${
                    input.trim() && isConnected
                      ? "bg-black text-white shadow-md hover:bg-gray-800 hover:scale-105 active:scale-95"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Send size={18} />
                </button>
              </div>
              <div className="text-center mt-2 flex items-center justify-center gap-1">
                <Zap size={10} className="text-indigo-500 fill-indigo-500" />
                <p className="text-[10px] text-gray-400">
                  Powered by{" "}
                  <span className="font-semibold text-gray-500">UshanAI</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chat;
