"use client";

import { Plus, MessageSquare, X } from "lucide-react";
import { useState, useEffect } from "react";

function HistoryItem({ children }) {
  return (
    <a
      href="#"
      className="flex items-center gap-3 px-3 py-2 text-sm text-[#F8F9FA] rounded-md hover:bg-[#005A8D] transition-colors"
    >
      <MessageSquare className="w-4 h-4" />
      <span className="flex-grow truncate">{children}</span>
    </a>
  );
}

export default function Sidebar({ isOpen, onClose, setChatChannel, setChatHistory }) {
  const [history, setHistory] = useState([]);

  async function startNewChat() {
    const channel = `chat_${crypto.randomUUID()}`;
    setChatChannel(channel);
    setChatHistory([]);

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/greeting`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        admin: process.env.NEXT_PUBLIC_ADMIN,
        user_id: "demo_user", // TODO: generate/persist user_id
        chat_channel: channel,
      }),
    });

    setHistory((prev) => [`New Chat (${channel})`, ...prev]);
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
          className="flex-1 flex items-center justify-center gap-2 cursor-pointer p-2 bg-[#F8F9FA] text-[#004873] font-semibold rounded-md hover:bg-gray-200 transition-colors"
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

      <nav className="flex-1 flex flex-col gap-2">
        <p className="text-xs font-semibold text-gray-400 px-3">History</p>
        {history.length > 0 ? (
          history.map((chat, index) => <HistoryItem key={index}>{chat}</HistoryItem>)
        ) : (
          <p className="px-3 text-gray-300 text-sm">No chats yet</p>
        )}
      </nav>
    </div>
  );
}
