"use client";

import { useState, useRef, useEffect } from "react";
import { CircleChevronRight, Menu, PanelLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import Streamdown from "streamdown";
import Sidebar from "./ChatHistory";
import { saveChatHistory } from "../utils/chatStore";

export default function Home() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatChannel, setChatChannel] = useState(""); 
  const [userId] = useState("demo_user"); // TODO: generate/persist user_id
  const [isInitialized, setIsInitialized] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const chatContainerRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auto-start chat when component mounts
  useEffect(() => {
    const initializeChat = async () => {
      if (isInitialized) return; // Prevent multiple initializations
      
      try {
        const channel = `chat_${crypto.randomUUID()}`;
        setChatChannel(channel);
        setLoading(true);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/greeting`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            admin: process.env.NEXT_PUBLIC_ADMIN,
            user_id: userId,
            chat_channel: channel,
          }),
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        
        if (data.success) {
          const greetingMessage = {
            sender: "ai",
            text: data.data.greeting,
            timestamp: data.data.timestamp,
            bot_name: data.data.bot_name
          };
          setChatHistory([greetingMessage]);
          saveChatHistory(channel, [greetingMessage]); // ✅ moved here
        } else {
          throw new Error("Failed to get greeting from server");
        }
      } catch (err) {
        console.error("Error initializing chat:", err);
        
        // Fallback greeting
        const channel = `chat_${crypto.randomUUID()}`;
        setChatChannel(channel);
        const fallbackGreeting = {
          sender: "ai",
          text: "Hello! I'm Astro Bot. How can I help you today?",
          timestamp: new Date().toISOString()
        };
        setChatHistory([fallbackGreeting]);
        saveChatHistory(channel, [fallbackGreeting]); // ✅ also saved
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initializeChat();
  }, [isInitialized, userId]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleChat = async () => {
    if (!message.trim() || loading || !chatChannel) return;

    const newUserMessage = { sender: "user", text: message };
    setChatHistory((prev) => {
      const updated = [...prev, newUserMessage];
      saveChatHistory(chatChannel, updated); // ✅ save after sending
      return updated;
    });
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          admin: process.env.NEXT_PUBLIC_ADMIN,
          user_id: userId,
          chat_channel: chatChannel,
          use_context: true,
          context_limit: 3,
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      let aiMessageAdded = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.startsWith("data:"));

        for (const line of lines) {
          try {
            const jsonStr = line.replace(/^data:\s*/, "");
            if (!jsonStr) continue;

            const data = JSON.parse(jsonStr);

            if (data.type === "metadata") continue;

            if (data.type === "response") {
              const cleanedChunk = data.chunk.replace(
                /I apologize, but I cannot provide a response.*guidelines\./g,
                ""
              );

              if (!cleanedChunk) continue;

              if (!aiMessageAdded) {
                setChatHistory((prev) => {
                  const updated = [...prev, { sender: "ai", text: "" }];
                  saveChatHistory(chatChannel, updated);
                  return updated;
                });
                aiMessageAdded = true;
              }

              aiText += cleanedChunk;
              setChatHistory((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { sender: "ai", text: aiText };
                saveChatHistory(chatChannel, updated);
                return updated;
              });
            }
          } catch (err) {
            console.error("Stream parse error:", err, line);
          }
        }
      }
    } catch (error) {
      console.error(error);
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "ai",
          text: (
            <>
              Hi, Naman this side.
              The Backend for Astro Bot is being migrated to a different system for better responses and more computational headroom.
              This will hopefully be ready by the first week of October.
              But yeah, this is how you will see the messages. I hope you got an idea of how the responses are streamed.
              I am using Streamdown, a library by Vercel to stream the response. Previously, this was using React Markdown.
              Thanks for visiting. Please check back later. You can navigate to my website for now:
              {" "}
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
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCurrentChat = async () => {
    if (!chatChannel || deleting) return;

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setDeleting(true);
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

      console.log(`Chat history deleted: ${data.data.messages_deleted} messages`);
      
      // Start a new chat automatically
      await initializeNewChat();
      
    } catch (err) {
      console.error("Error deleting chat history:", err);
      alert(`Failed to delete chat: ${err.message}`);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const initializeNewChat = async () => {
    try {
      const channel = `chat_${crypto.randomUUID()}`;
      setChatChannel(channel);
      setChatHistory([]);
      setMessage("");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/greeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin: process.env.NEXT_PUBLIC_ADMIN,
          user_id: userId,
          chat_channel: channel,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      
      if (data.success) {
        const greetingMessage = {
          sender: "ai",
          text: data.data.greeting,
          timestamp: data.data.timestamp,
          bot_name: data.data.bot_name
        };
        setChatHistory([greetingMessage]);
        saveChatHistory(channel, [greetingMessage]);
      } else {
        throw new Error("Failed to get greeting from server");
      }
    } catch (err) {
      console.error("Error initializing new chat:", err);
      
      // Fallback greeting
      const channel = `chat_${crypto.randomUUID()}`;
      setChatChannel(channel);
      const fallbackGreeting = {
        sender: "ai",
        text: "Hello! I'm Astro Bot. How can I help you today?",
        timestamp: new Date().toISOString()
      };
      setChatHistory([fallbackGreeting]);
      saveChatHistory(channel, [fallbackGreeting]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChat();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        setChatChannel={setChatChannel}
        setChatHistory={setChatHistory}
        currentChatChannel={chatChannel}
        initialChatChannel={chatChannel}
        isInitialized={isInitialized}
      />

      <main className="relative flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 bg-gray-100">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="cursor-pointer z-10 p-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? (
              <PanelLeft className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          <h1 className="font-bold text-xl sm:text-2xl md:text-3xl text-center flex-1">
            <span className="px-4 py-2 text-black rounded-2xl">Astro Bot</span>
          </h1>
          
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500 max-w-20 truncate">
              {chatChannel ? chatChannel : "Loading..."}
            </div>
            
          </div>
        </div>

        {/* Chat container */}
        <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
          <div className="w-full max-w-4xl mx-auto flex flex-col flex-1 min-h-0">
            <div
              ref={chatContainerRef}
              className="h-[580px] mb-6 mt-2 p-3 bg-[#F8F9FA] border border-blue-200 rounded-lg overflow-y-auto space-y-3 sm:space-y-4 min-h-0"
            >
              {!isInitialized ? (
                <p className="font-bold text-[#004873] text-center text-sm sm:text-base px-4">
                  Initializing AstroBot...
                </p>
              ) : chatHistory.length === 0 ? (
                <p className="font-bold text-[#004873] text-center text-sm sm:text-base px-4">
                  Getting ready...
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
                      className={`max-w-[85%] sm:max-w-xs md:max-w-md lg:max-w-lg px-3 sm:px-4 py-2 rounded-2xl text-sm sm:text-base ${
                        chat.sender === "user"
                          ? "bg-[#004873] text-white rounded-br-none"
                          : "bg-white text-gray-800 rounded-bl-none shadow-sm"
                      }`}
                    >
                      {typeof chat.text === "string" ? (
                        <Streamdown>{chat.text}</Streamdown>
                      ) : (
                        chat.text
                      )}
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] sm:max-w-xs md:max-w-md lg:max-w-lg px-3 sm:px-4 py-2 rounded-2xl bg-gray-700 rounded-bl-none">
                    <div className="flex items-center space-x-2">
                      <span className="h-2 w-2 bg-white rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                      <span className="h-2 w-2 bg-white rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                      <span className="h-2 w-2 bg-white rounded-full animate-pulse"></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex-shrink-0 relative flex items-center">
              <textarea
                id="chat-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isInitialized && chatChannel ? "Send a message" : "Getting ready..."}
                disabled={!isInitialized || !chatChannel}
                rows={1}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 pr-12 sm:pr-14 text-sm sm:text-base text-black bg-[#F5F5F5] border-2 border-blue-300 focus:border-blue-500 rounded-lg resize-none focus:outline-none min-h-[48px] max-h-32 disabled:bg-gray-200 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleChat}
                disabled={loading || !chatChannel || !message.trim() || !isInitialized}
                className="absolute right-2 sm:right-3 flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 bg-white text-[#004873] rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00A1FF] hover:bg-[#004873] hover:text-white disabled:bg-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-all"
                aria-label="Send chat message"
              >
                <CircleChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
