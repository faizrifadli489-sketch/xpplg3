import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Send, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { chatWithAi, getAiStatus } from "@/lib/ai.functions";
import { usePrefs } from "@/lib/preferences";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

const SUGGESTIONS = ["Besok pelajaran apa?", "Siapa piket hari ini?", "Kas aku udah lunas belum?", "Ada acara apa?"];

// Rapikan sedikit markdown dari model supaya tidak muncul tanda ** atau * mentah.
function tidy(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\s*[*-]\s+/gm, "• ");
}

/** Chat CS kecil di pojok kanan bawah. Hanya muncul untuk yang login, dan kalau admin menyalakan AI. */
export function AiChat() {
  const { user } = useAuth();
  const { aiHidden } = usePrefs();
  const statusFn = useServerFn(getAiStatus);
  const chatFn = useServerFn(chatWithAi);

  const status = useQuery({
    queryKey: ["ai-status", user?.id],
    queryFn: () => statusFn(),
    enabled: !!user,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: (history: Msg[]) =>
      chatFn({
        data: {
          messages: history
            .filter((m) => !m.error)
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
        },
      }),
    onSuccess: (res) => setMessages((m) => [...m, { role: "assistant", content: res.reply }]),
    onError: (err) =>
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          error: true,
          content:
            typeof navigator !== "undefined" && !navigator.onLine
              ? "Kamu sedang offline. Sambungkan internet dulu ya."
              : err instanceof Error
                ? err.message
                : "Gagal mengirim pertanyaan.",
        },
      ]),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, send.isPending, open]);

  // Kalau AI dimatikan / user logout, tutup panel dan bersihkan percakapan.
  useEffect(() => {
    if (!user || aiHidden || status.data?.enabled === false) {
      setOpen(false);
      setMessages([]);
    }
  }, [user, aiHidden, status.data?.enabled]);

  if (!user || aiHidden || !status.data?.enabled) return null;

  const ask = (text: string) => {
    const content = text.trim();
    if (!content || send.isPending) return;
    const next: Msg[] = [...messages, { role: "user", content: content.slice(0, 1000) }];
    setMessages(next);
    setInput("");
    send.mutate(next);
  };

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Asisten AI kelas"
          className="fixed bottom-20 right-4 z-40 flex h-[min(30rem,calc(100vh-7rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        >
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div className="leading-tight">
                <p className="text-sm font-semibold">Asisten Kelas</p>
                <p className="text-[11px] opacity-80">Jawaban AI bisa keliru, cek lagi kalau penting</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  aria-label="Hapus percakapan"
                  className="rounded p-1 hover:bg-primary-foreground/15"
                  onClick={() => setMessages([])}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                aria-label="Tutup"
                className="rounded p-1 hover:bg-primary-foreground/15"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Halo! Tanya soal jadwal, piket, acara, atau kas kamu. Coba:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="rounded-full border border-border px-3 py-1 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm " +
                    (m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : m.error
                        ? "rounded-bl-sm bg-destructive/10 text-destructive"
                        : "rounded-bl-sm bg-muted text-foreground")
                  }
                >
                  {m.role === "assistant" && !m.error ? tidy(m.content) : m.content}
                </div>
              </div>
            ))}

            {send.isPending && (
              <div className="flex justify-start" aria-live="polite" aria-label="AI sedang mengetik">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-3">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="flex items-center gap-2 border-t border-border p-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input
              value={input}
              maxLength={1000}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis pertanyaan..."
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={!input.trim() || send.isPending}
              aria-label="Kirim"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        aria-label={open ? "Tutup asisten AI" : "Buka asisten AI"}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-6 w-6" />}
      </button>
    </>
  );
}
