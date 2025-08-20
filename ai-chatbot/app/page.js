"use client";

import { useState, useRef, useEffect } from "react";
import { CircleChevronRight } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleChat = async () => {
    if (!message.trim() || loading) return;

    const newUserMessage = { sender: "user", text: message };
    setChatHistory((prev) => [...prev, newUserMessage]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      const aiMessage = { sender: "ai", text: "" };
      setChatHistory((prev) => [...prev, aiMessage]); // placeholder

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        aiText += chunk;
        setChatHistory((prev) => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = { sender: "ai", text: aiText };
          return newHistory;
        });
      }
    } catch (error) {
      const errorMessage = {
        sender: "ai",
        text: (
          <>
            Sorry, I couldn't get a response. Please try again. If the issue
            persists, contact Naman through his website:{" "}
            <Link
              className="font-bold"
              href="https://halfskirmish.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              halfskirmish.com
            </Link>
          </>
        ),
      };
      setChatHistory((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChat();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center text-gray-800 font-sans p-4">
      <div className="w-full max-w-2xl flex flex-col flex-grow h-[90vh]">
        <h1 className="font-bold text-3xl text-center my-6 bg-clip-text bg-black">
          <span className="px-6 py-2 bg-white rounded-2xl">Astra-Bot</span>
        </h1>

        <div
          ref={chatContainerRef}
          className="flex-grow mb-4 p-4 bg-[#F8F9FA] rounded-lg overflow-y-auto space-y-4"
        >
          {chatHistory.length === 0 ? (
            <p className="text-[#004873] text-center">
              Hi there, Welcome to Naman's AI Chatbot, I am here to answer your
              questions.
            </p>
          ) : (
            chatHistory.map((chat, index) => (
              <div
                key={index}
                className={`flex ${
                  chat.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${
                    chat.sender === "user"
                      ? "bg-[#004873] text-white rounded-br-none"
                      : "bg-white text-gray-800 rounded-bl-none"
                  }`}
                >
                  {typeof chat.text === "string" ? (
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => (
                        <p className="whitespace-pre-wrap" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="list-disc ml-6" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-bold" {...props} />
                      ),
                    }}
                  >
                    {chat.text}
                  </ReactMarkdown>
                  ) : (
                    chat.text
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl bg-gray-700 rounded-bl-none">
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 bg-white rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                  <span className="h-2 w-2 bg-white rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                  <span className="h-2 w-2 bg-white rounded-full animate-pulse"></span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative flex items-center">
          <textarea
            id="chat-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message"
            rows={1}
            className="w-full px-4 py-4 pr-14 text-black bg-[#F5F5F5] rounded-lg resize-none focus:outline-none"
          />
          <button
            onClick={handleChat}
            disabled={loading}
            className="absolute right-3 flex items-center justify-center h-10 w-10 bg-white text-[#004873] rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00A1FF] hover:bg-[#004873] hover:text-white disabled:bg-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-all"
            aria-label="Send chat message"
          >
            <CircleChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
