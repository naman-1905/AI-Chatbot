"use client";

import { Plus, MessageSquare, X, RefreshCw, Trash2 } from "lucide-react";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { saveChatHistory, loadChatHistory } from "../utils/chatStore";

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
      console.error('Error deleting chat:', error);
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
        isActive
          ? "bg-[#005A8D] text-white"
          : "text-[#F8F9FA] hover:bg-[#005A8D]"
      }`}
    >
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          if (!showDeleteConfirm) {
            onSelect(chatChannel);
          }
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
            {deleting ? '...' : '✓'}
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

const Sidebar = forwardRef(function Sidebar({
  isOpen,
  onClose,
  setChatChannel,
  setChatHistory,
  currentChatChannel,
  initialChatChannel,
  isInitialized,
  onChatDeleted,
}, ref) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    removeChatFromHistory: (chatChannel) => {
      setHistory((prev) => prev.filter(item => item.chat_channel !== chatChannel));
    },
    refreshHistory: () => {
      fetchChatHistory();
    }
  }));

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    if (initialChatChannel && isInitialized) {
      setHistory((prev) => {
        const chatMap = new Map();
        
        // Add existing chats
        prev.forEach(chat => {
          if (chat.chat_channel) {
            chatMap.set(chat.chat_channel, chat);
          }
        });
        
        // Add initial chat if it doesn't exist
        if (!chatMap.has(initialChatChannel)) {
          chatMap.set(initialChatChannel, {
            chat_channel: initialChatChannel,
            total_messages: 1,
            word_count: 50,
            messages: [],
          });
        }
        
        // Convert back to array and sort
        return Array.from(chatMap.values())
          .sort((a, b) => b.total_messages - a.total_messages);
      });
    }
  }, [initialChatChannel, isInitialized]);

  async function fetchChatHistory() {
    setLoading(true);
    setError(null);

    try {
      // For now, just load from localStorage since the API structure is different
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
        }))
        .sort((a, b) => b.total_messages - a.total_messages);
      
      setHistory(localHistory);
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
      // Remove from local storage
      const localChats = JSON.parse(localStorage.getItem("chatHistory") || "{}");
      if (localChats[chatChannel]) {
        delete localChats[chatChannel];
        localStorage.setItem("chatHistory", JSON.stringify(localChats));
      }

      // Remove from history state
      setHistory((prev) => prev.filter(item => item.chat_channel !== chatChannel));

      // If this was the current chat, notify parent to handle it
      if (currentChatChannel === chatChannel && onChatDeleted) {
        onChatDeleted(chatChannel);
      }

      console.log(`Chat history deleted locally`);
      
    } catch (err) {
      console.error("Error deleting chat history:", err);
      setError(`Failed to delete chat: ${err.message}`);
      throw err;
    }
  }

  async function loadChatChannel(chatChannel) {
    setChatChannel(chatChannel);

    // Load from local storage
    const localMessages = loadChatHistory(chatChannel);
    if (localMessages.length > 0) {
      setChatHistory(localMessages);
      return;
    }

    // If not found, show empty chat
    setChatHistory([]);
  }

  async function startNewChat() {
    const channel = `chat_${crypto.randomUUID()}`;
    setChatChannel(channel);
    setChatHistory([]);

    const fallbackGreeting = {
      sender: "ai",
      text: "Hello! I'm your assistant. How can I help you today?",
      timestamp: new Date().toISOString(),
      bot_name: "Assistant",
    };
    
    setChatHistory([fallbackGreeting]);
    saveChatHistory(channel, [fallbackGreeting]);

    // Add to history (avoid duplicates)
    setHistory((prev) => {
      const chatMap = new Map();
      
      // Add existing chats
      prev.forEach(chat => {
        if (chat.chat_channel) {
          chatMap.set(chat.chat_channel, chat);
        }
      });
      
      // Add or update the fallback chat
      chatMap.set(channel, {
        chat_channel: channel,
        total_messages: 1,
        word_count: fallbackGreeting.text.length,
        messages: [fallbackGreeting],
      });
      
      // Convert back to array and sort
      return Array.from(chatMap.values())
        .sort((a, b) => b.total_messages - a.total_messages);
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
              arr.findIndex(item => item.chat_channel === chatItem.chat_channel) === index
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

      {/* API Status Indicator */}
      <div className="mt-2 px-3 py-1 text-xs text-gray-400 border-t border-gray-600">
        API: {process.env.NEXT_PUBLIC_API_URL ? '🟢 Connected' : '🔴 Not configured'}
      </div>
    </div>
  );
});

export default Sidebar;