import { NextRequest, NextResponse } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT =
  "You are a fun, friendly, humorous chatbot for a social media app. " +
  "Always respond casually, with small jokes, emojis, and a positive vibe. " +
  "Keep answers short and fun.";

const MODEL = "llama-3.1-8b-instant";

async function sendToGroq(userMessage: string, apiKey: string, attempt = 0): Promise<string> {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 150,
      temperature: 0.9,
    }),
  });

  if (response.status === 503 && attempt < 2) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return sendToGroq(userMessage, apiKey, attempt + 1);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() || "No response from AI.";
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "Server missing GROQ_API_KEY" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as { message?: string };
    const userMessage = body.message?.trim();

    if (!userMessage) {
      return NextResponse.json(
        { success: false, message: "Message is required" },
        { status: 400 }
      );
    }

    const aiReply = await sendToGroq(userMessage, apiKey);
    return NextResponse.json({
      success: true,
      data: { text: aiReply },
      message: "AI response generated",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
