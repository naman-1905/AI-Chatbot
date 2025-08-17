import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { message } = await request.json();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    return Response.json(
      {
        response: text,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    return Response.json(
      {
        error: "Failed to process the request.",
      },
      { status: 500 }
    );
  }
}