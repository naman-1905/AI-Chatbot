"use client";

import { Plus, MessageSquare, X, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { saveChatHistory, loadChatHistory } from "../utils/chatStore";

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
          {totalMessages} message{totalMessages !== 1 ? "s" : ""}
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
  isInitialized,
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    if (initialChatChannel && isInitialized) {
      setHistory((prev) => {
        const exists = prev.some(
          (item) => item.chat_channel === initialChatChannel
        );
        if (exists) return prev;

        return [
          {
            chat_channel: initialChatChannel,
            total_messages: 1,
            word_count: 50,
            messages: [],
          },
          ...prev,
        ];
      });
    }
  }, [initialChatChannel, isInitialized]);

  async function fetchChatHistory() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/history`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            admin: process.env.NEXT_PUBLIC_ADMIN,
            chat_channel: "", // Empty string to get all channels
            user_id: "demo_user",
            limit: 50,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "API returned unsuccessful response");
      }

      // Process API response
      let apiChats = [];
      if (data.messages && data.messages.length > 0) {
        // If we got messages for a specific channel
        apiChats = [{
          chat_channel: data.chat_channel || "default",
          total_messages: data.total_messages || data.messages.length,
          word_count: data.word_count || 0,
          messages: data.messages
        }];
      } else if (data.chat_channels && Array.isArray(data.chat_channels)) {
        // If we got multiple channels
        apiChats = data.chat_channels;
      }

      // Merge with local storage
      const localChats = JSON.parse(localStorage.getItem("chatHistory") || "{}");
      let mergedHistory = [...apiChats];

      // Add local chats that aren't in API response
      for (const [channel, messages] of Object.entries(localChats)) {
        const exists = mergedHistory.some((item) => item.chat_channel === channel);
        if (!exists && Array.isArray(messages) && messages.length > 0) {
          mergedHistory.push({
            chat_channel: channel,
            total_messages: messages.length,
            word_count: messages.reduce(
              (sum, m) => sum + (m.text?.length || 0),
              0
            ),
            messages,
          });
        }
      }

      // Sort by most recent activity (you might want to add a last_updated field)
      mergedHistory.sort((a, b) => b.total_messages - a.total_messages);

      setHistory(mergedHistory);
    } catch (err) {
      console.error("Error fetching chat history:", err);
      setError(err.message);
      
      // Fallback to local storage only
      try {
        const localChats = JSON.parse(localStorage.getItem("chatHistory") || "{}");
        const localHistory = Object.entries(localChats)
          .filter(([channel, messages]) => channel && Array.isArray(messages))
          .map(([channel, messages]) => ({
            chat_channel: channel,
            total_messages: messages.length,
            word_count: messages.reduce(
              (sum, m) => sum + (m.text?.length || 0),
              0
            ),
            messages,
          }));
        setHistory(localHistory);
      } catch (localErr) {
        console.error("Error loading local chat history:", localErr);
        setHistory([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshHistory() {
    setRefreshing(true);
    await fetchChatHistory();
    setRefreshing(false);
  }

  async function loadChatChannel(chatChannel) {
    setChatChannel(chatChannel);

    // First try local storage
    const localMessages = loadChatHistory(chatChannel);
    if (localMessages.length > 0) {
      setChatHistory(localMessages);
      return;
    }

    // If not found locally, try API
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/history`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            admin: process.env.NEXT_PUBLIC_ADMIN,
            chat_channel: chatChannel,
            user_id: "demo_user",
            limit: 50,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load chat: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.messages) {
        setChatHistory(data.messages);
        // Save to local storage for future use
        saveChatHistory(chatChannel, data.messages);
      } else {
        console.warn("No messages found for channel:", chatChannel);
        setChatHistory([]);
      }
    } catch (err) {
      console.error("Error loading chat channel:", err);
      setError(`Failed to load chat: ${err.message}`);
      setChatHistory([]);
    } finally {
      setLoading(false);
    }
  }

  async function startNewChat() {
    const channel = `chat_${crypto.randomUUID()}`;
    setChatChannel(channel);
    setChatHistory([]);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/greeting`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            admin: process.env.NEXT_PUBLIC_ADMIN,
            user_id: "demo_user",
            chat_channel: channel,
          }),
        }
      );

      let greetingMessage;

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data) {
          greetingMessage = {
            sender: "ai",
            text: data.data.greeting || "Hello! How can I help you today?",
            timestamp: data.data.timestamp || new Date().toISOString(),
            bot_name: data.data.bot_name || "Assistant",
          };
        } else {
          throw new Error("Invalid greeting response");
        }
      } else {
        throw new Error(`Greeting API failed: ${response.status}`);
      }

      setChatHistory([greetingMessage]);
      saveChatHistory(channel, [greetingMessage]);

      // Add to history
      const newChatItem = {
        chat_channel: channel,
        total_messages: 1,
        word_count: greetingMessage.text.length,
        messages: [greetingMessage],
      };

      setHistory((prev) => [newChatItem, ...prev]);

    } catch (err) {
      console.error("Error starting new chat:", err);
      
      // Fallback greeting
      const fallbackGreeting = {
        sender: "ai",
        text: "Hello! I'm your assistant. How can I help you today?",
        timestamp: new Date().toISOString(),
        bot_name: "Assistant",
      };
      
      setChatHistory([fallbackGreeting]);
      saveChatHistory(channel, [fallbackGreeting]);

      setHistory((prev) => [
        {
          chat_channel: channel,
          total_messages: 1,
          word_count: fallbackGreeting.text.length,
          messages: [fallbackGreeting],
        },
        ...prev,
      ]);
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
          className="flex-1 flex items-center justify-center gap-2 cursor-pointer p-2 bg-[#F8F9FA] text-[#004873] font-semibold rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* History header with refresh button */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 px-3">History</p>
        <button
          onClick={refreshHistory}
          disabled={refreshing}
          className="p-1 rounded hover:bg-[#005A8D] transition-colors disabled:opacity-50"
          aria-label="Refresh history"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-2 overflow-y-auto">
        {error && (
          <div className="px-3 py-2 text-xs text-red-300 bg-red-900/30 rounded">
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-2 text-red-200 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {loading && history.length === 0 ? (
          <div className="px-3 text-gray-300 text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : history.length > 0 ? (
          history
            .filter((chatItem, index, arr) => 
              // Additional safety check: ensure no duplicates even if our logic missed something
              arr.findIndex(item => item.chat_channel === chatItem.chat_channel) === index
            )
            .map((chatItem) => (
              <HistoryItem
                key={chatItem.chat_channel}
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

      {/* API Status Indicator */}
      <div className="mt-2 px-3 py-1 text-xs text-gray-400 border-t border-gray-600">
        API: {process.env.NEXT_PUBLIC_API_URL ? '🟢 Connected' : '🔴 Not configured'}
      </div>
    </div>
  );
}