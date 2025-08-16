"use client"

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState("");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState("");
  const [streamResponse, setStreamResponse] = useState("");


  const handleChat = async () => {
    setLoading(true)
    setResponse("")
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setResponse(data.response || "No response received.");
    } catch (error) {
      setResponse("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-bold text-2xl flex text-center justify-center px-4 py-4">
        Main Page
        </h1>

        <div className="w-full mb-4 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800">
      <textarea
        id="chat-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Enter your prompt"
        rows={4}
      />
        </div>
    </div>
  );
}
