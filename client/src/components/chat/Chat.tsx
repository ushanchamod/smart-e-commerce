import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  ShoppingBag,
  RefreshCcw,
  Sparkles,
  ChevronRight,
  Zap,
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import { getSocket } from "../../service/socket";
import { motion, AnimatePresence } from "framer-motion";

// --- Interfaces ---
export interface Product {
  id: string;
  name: string;
  price: string;
  image?: string;
  description?: string;
  category?: string;
}

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  products?: Product[];
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "Track my order",
  "Delivery charges",
  "Return policy",
  "Gifts under LKR 5,000",
];

const Chat = () => {
  const socket = getSocket();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Scroll Logic ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  // --- Focus Input on Open ---
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // --- Socket Logic ---
  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onChatStream = (data: { chunk: string }) => {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.sender === "bot") {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, text: lastMsg.text + data.chunk },
          ];
        } else {
          setIsTyping(false);
          return [
            ...prev,
            {
              id: Date.now().toString(),
              sender: "bot",
              text: data.chunk,
              timestamp: new Date(),
            },
          ];
        }
      });
    };

    const onSuggestedProducts = (data: {
      toolName: string;
      data: Product[];
    }) => {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        // If the last message is from bot, append products to it
        if (lastMsg && lastMsg.sender === "bot") {
          // Only update if products aren't already there to prevent dupes/flicker
          if (!lastMsg.products) {
            return [...prev.slice(0, -1), { ...lastMsg, products: data.data }];
          }
          return prev;
        }

        setIsTyping(false);
        return [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "bot",
            text: "", // Empty text, just products
            products: data.data,
            timestamp: new Date(),
          },
        ];
      });
    };

    const onChatEnd = (data: { status: string; error?: string }) => {
      setIsTyping(false);
      if (data.status === "error") {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "bot",
            text: `⚠️ **Error:** ${data.error || "Something went wrong."}`,
            timestamp: new Date(),
          },
        ]);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chatStream", onChatStream);
    socket.on("suggestedProducts", onSuggestedProducts);
    socket.on("chatEnd", onChatEnd);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chatStream", onChatStream);
      socket.off("suggestedProducts", onSuggestedProducts);
      socket.off("chatEnd", onChatEnd);
    };
  }, [socket]);

  const sendMessage = (text: string) => {
    if (!text.trim() || !isConnected) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        text: text,
        timestamp: new Date(),
      },
    ]);
    setInput("");
    setIsTyping(true);
    socket.emit("chatMessage", { message: text });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // --- Render ---

  return (
    <>
      {/* LAUNCHER BUTTON */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0, rotate: 90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 p-0 w-16 h-16 bg-black text-white rounded-full shadow-2xl hover:shadow-indigo-500/40 transition-all duration-300 flex items-center justify-center group"
          >
            <div className="absolute inset-0 rounded-full bg-linear-to-tr from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <MessageCircle size={32} strokeWidth={1.5} />
              {isConnected && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full" />
              )}
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* CHAT WINDOW */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 right-4 z-50 w-[calc(100vw-32px)] sm:w-[400px] h-[600px] max-h-[calc(100vh-32px)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 font-sans"
          >
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-md p-4 border-b border-gray-100 flex justify-between items-center z-10 sticky top-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-linear-to-br from-indigo-100 to-purple-50 rounded-full flex items-center justify-center border border-indigo-50 shadow-sm">
                    <Bot className="h-6 w-6 text-indigo-600" />
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${
                      isConnected ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">
                    Shopping Assistant
                  </h3>
                  <p className="text-xs text-gray-500">
                    {isConnected ? "Replies instantly" : "Connecting..."}
                  </p>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => setMessages([])}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  title="Clear Chat"
                >
                  <RefreshCcw size={18} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50 scroll-smooth">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-6">
                    <Sparkles className="h-8 w-8 text-indigo-500" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">
                    How can I help?
                  </h4>
                  <p className="text-sm text-gray-500 mb-8 max-w-60">
                    I can help you check stock, find products, or track your
                    orders.
                  </p>

                  {/* Starter Chips */}
                  <div className="grid grid-cols-1 gap-2 w-full max-w-[280px]">
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(q)}
                        className="text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm py-2.5 px-4 rounded-xl transition-all text-left flex items-center justify-between group"
                      >
                        {q}
                        <ChevronRight
                          size={14}
                          className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0"
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
                    {/* Message Bubble */}
                    {msg.text && (
                      <div
                        className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-black text-white rounded-tr-sm"
                            : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
                        }`}
                      >
                        {msg.sender === "bot" ? (
                          <MarkdownRenderer content={msg.text} />
                        ) : (
                          msg.text
                        )}
                      </div>
                    )}

                    {/* Product Carousel */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="w-full mt-3 max-w-full">
                        {/* Header for Products */}
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <ShoppingBag size={14} className="text-indigo-600" />
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                            Suggested Products
                          </span>
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide snap-x">
                          {msg.products.map((product, idx) => (
                            <div
                              key={idx}
                              className="min-w-[180px] max-w-[180px] bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden shrink-0 snap-start hover:shadow-xl transition-all duration-300 group cursor-pointer"
                            >
                              <div className="h-32 bg-gray-100 relative overflow-hidden">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                    <ShoppingBag className="text-gray-300" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-white text-xs font-bold border border-white/50 px-3 py-1 rounded-full backdrop-blur-sm">
                                    View Details
                                  </span>
                                </div>
                              </div>
                              <div className="p-3">
                                <h4
                                  className="font-semibold text-gray-800 text-xs truncate mb-1"
                                  title={product.name}
                                >
                                  {product.name}
                                </h4>
                                <div className="flex justify-between items-center">
                                  <span className="text-indigo-600 font-bold text-sm">
                                    {product.price}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                      {msg.sender === "user" ? "You" : "Assistant"} •{" "}
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Zap
                      className="h-3 w-3 text-indigo-500"
                      fill="currentColor"
                    />
                  </div>
                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="relative flex items-end gap-2 bg-gray-50 rounded-2xl border border-transparent focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50 transition-all p-2">
                <input
                  name="chat-input"
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={!isConnected}
                  placeholder={
                    isConnected ? "Type a message..." : "Reconnecting..."
                  }
                  className="w-full bg-transparent border-none focus:ring-0 outline-0 text-sm py-2 px-2 max-h-20 text-gray-800 placeholder-gray-400"
                  autoComplete="off"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || !isConnected}
                  className={`p-2 rounded-xl shrink-0 transition-all duration-200 ${
                    input.trim() && isConnected
                      ? "bg-black text-white shadow-md hover:scale-105 active:scale-95"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Send size={18} />
                </button>
              </div>

              <div className="text-center mt-2">
                <p className="text-[10px] text-gray-300">
                  Powered by{" "}
                  <span className="font-semibold text-gray-400">UshanAI</span>
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
