import { v4 as uuidv4 } from "uuid";

export async function POST(req) {
  try {
    const { message, chat_channel } = await req.json();

    // Generate or reuse user_id
    let user_id = "user_demo"; // Replace with cookies/localStorage persistence if needed
    const channel = chat_channel || `chat_${uuidv4()}`;

    const payload = {
      message,
      admin: process.env.NEXT_PUBLIC_ADMIN,
      user_id,
      chat_channel: channel,
      use_context: true,
      context_limit: 3,
    };

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return new Response("Error from RAG API", { status: res.status });
    }

    // Pass channel back in header
    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "x-chat-channel": channel,
      },
    });
  } catch (err) {
    console.error("Chat API Error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
