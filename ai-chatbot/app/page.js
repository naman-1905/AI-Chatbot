"use client"

import { useState, useRef, useEffect } from "react";
import { CircleChevronRight} from "lucide-react";

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

    const newUserMessage = { sender: 'user', text: message };
    setChatHistory(prev => [...prev, newUserMessage]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      const aiResponse = { sender: 'ai', text: data.response || "No response received." };
      
      setChatHistory(prev => [...prev, aiResponse]);

    } catch (error) {
      const errorMessage = { sender: 'ai', text: "Sorry, I couldn't get a response. Please try again. If the issue persists, contact the developer here:- halfskirmish.com" };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChat();
    }
  };
  
// Half Skirmish Chat Bot Title Settings
  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center text-white font-sans p-4">
      <div className="w-full max-w-2xl flex flex-col flex-grow h-[90vh]">
        <h1 className="font-bold text-3xl text-center my-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          Half Skirmish Chat Bot
        </h1>

        <div ref={chatContainerRef} className="flex-grow mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700 overflow-y-auto space-y-4">
          {chatHistory.length === 0 ? (
             <p className="text-gray-400 text-center">Start the conversation!</p>
          ) : (
            chatHistory.map((chat, index) => (
              <div key={index} className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${chat.sender === 'user' ? 'bg-purple-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
                  <p className="whitespace-pre-wrap">{chat.text}</p>
                </div>
              </div>
            ))
          )}

          {/* Chat Loading Animation */}
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

        <div className="relative">
          <textarea
            id="chat-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message"
            rows={1}
            className="w-full p-3 pr-12 text-black bg-[#D9D9D9] border gray-400 rounded-lg resize-none focus:outline-none focus:ring-2 focus:gradient-radial from-[#00A1FF] to-[#006199] transition-shadow"
          />
          <button
            onClick={handleChat}
            disabled={loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-[#004873] rounded-full hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center h-8 w-8"
            aria-label="Send chat message"
          >
            <CircleChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
