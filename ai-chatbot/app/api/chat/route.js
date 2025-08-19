export const runtime = "node";

import { spawn } from "child_process";

export async function POST(request) {
  try {
    const { message } = await request.json();

    if (!message || message.trim() === "") {
      return new Response(JSON.stringify({ error: "No message provided." }), { status: 400 });
    }

    const stream = new ReadableStream({
      start(controller) {
        const process = spawn("ollama", ["run", "gemma3:1b"]);

        // Send the user's message to Ollama via stdin
        process.stdin.write(message + "\n");
        process.stdin.end();

        process.stdout.on("data", (chunk) => {
          controller.enqueue(new TextEncoder().encode(chunk.toString()));
        });

        process.stderr.on("data", (chunk) => {
          console.error("Ollama error:", chunk.toString());
        });

        process.on("close", () => controller.close());
        process.on("error", (err) => controller.error(err));
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: "Failed to process request." }), { status: 500 });
  }
}
