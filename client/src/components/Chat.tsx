import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  ShoppingBag,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import { socket } from "../service/socket";

export interface Product {
  id: string;
  name: string;
  price: string;
  image?: string;
  description?: string;
}

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  products?: Product[];
  timestamp: Date;
}

const Chat = () => {
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

  // --- Focus Logic ---
  useEffect(() => {
    if (isOpen && isConnected) {
      setTimeout(() => inputRef.current?.focus(), 300); // Small delay for animation
    }
  }, [isOpen, isConnected]);

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
        if (lastMsg && lastMsg.sender === "bot") {
          return [...prev.slice(0, -1), { ...lastMsg, products: data.data }];
        }
        return [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "bot",
            text: "",
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
            text: `⚠️ Error: ${data.error}`,
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
  }, []);

  const handleSendMessage = () => {
    if (!input.trim() || !isConnected) return;
    const userText = input.trim();
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        text: userText,
        timestamp: new Date(),
      },
    ]);
    setInput("");
    setIsTyping(true);
    socket.emit("chatMessage", { message: userText });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- Render Components ---

  // 1. Minimized Launcher
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 group flex items-center justify-center p-4 bg-linear-to-br from-indigo-600 to-purple-700 text-white rounded-full shadow-2xl hover:scale-110 hover:shadow-indigo-500/50 transition-all duration-300"
      >
        <MessageCircle className="h-7 w-7 animate-pulse" />
        <span className="absolute right-0 top-0 flex h-3 w-3">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isConnected ? "bg-green-400" : "bg-yellow-400"
            }`}
          ></span>
          <span
            className={`relative inline-flex rounded-full h-3 w-3 ${
              isConnected ? "bg-green-500" : "bg-yellow-500"
            }`}
          ></span>
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 flex items-end justify-end">
      {/* Main Container */}
      <div className="w-full h-full sm:h-[650px] sm:w-[420px] bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-10 fade-in duration-300 font-sans">
        <div className="relative bg-white/80 backdrop-blur-md p-4 border-b border-gray-100 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center border border-indigo-50">
              <Sparkles className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">
                Shopping Assistant
              </h3>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? "bg-emerald-500"
                      : "bg-amber-500 animate-pulse"
                  }`}
                />
                <span className="text-xs text-gray-500 font-medium">
                  {isConnected ? "Online" : "Reconnecting..."}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setMessages([])}
              title="Reset Chat"
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50 scroll-smooth">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-0 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                <Bot className="h-10 w-10 text-indigo-500" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">
                Hello there! 👋
              </h4>
              <p className="text-sm text-gray-500 max-w-[250px]">
                I can help you find products, check prices, and answer your
                questions.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              } animate-in slide-in-from-bottom-2 duration-300`}
            >
              {/* Avatar for Bot */}
              {msg.sender === "bot" && (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2 shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-indigo-600" />
                </div>
              )}

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
                        ? "bg-linear-to-br from-indigo-600 to-purple-600 text-white rounded-tr-none"
                        : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"
                    }`}
                  >
                    {msg.sender === "bot" ? (
                      <MarkdownRenderer content={msg.text} />
                    ) : (
                      msg.text
                    )}
                  </div>
                )}

                {/* Product Carousel (Horizontal Scroll) */}
                {msg.products && msg.products.length > 0 && (
                  <div className="w-full mt-3">
                    <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide snap-x">
                      {msg.products.map((product, idx) => (
                        <div
                          key={idx}
                          className="min-w-[200px] max-w-[200px] bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden shrink-0 snap-center hover:shadow-lg transition-shadow duration-300"
                        >
                          <div className="h-28 bg-gray-100 flex items-center justify-center relative overflow-hidden group">
                            {/* Placeholder or Actual Image */}
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ShoppingBag className="h-8 w-8 text-gray-300" />
                            )}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button className="bg-white text-xs font-bold px-3 py-1 rounded-full text-gray-800">
                                View
                              </button>
                            </div>
                          </div>
                          <div className="p-3">
                            <h4
                              className="font-semibold text-gray-800 text-xs truncate"
                              title={product.name}
                            >
                              {product.name}
                            </h4>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-indigo-600 font-bold text-sm">
                                {product.price}
                              </span>
                              <div className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                                In Stock
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <span className="text-[10px] text-gray-300 mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Avatar for User */}
              {msg.sender === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center ml-2 shrink-0 mt-1">
                  <User className="h-4 w-4 text-gray-500" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start items-center animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mr-2">
                <Bot className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer / Input */}
        <div className="p-4 bg-white border-t border-gray-100 relative z-20">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={!isConnected}
              placeholder={
                isConnected ? "Ask about products..." : "Connecting..."
              }
              className="w-full pl-5 pr-12 py-3.5 bg-gray-100 border-transparent focus:bg-white border focus:border-indigo-500 rounded-full text-sm transition-all outline-none shadow-inner"
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || !isConnected}
              className={`absolute right-2 p-2 rounded-full transition-all duration-200 ${
                input.trim() && isConnected
                  ? "bg-indigo-600 text-white shadow-md hover:scale-105 active:scale-95"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {!isConnected ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4 ml-0.5" />
              )}
            </button>
          </div>
          <div className="text-center mt-3">
            <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
              <span>Powered by</span>
              <a
                href="https://ushan.me"
                className="font-semibold text-gray-500 hover:text-indigo-500 transition-colors"
              >
                UshanAI
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
