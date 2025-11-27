import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import { getSocket, resetSocket } from "../../service/socket";
import { motion, AnimatePresence } from "framer-motion";

// --- Interfaces ---
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
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom =
      Math.abs(
        e.currentTarget.scrollHeight -
          e.currentTarget.scrollTop -
          e.currentTarget.clientHeight
      ) < 50;
    if (!bottom) setUserScrolledUp(true);
    else setUserScrolledUp(false);
  };

  const scrollToBottom = () => {
    if (!userScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isTyping, isOpen]);

  // --- Focus Input on Open ---
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // --- Socket Logic ---
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      if (!localStorage.getItem("chat_session_id")) {
        const newUUID = crypto.randomUUID();
        localStorage.setItem("chat_session_id", newUUID);
      }
    };
    const onDisconnect = () => {
      setIsConnected(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onChatStream = (data: any) => {
      const textChunk = data.chunk || data.content || "";

      // FIXED: Allow spaces, only return if strictly empty string
      if (!textChunk && textChunk !== " ") return;

      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];

        if (lastMsg && lastMsg.sender === "bot" && lastMsg.isStreaming) {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, text: lastMsg.text + textChunk },
          ];
        }

        setIsTyping(false);
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
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];

        if (lastMsg && lastMsg.sender === "bot") {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMsg,
              products: data.data,
              isStreaming: true, // Keep open for text
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

    const onChatEnd = (data: { status: string; error?: string }) => {
      setIsTyping(false);

      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];

        // Case 1: Close existing message
        if (lastMsg && lastMsg.sender === "bot") {
          const updated = [...prev];
          updated[updated.length - 1] = { ...lastMsg, isStreaming: false };

          if (data.status === "error") {
            updated[updated.length - 1].text += `\n\n⚠️ **Error:** ${
              data.error || "Unknown error"
            }`;
          }
          return updated;
        }

        // Case 2: No message exists yet.
        // FIXED: Only show error if the STATUS is error.
        // If status is "success" but no message exists yet, do nothing (wait for stream).
        if (data.status === "error") {
          return [
            ...prev,
            {
              id: Date.now().toString(),
              sender: "bot",
              text: `⚠️ **Error:** ${data.error}`,
              timestamp: new Date(),
              isStreaming: false,
            },
          ];
        }

        return prev;
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chatStream", onChatStream);
    socket.on("suggestedProducts", onSuggestedProducts);
    socket.on("chatEnd", onChatEnd);
    socket.on("connect_error", (err) => {
      console.error("Connection Error:", err);
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chatStream", onChatStream);
      socket.off("suggestedProducts", onSuggestedProducts);
      socket.off("chatEnd", onChatEnd);
      socket.off("connect_error");
    };
  }, [socket]);

  const sendMessage = (text: string) => {
    if (!text.trim() || !isConnected) return;

    setMessages((prev) => prev.map((m) => ({ ...m, isStreaming: false })));

    // FIXED: Ensure Session ID is retrieved OR Created AND Saved
    let session_id = localStorage.getItem("chat_session_id");
    if (!session_id) {
      session_id = crypto.randomUUID();
      localStorage.setItem("chat_session_id", session_id);
    }

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
    socket.emit("chatMessage", { message: text, session_id: session_id });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    resetSocket();
    window.location.reload();
  };

  // --- Render ---

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
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 p-0 w-16 h-16 bg-black text-white rounded-full shadow-2xl hover:shadow-indigo-500/40 transition-all duration-300 flex items-center justify-center group"
          >
            {/* ... Icon content ... */}
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
              {/* ... Header Content ... */}
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
                  onClick={handleClearChat}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
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
            <div
              className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50 scroll-smooth"
              onScroll={handleScroll}
            >
              {messages.length === 0 && (
                /* ... Empty State ... */
                <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in duration-300">
                  {/* ... content ... */}
                  <div className="grid grid-cols-1 gap-2 w-full max-w-[280px]">
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(q)}
                        className="text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm py-2.5 px-4 rounded-xl transition-all text-left flex items-center justify-between group"
                      >
                        {q}{" "}
                        <ChevronRight
                          size={14}
                          className="opacity-0 group-hover:opacity-100"
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
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <Sparkles size={12} className="text-indigo-500" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Suggested Products
                          </span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide snap-x">
                          {msg.products.map((product, i) => (
                            <div
                              // FIXED: Use Index as fallback, NEVER Math.random()
                              key={product.id || i}
                              onClick={() => {
                                if (product.product_path) {
                                  window.open(product.product_path, "_blank");
                                }
                              }}
                              className="min-w-[180px] max-w-[180px] bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden shrink-0 snap-start hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer"
                            >
                              {/* ... Product Card Content ... */}
                              <div className="h-32 w-full bg-gray-100 relative overflow-hidden">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <span className="text-xs">No Image</span>
                                  </div>
                                )}
                              </div>
                              <div className="p-3">
                                <div className="flex justify-between items-start gap-1 mb-1">
                                  <h5 className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight">
                                    {product.name}
                                  </h5>
                                  <ExternalLink
                                    size={10}
                                    className="text-gray-300 shrink-0"
                                  />
                                </div>
                                <p className="text-xs font-semibold text-indigo-600">
                                  {product.price}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
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
                  {/* ... Loading Dots ... */}
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
              {/* ... Input Field ... */}
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
