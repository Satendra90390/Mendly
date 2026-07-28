"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/config";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const QUICK_SUGGESTIONS = [
  "What are the symptoms of diabetes?",
  "Tell me about Atorvastatin",
  "How to treat a migraine?",
  "Find hospitals near me",
];

function renderMarkdown(text: string): string {
  let html = text
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/gs, (match) => `<ul>${match}</ul>`)
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br/>");
  return `<p>${html}</p>`;
}

export default function ChatbotPage() {
  const { user, token, authFetch } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text || input).trim();
      if (!content || isStreaming) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsStreaming(true);
      setStreamingContent("");

      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        abortControllerRef.current = new AbortController();
        const res = await fetch(`${API_BASE}/chatbot/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message: content, history }),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("text/event-stream") || contentType.includes("stream")) {
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") break;
                  try {
                    const parsed = JSON.parse(data);
                    const token = parsed.content || parsed.text || parsed.delta?.content || "";
                    accumulated += token;
                    setStreamingContent(accumulated);
                  } catch {
                    accumulated += data;
                    setStreamingContent(accumulated);
                  }
                } else if (line.trim()) {
                  accumulated += line;
                  setStreamingContent(accumulated);
                }
              }
            }
          }

          const botMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: accumulated,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, botMessage]);
        } else {
          const data = await res.json();
          const botMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.content || data.reply || data.message || "I'm sorry, I couldn't process that.",
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, botMessage]);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortControllerRef.current = null;
      }
    },
    [input, isStreaming, messages, user]
  );

  const clearChat = () => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setStreamingContent("");
    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0B1120] text-white">
      <style jsx global>{`
        @import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css");
        .chat-scrollbar::-webkit-scrollbar { width: 6px; }
        .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .chat-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        .chat-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        .bot-msg p { margin: 0.4em 0; }
        .bot-msg ul { margin: 0.4em 0; padding-left: 1.4em; }
        .bot-msg li { margin: 0.2em 0; }
        .bot-msg pre { background: rgba(0,0,0,0.4); border-radius: 8px; padding: 0.8em; overflow-x: auto; margin: 0.6em 0; }
        .bot-msg code { font-family: "JetBrains Mono", monospace; font-size: 0.85em; }
        .bot-msg p code { background: rgba(255,255,255,0.08); padding: 0.15em 0.4em; border-radius: 4px; }
        .typing-dot { animation: typingBounce 1.4s infinite ease-in-out; }
        .typing-dot:nth-child(1) { animation-delay: 0s; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingBounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
      `}</style>

      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0B1120]/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-[0_0_18px_rgba(20,184,166,0.4)]">
            <i className="fa-solid fa-robot text-white text-sm" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Elix AI</h1>
            <p className="text-xs text-emerald-400/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Online
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
            title="Clear chat"
          >
            <i className="fa-solid fa-trash-can text-sm" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto chat-scrollbar px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-[0_0_40px_rgba(20,184,166,0.35)]">
                <i className="fa-solid fa-stethoscope text-3xl text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-1">How can I help you today?</h2>
                <p className="text-sm text-white/40">Ask me anything about health, medications, or symptoms.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2">
                {QUICK_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="text-left text-sm px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-teal-500/30 text-white/70 hover:text-white transition-all"
                  >
                    <i className="fa-solid fa-bolt text-teal-400/70 mr-2 text-xs" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full shrink-0 bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-[0_0_14px_rgba(20,184,166,0.35)] mt-1">
                  <i className="fa-solid fa-comment-medical text-white text-xs" />
                </div>
              )}
              <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-[#14B8A6] to-[#0891B2] text-white rounded-2xl rounded-tr-md shadow-lg"
                      : "bg-[rgba(26,35,50,0.6)] backdrop-blur-md border border-white/[0.06] text-white/90 rounded-2xl rounded-tl-md shadow-lg"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div
                      className="bot-msg"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  ) : (
                    msg.content
                  )}
                </div>
                <span className="text-[10px] text-white/25 mt-1 px-1">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          ))}

          {isStreaming && !streamingContent && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full shrink-0 bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-[0_0_14px_rgba(20,184,166,0.35)]">
                <i className="fa-solid fa-comment-medical text-white text-xs" />
              </div>
              <div className="px-4 py-3 bg-[rgba(26,35,50,0.6)] backdrop-blur-md border border-white/[0.06] rounded-2xl rounded-tl-md shadow-lg flex items-center gap-1.5 h-10">
                <span className="typing-dot w-2 h-2 rounded-full bg-teal-400/60 inline-block" />
                <span className="typing-dot w-2 h-2 rounded-full bg-teal-400/60 inline-block" />
                <span className="typing-dot w-2 h-2 rounded-full bg-teal-400/60 inline-block" />
              </div>
            </div>
          )}

          {isStreaming && streamingContent && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full shrink-0 bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-[0_0_14px_rgba(20,184,166,0.35)]">
                <i className="fa-solid fa-comment-medical text-white text-xs" />
              </div>
              <div className="max-w-[75%] px-4 py-3 bg-[rgba(26,35,50,0.6)] backdrop-blur-md border border-white/[0.06] text-white/90 rounded-2xl rounded-tl-md shadow-lg text-sm leading-relaxed">
                <div
                  className="bot-msg"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }}
                />
                <span className="inline-block w-0.5 h-4 bg-teal-400 ml-0.5 animate-pulse align-text-bottom" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-white/[0.06] bg-[#0B1120]/80 backdrop-blur-md px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.08] hover:border-teal-500/25 transition-all shrink-0"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Elix AI anything..."
              rows={1}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-teal-500/40 resize-none max-h-40 transition-colors"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isStreaming}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_18px_rgba(20,184,166,0.35)] active:scale-95"
            >
              <i className="fa-solid fa-paper-plane text-white text-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
