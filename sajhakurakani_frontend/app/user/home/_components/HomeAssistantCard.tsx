"use client";

import { useEffect, useRef, useState } from "react";

type HomeAssistantCardProps = {
  firstName: string;
};

type AssistantResponse = {
  success: boolean;
  message?: string;
  data?: {
    text?: string;
  };
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

export default function HomeAssistantCard({ firstName }: HomeAssistantCardProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      text: `Hi ${firstName}! How can I help you today?`,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleAsk() {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmedQuery,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setQuery("");
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ message: trimmedQuery }),
      });

      const payload = (await response.json()) as AssistantResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Unable to get an AI response right now.");
      }

      const assistantReply =
        payload.data?.text?.trim() || "I’m here if you want to ask something else.";

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: assistantReply,
        },
      ]);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to get an AI response right now."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="flex h-[560px] flex-col overflow-hidden rounded-[18px] border border-[#e5d8d2] bg-white/84 shadow-[0_14px_32px_rgba(128,84,53,0.06)] xl:h-[70vh] xl:max-h-[880px]">
      <div className="bg-[linear-gradient(135deg,#e78763_0%,#4ab1a0_100%)] px-4 py-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-white/78">
              Assistant
            </p>
            <h2 className="mt-1.5 text-[1.75rem] font-semibold tracking-[-0.04em]">
              AI Chat Bot
            </h2>
          </div>
          <span className="text-lg">✦</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        {error ? (
          <div className="mb-3 rounded-[14px] border border-[#f1c4ba] bg-[#fff1ed] px-3.5 py-3 text-[0.82rem] text-[#b14f3f]">
            {error}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-[16px] border border-[#ece4de] bg-[#fdfaf7] p-3 pr-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-[16px] px-3.5 py-3 text-[0.88rem] leading-6 shadow-[0_8px_16px_rgba(128,84,53,0.04)] ${
                  message.role === "user"
                    ? "rounded-br-[6px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] text-white"
                    : "rounded-bl-[6px] border border-[#f0ddd1] bg-white text-[#5f6678]"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}

          {isLoading ? (
            <div className="flex justify-start">
              <div className="rounded-[16px] rounded-bl-[6px] border border-[#f0ddd1] bg-white px-3.5 py-3 text-[0.88rem] text-[#7c7580] shadow-[0_8px_16px_rgba(128,84,53,0.04)]">
                Thinking...
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <div className="mt-3 flex items-center gap-2.5 rounded-[14px] border border-[#e9ecef] bg-white px-3 py-2.5">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleAsk();
              }
            }}
            placeholder="Ask me anything..."
            className="w-full bg-transparent text-[0.88rem] text-[#1d243f] outline-none placeholder:text-[#adb1bb]"
          />
          <button
            type="button"
            onClick={() => void handleAsk()}
            disabled={isLoading || !query.trim()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#1d243f] text-sm text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send AI message"
          >
            &gt;
          </button>
        </div>
      </div>
    </section>
  );
}
