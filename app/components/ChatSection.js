"use client";

import { useState, useRef, useEffect } from "react";
import { CircleChevronRight, Menu, PanelLeft } from "lucide-react";
import Link from "next/link";
import Streamdown from "streamdown";
import Sidebar from "./ChatHistory";

export default function Home() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatChannel, setChatChannel] = useState(""); // Start empty, let sidebar handle initial setup
  const [userId] = useState("demo_user"); // TODO: generate/persist user_id

  const chatContainerRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Load initial greeting when chat channel changes
  useEffect(() => {
    if (chatChannel && chatHistory.length === 0) {
      loadInitialGreeting();
    }
  }, [chatChannel]);

  const loadInitialGreeting = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/greeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin: process.env.NEXT_PUBLIC_ADMIN,
          user_id: userId,
          chat_channel: chatChannel,
        }),
      });

      if (!res.ok) {
        console.error("Failed to load greeting");
        return;
      }

      // If the greeting endpoint returns a message, we could handle it here
      // For now, just show the default greeting
      if (chatHistory.length === 0) {
        setChatHistory([]);
      }
    } catch (error) {
      console.error("Error loading greeting:", error);
    }
  };

  const handleChat = async () => {
    if (!message.trim() || loading || !chatChannel) return;

    const newUserMessage = { sender: "user", text: message };
    setChatHistory((prev) => [...prev, newUserMessage]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          admin: process.env.NEXT_PUBLIC_ADMIN, // Use environment variable
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
      let aiMessageAdded = false; // track if we've inserted the AI bubble yet

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // 🔥 Filter SSE lines
        const lines = chunk.split("\n").filter((line) => line.startsWith("data:"));
        for (const line of lines) {
          try {
            const jsonStr = line.replace(/^data:\s*/, "");
            if (!jsonStr) continue;

            const data = JSON.parse(jsonStr);

            if (data.type === "metadata") {
              // Metadata is safe, but don't show in chat
              console.log("Bot Metadata:", data.bot_name, data.admin_name);
              continue;
            }

            if (data.type === "response") {
              // 🚫 Skip unwanted connection error filler text
              const cleanedChunk = data.chunk.replace(
                /I apologize, but I cannot provide a response to that query due to content guidelines.\ Please try rephrasing your question\./g,
                ""
              );

              if (!cleanedChunk) continue; // skip empty chunks

              if (!aiMessageAdded) {
                setChatHistory((prev) => [...prev, { sender: "ai", text: "" }]);
                aiMessageAdded = true;
              }

              aiText += cleanedChunk;
              setChatHistory((prev) => {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1] = { sender: "ai", text: aiText };
                return newHistory;
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
              Sorry, I couldn&apos;t get a response. Please try again. If the
              issue persists, contact Naman through his website:{" "}
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChat();
    }
  };

  // Function to process links and convert domain names to clickable links
  const processLinks = (text) => {
    // First process the text with Streamdown for markdown
    const streamdownProcessor = new Streamdown();
    let processedText = streamdownProcessor.render(text);
    
    // Domain suffixes to detect
    const domainSuffixes = [
      '.com', '.net', '.org', '.edu', '.gov', '.mil', '.int',
      '.co', '.io', '.ai', '.tech', '.dev', '.app', '.blog',
      '.info', '.biz', '.name', '.pro', '.museum', '.aero',
      '.coop', '.jobs', '.travel', '.xxx', '.post', '.tel',
      '.asia', '.cat', '.mobi', '.xxx', '.arpa'
    ];
    
    // Create a regex pattern for domain detection
    const domainPattern = new RegExp(
      `\\b([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+(${domainSuffixes.map(s => s.slice(1)).join('|')})\\b(?![^<]*>)`,
      'gi'
    );
    
    // Replace domain matches with clickable links
    processedText = processedText.replace(domainPattern, (match) => {
      const url = match.startsWith('http') ? match : `https://${match}`;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${match}</a>`;
    });
    
    return processedText;
  };

  const getGreetingMessage = () => {
    if (!chatChannel) {
      return "Welcome! Please start a new chat or select a chat from the history.";
    }
    return "Hi there, I am Astro Bot, created by Naman Chaturvedi.\nI am here to answer your questions.";
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar with overlay on mobile */}
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
      />

      <main className="relative flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header with toggle button */}
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

          <h1 className="font-bold text-xl sm:text-2xl md:text-3xl text-center bg-clip-text bg-black flex-1">
            <span className="px-4 py-2 text-black rounded-2xl">Astro Bot</span>
          </h1>
          
          {/* Chat channel indicator */}
          <div className="text-xs text-gray-500 max-w-20 truncate">
            {chatChannel ? chatChannel : "No chat"}
          </div>
        </div>

        {/* Chat container */}
        <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
          <div className="w-full max-w-4xl mx-auto flex flex-col flex-1 min-h-0">
            {/* Chat Messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 mb-4 p-3 sm:p-4 bg-[#F8F9FA] border border-blue-200 rounded-lg overflow-y-auto space-y-3 sm:space-y-4 min-h-0"
            >
              {chatHistory.length === 0 ? (
                <p className="font-bold text-[#004873] text-center text-sm sm:text-base px-4">
                  {getGreetingMessage()}
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
                        <div
                          className="
                            [&_p]:whitespace-pre-wrap 
                            [&_li]:list-disc [&_li]:ml-6 
                            [&_strong]:font-bold 
                            [&_a]:text-blue-900 [&_a]:italic
                          "
                        >
                          <Streamdown>{chat.text}</Streamdown>
                        </div>
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

            {/* Input Box */}
            <div className="flex-shrink-0 relative flex items-center">
              <textarea
                id="chat-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={chatChannel ? "Send a message" : "Start a new chat first"}
                disabled={!chatChannel}
                rows={1}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 pr-12 sm:pr-14 text-sm sm:text-base text-black bg-[#F5F5F5] border-2 border-blue-300 focus:border-blue-500 rounded-lg resize-none focus:outline-none min-h-[48px] max-h-32 disabled:bg-gray-200 disabled:cursor-not-allowed"
                style={{
                  height: 'auto',
                  minHeight: '48px'
                }}
              />
              <button
                onClick={handleChat}
                disabled={loading || !chatChannel || !message.trim()}
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