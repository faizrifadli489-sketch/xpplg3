import { useCallback, useEffect, useRef, useState } from "react";
import type { IdeFile } from "@/lib/ide-files";

export type PySegment = { text: string; err: boolean };
export type PyStatus = "idle" | "loading" | "running" | "waiting" | "done" | "error" | "stopped";

const MAX_CHARS = 200_000;
const FLUSH_MS = 40;

// Menjalankan Python (Pyodide) di Web Worker /python-worker.js.
// Output tampil langsung, input() menunggu isian dari panel, dan Stop mematikan worker.
export function usePythonRunner() {
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef<PySegment[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [segments, setSegments] = useState<PySegment[]>([]);
  const [status, setStatus] = useState<PyStatus>("idle");

  const push = (list: PySegment[], text: string, err: boolean) => {
    const last = list[list.length - 1];
    if (last && last.err === err) last.text += text;
    else list.push({ text, err });
  };

  const flush = useCallback(() => {
    timer.current = null;
    const chunk = pending.current;
    if (!chunk.length) return;
    pending.current = [];
    setSegments((prev) => {
      const next = prev.map((s) => ({ ...s }));
      for (const s of chunk) push(next, s.text, s.err);
      let total = next.reduce((n, s) => n + s.text.length, 0);
      while (total > MAX_CHARS && next.length) {
        const cut = Math.min(total - MAX_CHARS, next[0].text.length);
        next[0].text = next[0].text.slice(cut);
        total -= cut;
        if (!next[0].text) next.shift();
      }
      return next;
    });
  }, []);

  // Output dikumpulkan dulu lalu ditulis ke state tiap beberapa milidetik, supaya loop yang print terus tidak membekukan halaman.
  const write = useCallback(
    (text: string, err: boolean) => {
      push(pending.current, text, err);
      if (timer.current === null) timer.current = setTimeout(flush, FLUSH_MS);
    },
    [flush],
  );

  const killWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(
    () => () => {
      killWorker();
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [killWorker],
  );

  const getWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const w = new Worker("/python-worker.js");
    w.onmessage = (e: MessageEvent) => {
      const m = e.data as { type: string; stream?: string; data?: string; value?: string; ok?: boolean };
      if (m.type === "out") write(m.data ?? "", m.stream === "stderr");
      else if (m.type === "need-input") {
        flush();
        setStatus("waiting");
      } else if (m.type === "status") setStatus(m.value === "running" ? "running" : "loading");
      else if (m.type === "done") {
        flush();
        setStatus(m.ok ? "done" : "error");
      }
    };
    w.onerror = (e) => {
      write(`Gagal memuat Python: ${e.message || "periksa koneksi internet."}\n`, true);
      flush();
      setStatus("error");
      killWorker();
    };
    workerRef.current = w;
    return w;
  }, [write, flush, killWorker]);

  const run = useCallback(
    (files: IdeFile[], entry: string) => {
      if (status === "loading" || status === "running" || status === "waiting") return;
      pending.current = [];
      setSegments([]);
      setStatus("loading");
      getWorker().postMessage({ type: "run", files, entry });
    },
    [status, getWorker],
  );

  const sendInput = useCallback(
    (value: string) => {
      write(`${value}\n`, false);
      flush();
      setStatus("running");
      workerRef.current?.postMessage({ type: "input", value });
    },
    [write, flush],
  );

  const stop = useCallback(() => {
    killWorker();
    flush();
    setStatus("stopped");
  }, [killWorker, flush]);

  const active = status === "loading" || status === "running" || status === "waiting";
  return { segments, status, active, run, sendInput, stop };
}
