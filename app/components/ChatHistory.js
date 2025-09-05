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

      // Merge with local storage and ensure unique keys
      const localChats = JSON.parse(localStorage.getItem("chatHistory") || "{}");
      const chatMap = new Map();

      // First, add API chats to the map
      apiChats.forEach(chat => {
        if (chat.chat_channel) {
          chatMap.set(chat.chat_channel, chat);
        }
      });

      // Then, add local chats that aren't in API response
      for (const [channel, messages] of Object.entries(localChats)) {
        if (!chatMap.has(channel) && Array.isArray(messages) && messages.length > 0) {
          chatMap.set(channel, {
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

      // Convert map to array and sort
      const mergedHistory = Array.from(chatMap.values())
        .filter(chat => chat.chat_channel) // Ensure we have valid chat_channel
        .sort((a, b) => b.total_messages - a.total_messages);

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

  async function deleteChatHistory(chatChannel) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/history/${process.env.NEXT_PUBLIC_ADMIN}/demo_user/${encodeURIComponent(chatChannel)}`,
        {
          method: "DELETE",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete chat: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "Failed to delete chat history");
      }

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

      console.log(`Chat history deleted: ${data.data.messages_deleted} messages`);
      
    } catch (err) {
      console.error("Error deleting chat history:", err);
      setError(`Failed to delete chat: ${err.message}`);
      throw err; // Re-throw so the UI can handle the error state
    }
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

      // Add to history (avoid duplicates)
      setHistory((prev) => {
        const chatMap = new Map();
        
        // Add existing chats
        prev.forEach(chat => {
          if (chat.chat_channel) {
            chatMap.set(chat.chat_channel, chat);
          }
        });
        
        // Add or update the new chat
        chatMap.set(channel, {
          chat_channel: channel,
          total_messages: 1,
          word_count: greetingMessage.text.length,
          messages: [greetingMessage],
        });
        
        // Convert back to array and sort
        return Array.from(chatMap.values())
          .sort((a, b) => b.total_messages - a.total_messages);
      });

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
              // Additional safety check: ensure no duplicates even if our logic missed something
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