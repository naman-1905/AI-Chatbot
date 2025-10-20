"use client";

import {
  Plus,
  MessageSquare,
  X,
  RefreshCw,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { saveChatHistory, loadChatHistory, clearAllChats } from "../utils/chatStore";

function HistoryItem({ chatChannel, totalMessages, onSelect, onDelete, isActive }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setDeleting(true);
    try {
      await onDelete(chatChannel);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting chat:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors group ${
        isActive ? "bg-[#005A8D] text-white" : "text-[#F8F9FA] hover:bg-[#005A8D]"
      }`}
    >
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          if (!showDeleteConfirm) onSelect(chatChannel);
        }}
        className="flex items-center gap-3 flex-1 min-w-0 mr-2"
      >
        <MessageSquare className="w-4 h-4 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm">{chatChannel}</div>
          <div className="text-xs text-gray-400">
            {totalMessages} message{totalMessages !== 1 ? "s" : ""}
          </div>
        </div>
      </a>

      {showDeleteConfirm ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleCancel}
            className="px-2 py-1 text-xs bg-gray-600 text-white hover:bg-gray-500 rounded"
            title="Cancel"
          >
            ✕
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-500 rounded disabled:opacity-50"
            title="Confirm delete"
          >
            {deleting ? "..." : "✓"}
          </button>
        </div>
      ) : (
        <button
          onClick={handleDelete}
          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
          title="Delete chat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

const Sidebar = forwardRef(function Sidebar(
  {
    isOpen,
    onClose,
    setChatChannel,
    setChatHistory,
    currentChatChannel,
    initialChatChannel,
    isInitialized,
    onChatDeleted,
  },
  ref
) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  useImperativeHandle(ref, () => ({
    removeChatFromHistory: (chatChannel) => {
      setHistory((prev) => prev.filter((item) => item.chat_channel !== chatChannel));
    },
    refreshHistory: () => fetchChatHistory(),
  }));

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    if (initialChatChannel && isInitialized) {
      setHistory((prev) => {
        const chatMap = new Map();
        prev.forEach((chat) => {
          if (chat.chat_channel) chatMap.set(chat.chat_channel, chat);
        });

        if (!chatMap.has(initialChatChannel)) {
          chatMap.set(initialChatChannel, {
            chat_channel: initialChatChannel,
            total_messages: 1,
            word_count: 50,
            messages: [],
          });
        }

        return Array.from(chatMap.values()).sort((a, b) => b.total_messages - a.total_messages);
      });
    }
  }, [initialChatChannel, isInitialized]);

  async function fetchChatHistory() {
    setLoading(true);
    setError(null);

    try {
      const headers = {};

      if (process.env.NEXT_PUBLIC_API_USERNAME && process.env.NEXT_PUBLIC_API_PASSWORD) {
        const credentials = btoa(
          `${process.env.NEXT_PUBLIC_API_USERNAME}:${process.env.NEXT_PUBLIC_API_PASSWORD}`
        );
        headers["Authorization"] = `Basic ${credentials}`;
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/channels/list`;

      try {
        const response = await fetch(apiUrl, { method: "GET", headers });

        if (response.ok) {
          const apiData = await response.json();
          const localChats = JSON.parse(localStorage.getItem("chatHistory") || "{}");
          const chatMap = new Map();

          if (Array.isArray(apiData)) {
            apiData.forEach((channel) => {
              if (channel.chat_channel) {
                chatMap.set(channel.chat_channel, {
                  chat_channel: channel.chat_channel,
                  total_messages: channel.message_count || 0,
                  word_count: channel.word_count || 0,
                  messages: localChats[channel.chat_channel] || [],
                });
              }
            });
          }

          Object.entries(localChats).forEach(([channel, messages]) => {
            if (channel && Array.isArray(messages) && !chatMap.has(channel)) {
              chatMap.set(channel, {
                chat_channel: channel,
                total_messages: messages.length,
                word_count: messages.reduce((sum, m) => sum + (m.text?.length || 0), 0),
                messages,
              });
            }
          });

          setHistory(Array.from(chatMap.values()).sort((a, b) => b.total_messages - a.total_messages));
        } else {
          throw new Error("API not available");
        }
      } catch {
        const localChats = JSON.parse(localStorage.getItem("chatHistory") || "{}");
        const localHistory = Object.entries(localChats)
          .filter(([channel, messages]) => channel && Array.isArray(messages))
          .map(([channel, messages]) => ({
            chat_channel: channel,
            total_messages: messages.length,
            word_count: messages.reduce((sum, m) => sum + (m.text?.length || 0), 0),
            messages,
          }))
          .sort((a, b) => b.total_messages - a.total_messages);

        setHistory(localHistory);
      }
    } catch (err) {
      console.error("Error fetching chat history:", err);
      setError(err.message);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  async function refreshHistory() {
    setRefreshing(true);
    await fetchChatHistory();
    setRefreshing(false);
  }

  async function deleteChatHistory(chatChannel) {
    try {
      const headers = {};

      if (process.env.NEXT_PUBLIC_API_USERNAME && process.env.NEXT_PUBLIC_API_PASSWORD) {
        const credentials = btoa(
          `${process.env.NEXT_PUBLIC_API_USERNAME}:${process.env.NEXT_PUBLIC_API_PASSWORD}`
        );
        headers["Authorization"] = `Basic ${credentials}`;
      }

      try {
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/channels/delete?client_id=${encodeURIComponent(
          chatChannel
        )}`;
        const response = await fetch(apiUrl, { method: "DELETE", headers });
        if (!response.ok) console.warn("API deletion failed, continuing with local deletion");
      } catch {}

      const localChats = JSON.parse(localStorage.getItem("chatHistory") || "{}");
      if (localChats[chatChannel]) {
        delete localChats[chatChannel];
        localStorage.setItem("chatHistory", JSON.stringify(localChats));
      }

      setHistory((prev) => prev.filter((item) => item.chat_channel !== chatChannel));

      if (currentChatChannel === chatChannel && onChatDeleted) onChatDeleted(chatChannel);
    } catch (err) {
      console.error("Error deleting chat history:", err);
      setError(`Failed to delete chat: ${err.message}`);
      throw err;
    }
  }

  async function deleteAllChats() {
    try {
      const success = clearAllChats();
      if (success) {
        setHistory([]);
        setShowDeleteAllConfirm(false);
        if (onChatDeleted) onChatDeleted(currentChatChannel);
      } else {
        throw new Error("Failed to clear chats from storage");
      }
    } catch (err) {
      console.error("Error deleting all chats:", err);
      setError(`Failed to delete all chats: ${err.message}`);
    }
  }

  function loadChatChannel(chatChannel) {
    setChatChannel(chatChannel);
    const localMessages = loadChatHistory(chatChannel);
    setChatHistory(localMessages.length > 0 ? localMessages : []);
  }

  function startNewChat() {
    const channel = `chat_${crypto.randomUUID()}`;
    setChatChannel(channel);

    const greeting = {
      sender: "ai",
      text: "Hey there! I'm Astro Bot, Naman's personal AI assistant. I'm here to chat about Naman's projects, skills, and experience. What brings you here today?",
      timestamp: new Date().toISOString(),
      bot_name: "Astro Bot",
    };

    setChatHistory([greeting]);
    saveChatHistory(channel, [greeting]);

    setHistory((prev) => {
      const chatMap = new Map(prev.map((chat) => [chat.chat_channel, chat]));
      chatMap.set(channel, {
        chat_channel: channel,
        total_messages: 1,
        word_count: greeting.text.length,
        messages: [greeting],
      });
      return Array.from(chatMap.values()).sort((a, b) => b.total_messages - a.total_messages);
    });
  }

  return (
    <div
      className={`
        bg-[#004873] text-[#F8F9FA] flex flex-col
        w-80 h-full p-4 transition-transform duration-300 ease-in-out flex-shrink-0 fixed z-30
        md:relative md:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full md:-ml-80"}
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

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 px-3">History</p>
        <div className="flex items-center gap-1">
          <button
            onClick={refreshHistory}
            disabled={refreshing}
            className="p-1 rounded hover:bg-[#005A8D] transition-colors disabled:opacity-50"
            aria-label="Refresh history"
            title="Refresh from API"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setShowDeleteAllConfirm(true)}
            disabled={history.length === 0}
            className="p-1 rounded hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Delete all chats"
            title="Delete All Chats"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-2 overflow-y-auto">
        {error && (
          <div className="px-3 py-2 text-xs text-red-300 bg-red-900/30 rounded flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {error}
              <button onClick={() => setError(null)} className="ml-2 text-red-200 hover:text-white">
                ×
              </button>
            </div>
          </div>
        )}

        {showDeleteAllConfirm && (
          <div className="px-3 py-3 text-xs bg-red-900/20 border border-red-500/30 rounded">
            <p className="text-red-200 mb-3 font-semibold">Delete all chats?</p>
            <p className="text-gray-300 mb-3 text-xs">
              This will permanently delete all chat history from local storage. This action cannot
              be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                className="flex-1 px-3 py-1.5 bg-gray-600 text-white hover:bg-gray-500 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={deleteAllChats}
                className="flex-1 px-3 py-1.5 bg-red-600 text-white hover:bg-red-500 rounded text-xs font-semibold"
              >
                Delete All
              </button>
            </div>
          </div>
        )}

        {loading && history.length === 0 ? (
          <div className="px-3 text-gray-300 text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : history.length > 0 ? (
          history
            .filter(
              (chatItem, index, arr) =>
                arr.findIndex((item) => item.chat_channel === chatItem.chat_channel) === index
            )
            .map((chatItem) => (
              <HistoryItem
                key={chatItem.chat_channel}
                chatChannel={chatItem.chat_channel}
                totalMessages={chatItem.total_messages}
                onSelect={loadChatChannel}
                onDelete={deleteChatHistory}
                isActive={currentChatChannel === chatItem.chat_channel}
              />
            ))
        ) : (
          <p className="px-3 text-gray-300 text-sm">No chats yet</p>
        )}
      </nav>

      <div className="mt-2 px-3 py-1 text-xs text-gray-400 border-t border-gray-600">
        <div className="flex items-center justify-between">
          <span>API: {process.env.NEXT_PUBLIC_API_URL ? "🟢 Connected" : "🔴 Not configured"}</span>
          <span className="text-gray-500">
            {history.length} chat{history.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
});

export default Sidebar;
