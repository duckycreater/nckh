import React, { useState, useEffect, useRef } from "react";
import { Bot, X, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function Chatbot({ currentUser }: { currentUser?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Xin chào! Mình là **Robot Siêu Cấp Xanh** 🤖. Bạn có câu hỏi gì về bảo vệ môi trường, phân loại rác thải không? Hãy hỏi mình nhé!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: input },
    ];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          nickname: currentUser
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Lỗi: ${data.error}` },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Lỗi kết nối đến server." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 overflow-hidden flex flex-col mb-4 border border-gray-100 h-[32rem]">
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-4 flex justify-between items-center">
            <div className="font-semibold flex items-center gap-2">
              <span className="bg-white text-emerald-600 p-1.5 rounded-full inline-flex">
                <Bot size={20} />
              </span>
              Robot Siêu Cấp Xanh
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-emerald-100 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mr-2 flex-shrink-0 border border-emerald-200">
                    <Bot size={18} />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${msg.role === "user" ? "bg-emerald-600 text-white rounded-br-none shadow-sm" : "bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-100"}`}
                >
                  {msg.role === "user" ? (
                    msg.content
                  ) : (
                    <div className="prose prose-sm prose-emerald max-w-none text-gray-800">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mr-2 flex-shrink-0 border border-emerald-200">
                  <Bot size={18} />
                </div>
                <div className="bg-white text-gray-800 rounded-2xl px-4 py-3 rounded-bl-none shadow-sm border border-gray-100 flex gap-1">
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex bg-gray-100 rounded-full overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition-all border border-transparent focus-within:border-emerald-500">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Nhập câu hỏi..."
                className="flex-1 bg-transparent px-4 py-3 focus:outline-none text-sm text-gray-700"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="pr-4 pl-2 text-emerald-600 disabled:text-gray-400"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-tr from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 relative"
        >
          <Bot size={28} />
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
        </button>
      )}
    </div>
  );
}
