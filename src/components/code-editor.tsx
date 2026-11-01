import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { php } from "@codemirror/lang-php";
import { sql } from "@codemirror/lang-sql";
import type { CodeLanguage } from "@/lib/ide-files";
import { oneDark } from "@codemirror/theme-one-dark";

// Bahasa + lebar indent: Python/C/C++/Java/PHP/SQL 4 spasi, web 2 spasi.
function languageExtension(language: CodeLanguage) {
  const unit = (n: number) => indentUnit.of(" ".repeat(n));
  switch (language) {
    case "html":
      return [html(), unit(2)];
    case "css":
      return [css(), unit(2)];
    case "js":
      return [javascript(), unit(2)];
    case "ts":
      return [javascript({ typescript: true }), unit(2)];
    case "json":
      return [json(), unit(2)];
    case "markdown":
      return [markdown(), unit(2)];
    case "python":
      return [python(), unit(4)];
    case "cpp":
      return [cpp(), unit(4)];
    case "java":
      return [java(), unit(4)];
    case "php":
      return [php(), unit(4)];
    case "sql":
      return [sql(), unit(2)];
    default:
      return [unit(2)];
  }
}

const baseTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "14px" },
  ".cm-scroller": { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)", overflow: "auto" },
  ".cm-content": { paddingBottom: "2rem" },
});

type Props = {
  value: string;
  onChange?: (value: string) => void;
  language: CodeLanguage;
  dark?: boolean;
  readOnly?: boolean;
  /** Tekan Ctrl/Cmd + Enter di dalam editor */
  onRun?: () => void;
};

// Editor kode berbasis CodeMirror 6: warna sintaks, auto-indent saat Enter,
// tutup kurung/kutip/tag otomatis, Tab untuk indent.
export function CodeEditor({ value, onChange, language, dark = false, readOnly = false, onRun }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const langCompartment = useRef(new Compartment());
  const themeCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());
  // Callback disimpan di ref supaya editor tidak dibuat ulang tiap render.
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              onRunRef.current?.();
              return true;
            },
          },
          indentWithTab,
        ]),
        EditorView.lineWrapping,
        baseTheme,
        langCompartment.current.of(languageExtension(language)),
        themeCompartment.current.of(dark ? oneDark : []),
        readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
        }),
      ],
    });
    view.current = new EditorView({ state, parent: host.current });
    return () => {
      view.current?.destroy();
      view.current = null;
    };
    // Editor dibuat sekali; perubahan lain ditangani effect di bawah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    view.current?.dispatch({ effects: langCompartment.current.reconfigure(languageExtension(language)) });
  }, [language]);

  useEffect(() => {
    view.current?.dispatch({ effects: themeCompartment.current.reconfigure(dark ? oneDark : []) });
  }, [dark]);

  useEffect(() => {
    view.current?.dispatch({
      effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly]);

  // Sinkronkan kalau isi diganti dari luar (misal memuat karya yang sudah ada).
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const current = v.state.doc.toString();
    if (current !== value) {
      v.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  return <div ref={host} className="h-full min-h-0 overflow-hidden rounded-md border bg-background" />;
}

export default CodeEditor;
