import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export type RunResult = {
  language: string;
  status: string;
  stdout: string;
  stderr: string;
  compile: string;
  exitCode: number | null;
  time: string | null;
};

type Props = {
  result: RunResult | null;
  running: boolean;
  stdin: string;
  onStdinChange: (v: string) => void;
};

// Panel hasil untuk bahasa yang dijalankan di server (Python, C, C++, Java, PHP, SQL).
export function RunOutput({ result, running, stdin, onStdinChange }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-md border bg-background p-3 text-sm">
      <details>
        <summary className="cursor-pointer text-xs text-muted-foreground">Input program (stdin)</summary>
        <Textarea
          rows={3}
          maxLength={10000}
          value={stdin}
          onChange={(e) => onStdinChange(e.target.value)}
          placeholder="Isi yang dibaca program lewat input()/scanf/cin. Satu baris per input."
          className="mt-2 font-mono text-xs"
        />
      </details>

      <div className="min-h-0 flex-1 overflow-auto font-mono text-xs">
        {running ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menjalankan...
          </p>
        ) : !result ? (
          <p className="text-muted-foreground">Tekan Jalankan untuk melihat output di sini.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground">
              {result.language} · {result.status}
              {result.time ? ` · ${result.time}s` : ""}
              {result.exitCode !== null ? ` · exit ${result.exitCode}` : ""}
            </p>
            {result.compile && (
              <div>
                <p className="mb-1 font-sans text-xs font-medium">Compile</p>
                <pre className="whitespace-pre-wrap break-words text-destructive">{result.compile}</pre>
              </div>
            )}
            {result.stdout && (
              <div>
                <p className="mb-1 font-sans text-xs font-medium">Output</p>
                <pre className="whitespace-pre-wrap break-words">{result.stdout}</pre>
              </div>
            )}
            {result.stderr && (
              <div>
                <p className="mb-1 font-sans text-xs font-medium">Error</p>
                <pre className="whitespace-pre-wrap break-words text-destructive">{result.stderr}</pre>
              </div>
            )}
            {!result.compile && !result.stdout && !result.stderr && <p className="text-muted-foreground">(tidak ada output)</p>}
          </div>
        )}
      </div>
    </div>
  );
}
