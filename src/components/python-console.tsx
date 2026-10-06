import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PySegment, PyStatus } from "@/lib/python-runner";

const STATUS_LABEL: Record<PyStatus, string> = {
  idle: "",
  loading: "Memuat Python (pertama kali agak lama)...",
  running: "Berjalan",
  waiting: "Menunggu input",
  done: "Selesai",
  error: "Selesai dengan error",
  stopped: "Dihentikan",
};

type Props = {
  segments: PySegment[];
  status: PyStatus;
  onInput: (value: string) => void;
};

// Konsol Python: output live, dan kolom input muncul langsung setelah prompt saat program memanggil input().
export function PythonConsole({ segments, status, onInput }: Props) {
  const [value, setValue] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const waiting = status === "waiting";

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [segments, waiting]);

  useEffect(() => {
    if (waiting) inputRef.current?.focus();
  }, [waiting]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-md border bg-background p-3 text-sm">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        Python
        {STATUS_LABEL[status] && ` · ${STATUS_LABEL[status]}`}
        {(status === "loading" || status === "running") && <Loader2 className="h-3 w-3 animate-spin" />}
      </p>
      <div ref={boxRef} className="min-h-0 flex-1 overflow-auto font-mono text-xs" onClick={() => inputRef.current?.focus()}>
        <div className="whitespace-pre-wrap break-words">
          {segments.map((s, i) => (
            <span key={i} className={s.err ? "text-destructive" : undefined}>
              {s.text}
            </span>
          ))}
          {waiting && (
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                onInput(value);
                setValue("");
              }}
              aria-label="Input program"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              style={{ width: `${Math.max(value.length + 1, 8)}ch`, maxWidth: "100%" }}
              className="border-b border-primary bg-transparent font-mono text-xs outline-none"
            />
          )}
        </div>
        {status === "idle" && <p className="text-muted-foreground">Tekan Jalankan pada file .py untuk melihat output di sini.</p>}
      </div>
    </div>
  );
}
