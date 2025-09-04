"use client";

import { Plus, MessageSquare, X, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

function HistoryItem({ chatChannel, totalMessages, onSelect, isActive }) {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onSelect(chatChannel);
      }}
      className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
        isActive 
          ? "bg-[#005A8D] text-white" 
          : "text-[#F8F9FA] hover:bg-[#005A8D]"
      }`}
    >
      <MessageSquare className="w-4 h-4" />
      <div className="flex-grow truncate">
        <div className="truncate">{chatChannel}</div>
        <div className="text-xs text-gray-400">
          {totalMessages} message{totalMessages !== 1 ? 's' : ''}
        </div>
      </div>
    </a>
  );
}

export default function Sidebar({ 
  isOpen, 
  onClose, 
  setChatChannel, 
  setChatHistory, 
  currentChatChannel,
  initialChatChannel,
  isInitialized
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch chat history on component mount
  useEffect(() => {
    fetchChatHistory();
  }, []);

  // Add the initial chat channel to history when it's created
  useEffect(() => {
    if (initialChatChannel && isInitialized) {
      // Check if this channel is already in history
      const exists = history.some(item => item.chat_channel === initialChatChannel);
      if (!exists) {
        const newChatItem = {
          chat_channel: initialChatChannel,
          total_messages: 1, // Initial greeting message
          word_count: 50, // Approximate
          messages: []
        };
        setHistory(prev => [newChatItem, ...prev]);
      }
    }
  }, [initialChatChannel, isInitialized, history]);

  async function fetchChatHistory() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin: process.env.NEXT_PUBLIC_ADMIN,
          chat_channel: "", // Empty string to get all channels for this user
          user_id: "demo_user", // TODO: generate/persist user_id
          limit: 50
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // If the API returns multiple chat channels, we'll need to handle that
        // For now, assuming we need to make separate calls for each channel
        // or the API returns a list of channels
        
        // This is a placeholder - you might need to adjust based on actual API behavior
        // If the API returns all user's chat channels in one call:
        if (Array.isArray(data.chat_channels)) {
          setHistory(data.chat_channels);
        } else {
          // If it's a single channel response, we might need a different endpoint
          // or make multiple calls to get all user channels
          console.warn("API response structure not as expected for getting all user channels");
          setHistory([]);
        }
      } else {
        setError("Failed to fetch chat history");
      }
    } catch (err) {
      console.error("Error fetching chat history:", err);
      setError("Failed to load chat history");
    } finally {
      setLoading(false);
    }
  }

  async function loadChatChannel(chatChannel) {
    setLoading(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin: process.env.NEXT_PUBLIC_ADMIN,
          chat_channel: chatChannel,
          user_id: "demo_user", // TODO: generate/persist user_id
          limit: 50
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setChatChannel(chatChannel);
        setChatHistory(data.messages || []);
      } else {
        setError("Failed to load chat messages");
      }
    } catch (err) {
      console.error("Error loading chat channel:", err);
      setError("Failed to load chat messages");
    } finally {
      setLoading(false);
    }
  }

  async function startNewChat() {
    const channel = `chat_${crypto.randomUUID()}`;
    setChatChannel(channel);
    setChatHistory([]);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/greeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin: process.env.NEXT_PUBLIC_ADMIN,
          user_id: "demo_user", // TODO: generate/persist user_id
          chat_channel: channel,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Set the greeting message as the first chat message
        const greetingMessage = {
          sender: "ai",
          text: data.data.greeting,
          timestamp: data.data.timestamp,
          bot_name: data.data.bot_name
        };
        
        setChatHistory([greetingMessage]);

        // Add the new chat to history
        const newChatItem = {
          chat_channel: channel,
          total_messages: 1,
          word_count: data.data.greeting.length,
          messages: [greetingMessage]
        };
        
        setHistory((prev) => [newChatItem, ...prev]);
      } else {
        throw new Error("Failed to get greeting from server");
      }
    } catch (err) {
      console.error("Error starting new chat:", err);
      setError("Failed to start new chat");
      
      // Fallback greeting
      const fallbackGreeting = {
        sender: "ai",
        text: "Hello! I'm AstroBot. How can I help you today?",
        timestamp: new Date().toISOString()
      };
      setChatHistory([fallbackGreeting]);

      // Add fallback chat to history
      const newChatItem = {
        chat_channel: channel,
        total_messages: 1,
        word_count: fallbackGreeting.text.length,
        messages: [fallbackGreeting]
      };
      
      setHistory((prev) => [newChatItem, ...prev]);
    }
  }

  return (
    <div
      className={`
        bg-[#004873] text-[#F8F9FA] flex flex-col
        w-64 h-full p-4 transition-transform duration-300 ease-in-out flex-shrink-0 fixed z-30
        md:relative md:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full md:-ml-64"}
      `}
    >
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={startNewChat}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 cursor-pointer p-2 bg-[#F8F9FA] text-[#004873] font-semibold rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          New Chat
        </button>

        <button
          onClick={onClose}
          className="p-2 ml-2 rounded-md hover:bg-[#005A8D] transition-colors md:hidden"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 px-3">History</p>
        <button
          onClick={fetchChatHistory}
          disabled={loading}
          className="p-1 rounded hover:bg-[#005A8D] transition-colors disabled:opacity-50"
          aria-label="Refresh history"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {error && (
          <div className="px-3 py-2 text-xs text-red-300 bg-red-900/30 rounded">
            {error}
          </div>
        )}
        
        {loading && history.length === 0 ? (
          <p className="px-3 text-gray-300 text-sm">Loading...</p>
        ) : history.length > 0 ? (
          history.map((chatItem, index) => (
            <HistoryItem 
              key={`${chatItem.chat_channel}-${index}`} // More unique key
              chatChannel={chatItem.chat_channel}
              totalMessages={chatItem.total_messages}
              onSelect={loadChatChannel}
              isActive={currentChatChannel === chatItem.chat_channel}
            />
          ))
        ) : (
          <p className="px-3 text-gray-300 text-sm">No chats yet</p>
        )}
      </nav>
    </div>
  );
}