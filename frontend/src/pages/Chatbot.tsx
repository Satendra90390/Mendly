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
  const html = text
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

function RobotIcon({ className = "w-4 h-4" }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6v3.75m0 3v.75m-6-3.75H9m1.5-3h.75m0 0v3m0 0h-.75M12 3a9 9 0 00-9 9v2.25a9 9 0 0018 0V12a9 9 0 00-9-9z" /></svg>;
}
function StethoscopeIcon({ className = "w-4 h-4" }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
}
function BoltIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return <svg className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>;
}
function TrashIcon({ className = "w-4 h-4" }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
}
function SendIcon({ className = "w-4 h-4" }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>;
}
function ChatIcon({ className = "w-4 h-4" }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>;
}

export default function ChatbotPage() {
  const { token } = useAuth();
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

  useEffect(() => { scrollToBottom(); }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text || input).trim();
    if (!content || isStreaming) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    const history = [...messages, userMessage].map((m) => ({ role: m.role, content: m.content }));

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

        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: accumulated, timestamp: Date.now() }]);
      } else {
        const data = await res.json();
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(), role: "assistant",
          content: data.content || data.reply || data.message || "I'm sorry, I couldn't process that.",
          timestamp: Date.now(),
        }]);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Sorry, something went wrong. Please try again.", timestamp: Date.now() }]);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  }, [input, isStreaming, messages, token]);

  const clearChat = () => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setStreamingContent("");
    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground">
      <header className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-border"
        style={{ background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "var(--gradient-1)", boxShadow: "0 0 18px hsl(173 80% 36% / 0.3)" }}>
            <RobotIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-foreground">Elix AI</h1>
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full"
                style={{ background: "hsl(173 80% 36% / 0.1)", color: "hsl(173 80% 50%)" }}>
                Beta
              </span>
            </div>
            <p className="text-xs flex items-center gap-1.5" style={{ color: "hsl(173 80% 60%)" }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#34D399" }} />
              Online
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat}
            className="p-2 rounded-lg transition-all hover:bg-muted"
            style={{ color: "hsl(var(--muted-foreground))" }}>
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto chat-scrollbar px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6 text-center animate-in">
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "var(--gradient-1)", boxShadow: "0 0 40px hsl(173 80% 36% / 0.2)" }}>
                <StethoscopeIcon className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-1 text-foreground">How can I help you today?</h2>
                <p className="text-sm text-muted-foreground">Ask me anything about health, medications, or symptoms.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2">
                {QUICK_SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion} onClick={() => sendMessage(suggestion)}
                    className="text-left text-sm px-4 py-3 rounded-xl transition-all glass-card text-muted-foreground hover:text-foreground">
                    <BoltIcon className="w-3.5 h-3.5 inline mr-2" style={{ color: "hsl(173 80% 60%)" }} />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} animate-in`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-1"
                  style={{ background: "var(--gradient-1)", boxShadow: "0 0 14px hsl(173 80% 36% / 0.2)" }}>
                  <ChatIcon className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "text-white rounded-2xl rounded-tr-md"
                    : "rounded-2xl rounded-tl-md"
                }`}
                  style={msg.role === "user"
                    ? { background: "var(--gradient-1)", boxShadow: "0 4px 16px hsl(173 80% 36% / 0.2)" }
                    : { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }
                  }>
                  {msg.role === "assistant" ? (
                    <div className="bot-msg" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  ) : msg.content}
                </div>
                <span className="text-[10px] mt-1 px-1 text-muted-foreground/40">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          ))}

          {isStreaming && !streamingContent && (
            <div className="flex gap-3 animate-in">
              <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
                style={{ background: "var(--gradient-1)", boxShadow: "0 0 14px hsl(173 80% 36% / 0.2)" }}>
                <ChatIcon className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-1.5 h-10"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <span className="typing-dot w-2 h-2 rounded-full inline-block" style={{ background: "hsl(173 80% 50%)" }} />
                <span className="typing-dot w-2 h-2 rounded-full inline-block" style={{ background: "hsl(173 80% 50%)" }} />
                <span className="typing-dot w-2 h-2 rounded-full inline-block" style={{ background: "hsl(173 80% 50%)" }} />
              </div>
            </div>
          )}

          {isStreaming && streamingContent && (
            <div className="flex gap-3 animate-in">
              <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
                style={{ background: "var(--gradient-1)", boxShadow: "0 0 14px hsl(173 80% 36% / 0.2)" }}>
                <ChatIcon className="w-4 h-4 text-white" />
              </div>
              <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tl-md text-sm leading-relaxed"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}>
                <div className="bot-msg" dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }} />
                <span className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-text-bottom" style={{ background: "hsl(var(--primary))" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-border"
        style={{ background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {QUICK_SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full transition-all shrink-0 glass-card text-muted-foreground hover:text-foreground">
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea ref={textareaRef} value={input}
              onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Ask Elix AI anything..." rows={1}
              className="flex-1 rounded-xl px-4 py-3 text-sm outline-none resize-none max-h-40 transition-all"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--input))",
                color: "hsl(var(--foreground))",
              }} />
            <button onClick={() => sendMessage()}
              disabled={!input.trim() || isStreaming}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
              style={{ background: "var(--gradient-1)", boxShadow: "0 4px 16px hsl(173 80% 36% / 0.25)" }}>
              <SendIcon className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
