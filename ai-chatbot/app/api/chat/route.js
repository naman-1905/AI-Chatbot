export const runtime = "node";

export async function POST(request) {
  try {
    const { message } = await request.json();

    if (!message || message.trim() === "") {
      return new Response(
        JSON.stringify({ error: "No message provided." }),
        { status: 400 }
      );
    }

    // Send the request to remote Ollama
    const response = await fetch("http://privategemma1b.kahitoz.com/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3:1b",
        prompt: message,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Remote Ollama error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch from remote Ollama.", details: errText }),
        { status: 502 }
      );
    }

    // Transform Ollama JSON stream → plain text stream
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(Boolean);

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                controller.enqueue(new TextEncoder().encode(data.response));
              }
              if (data.done) {
                controller.close();
                return;
              }
            } catch (err) {
              console.error("Failed to parse line:", line);
            }
          }
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request." }),
      { status: 500 }
    );
  }
}
