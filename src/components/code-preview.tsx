import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Terminal } from "lucide-react";

export type CodeDoc = { html: string; css: string; js: string };

// Skrip kecil di dalam iframe: meneruskan console.* dan error ke halaman induk.
const BRIDGE = `<script>(function(){
function fmt(a){try{return typeof a==='string'?a:JSON.stringify(a,function(k,v){return typeof v==='function'?'[fungsi]':v})}catch(e){return String(a)}}
function send(type,args){try{parent.postMessage({__playground:true,type:type,text:Array.prototype.map.call(args,fmt).join(' ')},'*')}catch(e){}}
['log','info','warn','error'].forEach(function(t){var o=console[t];console[t]=function(){send(t,arguments);o&&o.apply(console,arguments)}});
window.addEventListener('error',function(e){send('error',[e.message+(e.lineno?' (baris '+e.lineno+')':'')])});
window.addEventListener('unhandledrejection',function(e){send('error',['Promise ditolak: '+(e.reason&&e.reason.message||e.reason)])});
})();<\/script>`;

export function buildSrcDoc({ html, css, js }: CodeDoc) {
  // Cegah </script> di dalam JS siswa menutup tag lebih awal.
  const safeJs = js.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style>${BRIDGE}</head><body>${html}<script>${safeJs}<\/script></body></html>`;
}

type LogLine = { type: "log" | "info" | "warn" | "error"; text: string };

type Props = {
  doc: CodeDoc;
  showConsole?: boolean;
  className?: string;
};

// Preview dijalankan di iframe sandbox TANPA allow-same-origin, jadi kode siswa
// tidak bisa membaca cookie, localStorage, atau sesi login situs ini.
export function CodePreview({ doc, showConsole = true, className }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const srcDoc = useMemo(() => buildSrcDoc(doc), [doc]);

  useEffect(() => {
    setLogs([]);
  }, [srcDoc]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const data = e.data as { __playground?: boolean; type?: LogLine["type"]; text?: string } | null;
      if (!data?.__playground || !data.type) return;
      setLogs((prev) => [...prev.slice(-199), { type: data.type!, text: String(data.text ?? "") }]);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const errorCount = logs.filter((l) => l.type === "error").length;

  return (
    <div className={`flex min-h-0 flex-col overflow-hidden rounded-md border bg-white ${className ?? ""}`}>
      <iframe
        ref={frame}
        title="Hasil kode"
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-modals allow-forms"
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />
      {showConsole && (
        <div className="border-t bg-muted/40 text-foreground">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-start gap-2 rounded-none px-3 text-xs"
            onClick={() => setConsoleOpen((o) => !o)}
          >
            <Terminal className="h-3.5 w-3.5" />
            Console
            {logs.length > 0 && (
              <span className={errorCount ? "text-destructive" : "text-muted-foreground"}>
                ({logs.length}
                {errorCount ? `, ${errorCount} error` : ""})
              </span>
            )}
          </Button>
          {consoleOpen && (
            <div className="max-h-40 overflow-auto px-3 pb-2 font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">Belum ada output.</p>
              ) : (
                logs.map((l, i) => (
                  <div
                    key={i}
                    className={
                      l.type === "error"
                        ? "text-destructive"
                        : l.type === "warn"
                          ? "text-amber-600 dark:text-amber-400"
                          : ""
                    }
                  >
                    {l.text}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
