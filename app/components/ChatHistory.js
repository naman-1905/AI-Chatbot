"use client";

import { Plus, MessageSquare, X } from "lucide-react";
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            admin: process.env.NEXT_PUBLIC_ADMIN,
            chat_channel: "",
            user_id: "demo_user",
            limit: 50,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let merged = [];

      if (data.success && Array.isArray(data.chat_channels)) {
        merged = data.chat_channels;
      }

      const localChats = JSON.parse(localStorage.getItem("chatHistory") || "{}");
      for (const [channel, messages] of Object.entries(localChats)) {
        const exists = merged.some((item) => item.chat_channel === channel);
        if (!exists) {
          merged.push({
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

      setHistory(merged);
    } catch (err) {
      console.error("Error fetching chat history:", err);
      setError("Failed to load chat history");
    } finally {
      setLoading(false);
    }
  }

  async function loadChatChannel(chatChannel) {
    setChatChannel(chatChannel);

    const localMessages = loadChatHistory(chatChannel);
    if (localMessages.length > 0) {
      setChatHistory(localMessages);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/history`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            admin: process.env.NEXT_PUBLIC_ADMIN,
            chat_channel: chatChannel,
            user_id: "demo_user",
            limit: 50,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setChatHistory(data.messages || []);
        saveChatHistory(chatChannel, data.messages || []);
      }
    } catch (err) {
      console.error("Error loading chat channel:", err);
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            admin: process.env.NEXT_PUBLIC_ADMIN,
            user_id: "demo_user",
            chat_channel: channel,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let greetingMessage;

      if (data.success) {
        greetingMessage = {
          sender: "ai",
          text: data.data.greeting,
          timestamp: data.data.timestamp,
          bot_name: data.data.bot_name,
        };
      } else {
        throw new Error("Failed to get greeting");
      }

      setChatHistory([greetingMessage]);

      const newChatItem = {
        chat_channel: channel,
        total_messages: 1,
        word_count: greetingMessage.text.length,
        messages: [greetingMessage],
      };

      setHistory((prev) => {
        const exists = prev.some((item) => item.chat_channel === channel);
        if (exists) return prev;
        return [newChatItem, ...prev];
      });
    } catch (err) {
      console.error("Error starting new chat:", err);
      setError("Failed to start new chat");

      const fallbackGreeting = {
        sender: "ai",
        text: "Hello! I'm AstroBot. How can I help you today?",
        timestamp: new Date().toISOString(),
      };
      setChatHistory([fallbackGreeting]);

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

      {/* History header without reload button */}
      <div className="flex items-center mb-2">
        <p className="text-xs font-semibold text-gray-400 px-3">History</p>
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
          history.map((chatItem) => (
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
    </div>
  );
}
