"use client";

import { useState, useRef, useEffect } from "react";
import { CircleChevronRight, Menu, PanelLeft } from "lucide-react";
import Link from "next/link";
import Streamdown from "streamdown";
import Sidebar from "./ChatHistory";
import { saveChatHistory } from "../utils/chatStore";

export default function Home() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatChannel, setChatChannel] = useState(""); 
  const [userId] = useState("demo_user");
  const [isInitialized, setIsInitialized] = useState(false);

  const chatContainerRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);

  // Auto-start chat when component mounts
  useEffect(() => {
    const initializeChat = async () => {
      if (isInitialized) return;
      
      try {
        const channel = `chat_${crypto.randomUUID()}`;
        setChatChannel(channel);
        
        const greeting = {
          sender: "ai",
          text: "Hello! I am Astro Bot, Naman's Personal AI Assistant. I am here to assist you on behalf of Naman. How can I help you today?",
          timestamp: new Date().toISOString()
        };
        setChatHistory([greeting]);
        saveChatHistory(channel, [greeting]);
      } catch (err) {
        console.error("Error initializing chat:", err);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeChat();
  }, [isInitialized]);

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
      saveChatHistory(chatChannel, updated);
      return updated;
    });
    const currentMessage = message;
    setMessage("");
    setLoading(true);

    try {
      const clientName = process.env.NEXT_PUBLIC_ADMIN || 'naman';
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/chat/stream`;
      
      // Construct URL with query parameters
      const url = new URL(apiUrl);
      url.searchParams.append('client_name', clientName);
      url.searchParams.append('chat_channel', chatChannel);
      url.searchParams.append('message', currentMessage);

      // Create authorization header
      const headers = {
        "Accept": "text/plain"
      };

      // Add Basic Auth if credentials are available
      if (process.env.NEXT_PUBLIC_API_USERNAME && process.env.NEXT_PUBLIC_API_PASSWORD) {
        const credentials = btoa(
          `${process.env.NEXT_PUBLIC_API_USERNAME}:${process.env.NEXT_PUBLIC_API_PASSWORD}`
        );
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: headers,
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Authentication failed. Please check your API credentials.');
        }
        throw new Error(`Server error: ${res.status}`);
      }

      // Read the streaming response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      let aiMessageAdded = false;
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Split by newlines to process complete lines
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          // Skip empty lines
          if (!line.trim()) continue;
          
          // Parse SSE format: "data: <content>"
          if (line.startsWith('data:')) {
            const chunk = line.substring(5).trim();
            
            if (!chunk) continue;
            
            // Add AI message placeholder if not added yet
            if (!aiMessageAdded) {
              setChatHistory((prev) => {
                const updated = [...prev, { sender: "ai", text: "" }];
                saveChatHistory(chatChannel, updated);
                return updated;
              });
              aiMessageAdded = true;
            }

            // Concatenate chunks
            aiText += chunk;
            
            setChatHistory((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { sender: "ai", text: aiText };
              saveChatHistory(chatChannel, updated);
              return updated;
            });
          }
        }
      }

      // If no response was received, add error message
      if (!aiMessageAdded || !aiText.trim()) {
        setChatHistory((prev) => {
          const updated = [...prev, { 
            sender: "ai", 
            text: "I received your message but couldn't generate a response. Please try again." 
          }];
          saveChatHistory(chatChannel, updated);
          return updated;
        });
      }

    } catch (error) {
      console.error("Chat error:", error);
      
      let errorMessage = "Sorry, I encountered an error. ";
      
      if (error.message.includes('Authentication failed')) {
        errorMessage += "Please check your API credentials in the environment configuration.";
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage += "Unable to connect to the server. Please check your internet connection.";
      } else {
        errorMessage += error.message || "Please try again later.";
      }
      
      setChatHistory((prev) => {
        const updated = [...prev, {
          sender: "ai",
          text: (
            <>
              {errorMessage}
              {" "}
              <Link
                className="font-bold underline"
                href="https://halfskirmish.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit my website
              </Link>
            </>
          ),
        }];
        saveChatHistory(chatChannel, updated);
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChatDeleted = async (deletedChannel) => {
    if (deletedChannel === chatChannel) {
      await initializeNewChat();
      if (sidebarRef.current) {
        sidebarRef.current.refreshHistory();
      }
    }
  };

  const initializeNewChat = async () => {
    try {
      const channel = `chat_${crypto.randomUUID()}`;
      setChatChannel(channel);
      setChatHistory([]);
      setMessage("");

      const greeting = {
        sender: "ai",
        text: "Hello! I am Astro Bot, Naman's Personal AI Assistant. I am here to assist you on behalf of Naman. How can I help you today?",
        timestamp: new Date().toISOString()
      };
      setChatHistory([greeting]);
      saveChatHistory(channel, [greeting]);
    } catch (err) {
      console.error("Error initializing new chat:", err);
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
        ref={sidebarRef}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        setChatChannel={setChatChannel}
        setChatHistory={setChatHistory}
        currentChatChannel={chatChannel}
        initialChatChannel={chatChannel}
        isInitialized={isInitialized}
        onChatDeleted={handleChatDeleted}
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
            <div className="text-xs text-gray-500 max-w-32 truncate" title={chatChannel}>
              {chatChannel ? chatChannel.substring(0, 15) + '...' : "Loading..."}
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
                disabled={!isInitialized || !chatChannel || loading}
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