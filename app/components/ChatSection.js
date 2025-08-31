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
  const [chatChannel, setChatChannel] = useState("chat_session_001"); // default session id or generate dynamically

  const chatContainerRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleChat = async () => {
    if (!message.trim() || loading) return;

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
          admin: "naman", // ✅ safe to expose
          user_id: "user_12345", // replace with persistent user id
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
              // Metadata is safe, but don’t show in chat
              console.log("Bot Metadata:", data.bot_name, data.admin_name);
              continue;
            }

            if (data.type === "response") {
              // 🚫 Skip unwanted connection error filler text
              const cleanedChunk = data.chunk.replace(
                /I'm having trouble connecting to my language model\. Please try again in a moment\./g,
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

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        setChatChannel={setChatChannel}
        setChatHistory={setChatHistory}
      />

      <main className="relative flex-1 flex flex-col items-center text-gray-800 font-sans p-4">
        {/* Toggle sidebar */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-5 left-4 cursor-pointer z-20 p-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          aria-label="Toggle sidebar"
        >
          {isSidebarOpen ? (
            <PanelLeft className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>

        <div className="w-full max-w-2xl flex flex-col flex-grow h-[calc(100vh-2rem)]">
          <h1 className="font-bold text-3xl text-center my-6 bg-clip-text bg-black">
            <span className="px-6 py-2 bg-white rounded-2xl">Astro Bot</span>
          </h1>

          {/* Chat Messages */}
          <div
            ref={chatContainerRef}
            className="flex-grow mb-4 p-4 bg-[#F8F9FA] border border-blue-200 rounded-lg overflow-y-auto space-y-4"
          >
            {chatHistory.length === 0 ? (
              <p className="font-bold text-[#004873] text-center">
                Hi there, I am Astra Bot, created by Naman Chaturvedi.
                <br />
                I am here to answer your questions.
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
                    className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${
                      chat.sender === "user"
                        ? "bg-[#004873] text-white rounded-br-none"
                        : "bg-white text-gray-800 rounded-bl-none"
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
                <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl bg-gray-700 rounded-bl-none">
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
          <div className="relative flex z-10 items-center">
            <textarea
              id="chat-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message"
              rows={1}
              className="w-full px-4 py-4 pr-14 text-black bg-[#F5F5F5] border-2 border-blue-300 focus:border-blue-500 rounded-lg resize-none focus:outline-none"
            />
            <button
              onClick={handleChat}
              disabled={loading}
              className="absolute right-3 flex items-center justify-center h-10 w-10 bg-white text-[#004873] rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00A1FF] hover:bg-[#004873] hover:text-white disabled:bg-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-all"
              aria-label="Send chat message"
            >
              <CircleChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
