"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";

type MessageRole = "user" | "assistant";

type Message = {
  role: MessageRole;
  content: string;
};

export default function Chat() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! How can I assist you today?" }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);

    try {
      // Replace with your actual API endpoint
      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process your request. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-lg overflow-hidden shadow-lg">
      {/* Chat header */}
      <div className="bg-gray-800/90 backdrop-blur-sm px-4 py-3 border-b border-gray-700">
        <h2 className="text-gray-100 font-medium flex items-center">
          <Bot size={18} className="mr-2 text-blue-400" />
          PDF Assistant
        </h2>
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-950/70">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex items-start ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-blue-600/90 flex items-center justify-center mr-2 mt-1 flex-shrink-0 shadow-md">
                  <Bot size={16} className="text-white" />
                </div>
              )}
              
              <div
                className={`p-3 rounded-2xl ${
                  message.role === "user"
                    ? "bg-blue-600/90 text-white shadow-md"
                    : "bg-gray-800/80 text-gray-100 border border-gray-700 shadow-md"
                } max-w-[80%]`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
              
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-700/90 flex items-center justify-center ml-2 mt-1 flex-shrink-0 shadow-md">
                  <User size={16} className="text-gray-300" />
                </div>
              )}
            </div>
          ))}
          
          {loading && (
            <div className="flex items-start justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-600/90 flex items-center justify-center mr-2 mt-1 shadow-md">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-gray-800/80 text-gray-100 p-4 rounded-2xl max-w-[80%] border border-gray-700 shadow-md">
                <div className="flex space-x-2 items-center h-5">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="bg-gray-800/90 backdrop-blur-sm p-3 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about your PDF..."
            className="flex-1 bg-gray-900/90 text-gray-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 shadow-inner"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className={`bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center transition-colors shadow-md ${
              !query.trim() || loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

