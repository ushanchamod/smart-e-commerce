import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import useAxios from "../service/useAxios";
import ProductCard, { type Product } from "./ProductCard"; // 1. Import ProductCard component

interface Message {
  id: string;
  sender: "user" | "bot";
  text?: string;
  products?: Product[];
}

const Chat: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { fetchData } = useAxios();

  // Use smooth scrolling
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Re-focus input after bot is done typing
  useEffect(() => {
    if (isOpen && !isTyping && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isTyping]);

  const handleSendMessage = async () => {
    if (input.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: input.trim(),
        sender: "user",
      };
      setMessages((prev) => [...prev, userMessage]);
      const messageText = input.trim();
      setInput("");
      setIsTyping(true);

      try {
        const response = await fetchData("/chat", "POST", {
          message: messageText,
        });

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.reply,
          products: response.products,
          sender: "bot",
        };

        setMessages((prev) => [...prev, botMessage]);
      } catch (error: unknown) {
        console.error("API request error:", error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: "Sorry, there was an error processing your request.",
          sender: "bot",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white rounded-full p-4 hover:bg-blue-700"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      ) : (
        // Backdrop
        <div className="chat-ui fixed top-0 left-0 bg-black/50 w-screen h-dvh flex items-end justify-end p-4">
          {/* Chat Window */}
          <div className="bg-white rounded-lg w-full max-w-lg h-[70vh] flex flex-col border border-gray-300 overflow-hidden">
            {/* ... (Header is unchanged) ... */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-800">
                    AI Assistant
                  </span>
                  <div className="text-xs text-gray-500 flex items-center">
                    <span className="inline-block w-1.5 h-1.5 mr-1 bg-green-500 rounded-full"></span>
                    Online
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded"
                    title="Clear chat"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
              {/* ... (Empty state is unchanged) ... */}
              {messages.length === 0 && (
                <div className="text-center text-gray-500 text-sm h-full flex flex-col justify-center items-center -mt-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="font-medium mb-1">Welcome to AI Chat!</div>
                  <div className="text-xs">
                    Ask me anything with markdown support
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`rounded-lg ${
                      msg.sender === "user"
                        ? "max-w-[85%] bg-blue-600 text-white px-4 py-3"
                        : "w-full" // Bot container is full-width
                    }`}
                  >
                    {/* --- 1. UPDATED RENDER LOGIC --- */}
                    {msg.sender === "bot" ? (
                      // Single container for the whole bot message
                      <div className="bg-white text-gray-800 border border-gray-200 rounded-lg overflow-hidden">
                        {/* A. Render the text part (if it exists) */}
                        {msg.text && (
                          <div className="px-4 py-3">
                            <MarkdownRenderer content={msg.text} />
                          </div>
                        )}

                        {/* B. Render the product cards (if they exist) */}
                        {msg.products && (
                          <>
                            {/* Add a separator if text also exists */}
                            {msg.text && <hr className="border-gray-200" />}

                            {/* Container for the cards with padding */}
                            <div className="p-3 space-y-2">
                              {msg.products.map((product) => (
                                <ProductCard
                                  key={product.id}
                                  product={product}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      // User message (plain text)
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {msg.text}
                      </div>
                    )}
                    {/* --- END UPDATED RENDER LOGIC --- */}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-lg max-w-[80%] border border-gray-200">
                    <span className="text-xs text-gray-500">
                      AI is typing...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ... (Input area is unchanged) ... */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex space-x-3">
                <input
                  autoFocus
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500 text-sm"
                  placeholder="Type your message..."
                  disabled={isTyping}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isTyping}
                  className={`px-4 py-3 rounded-lg ${
                    input.trim() && !isTyping
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-2 text-center">
                Powered by UshanAI{" "}
                <a
                  href="https://ushan.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-600"
                >
                  ushan.me
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
