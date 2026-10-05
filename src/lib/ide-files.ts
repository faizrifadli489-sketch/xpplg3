// Logika murni untuk playground multi-file: bahasa, path, tree, dan perakit preview web.
// Sengaja tanpa import CodeMirror/React supaya ringan dan aman dipakai di server maupun browser.

export type IdeFile = { path: string; content: string };

export type CodeLanguage =
  | "html"
  | "css"
  | "js"
  | "ts"
  | "json"
  | "markdown"
  | "python"
  | "cpp"
  | "java"
  | "php"
  | "sql"
  | "text";

export const MAX_FILES = 60;
export const MAX_FILE_CHARS = 100_000;
export const MAX_TOTAL_CHARS = 300_000;
export const KEEP_FILE = ".gitkeep"; // penanda folder kosong, disembunyikan dari tree

const EXT_LANG: Record<string, CodeLanguage> = {
  html: "html",
  htm: "html",
  css: "css",
  js: "js",
  mjs: "js",
  cjs: "js",
  jsx: "js",
  ts: "ts",
  tsx: "ts",
  json: "json",
  md: "markdown",
  markdown: "markdown",
  py: "python",
  c: "cpp",
  h: "cpp",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  java: "java",
  php: "php",
  sql: "sql",
};

export function extOf(path: string) {
  const name = path.split("/").pop() ?? "";
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function baseName(path: string) {
  return path.split("/").pop() ?? path;
}

export function dirOf(path: string) {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

export function languageOf(path: string): CodeLanguage {
  return EXT_LANG[extOf(path)] ?? "text";
}

// ---------- Menjalankan ----------

export type ServerLang = "python" | "c" | "cpp" | "java" | "php" | "sqlite";

export const SERVER_LANG_LABEL: Record<ServerLang, string> = {
  python: "Python",
  c: "C",
  cpp: "C++",
  java: "Java",
  php: "PHP",
  sqlite: "SQL (SQLite)",
};

export type RunTarget =
  | { kind: "web" }
  | { kind: "server"; language: ServerLang }
  | { kind: "none"; reason: string };

export function runTargetFor(path: string): RunTarget {
  switch (extOf(path)) {
    case "html":
    case "htm":
    case "css":
    case "js":
    case "mjs":
      return { kind: "web" };
    case "py":
      return { kind: "server", language: "python" };
    case "c":
      return { kind: "server", language: "c" };
    case "cpp":
    case "cc":
    case "cxx":
      return { kind: "server", language: "cpp" };
    case "java":
      return { kind: "server", language: "java" };
    case "php":
      return { kind: "server", language: "php" };
    case "sql":
      return { kind: "server", language: "sqlite" };
    case "ts":
    case "tsx":
    case "jsx":
      return { kind: "none", reason: "TypeScript/JSX belum bisa dijalankan. Pakai file .js." };
    default:
      return { kind: "none", reason: "File jenis ini tidak bisa dijalankan." };
  }
}

// ---------- Path ----------

const SEGMENT = /^[A-Za-z0-9._-]{1,100}$/;

export function normalizePath(input: string): { ok: true; path: string } | { ok: false; error: string } {
  const cleaned = input.trim().replace(/\\/g, "/").replace(/^\.?\/+/, "").replace(/\/+/g, "/").replace(/\/$/, "");
  if (!cleaned) return { ok: false, error: "Nama tidak boleh kosong." };
  if (cleaned.length > 200) return { ok: false, error: "Nama terlalu panjang." };
  const parts = cleaned.split("/");
  if (parts.length > 6) return { ok: false, error: "Folder terlalu dalam (maks 6 tingkat)." };
  for (const seg of parts) {
    if (seg === "." || seg === "..") return { ok: false, error: "Nama tidak valid." };
    if (!SEGMENT.test(seg)) return { ok: false, error: "Pakai huruf, angka, titik, strip, atau garis bawah (tanpa spasi)." };
  }
  return { ok: true, path: cleaned };
}

export function joinPath(dir: string, name: string) {
  return dir ? `${dir}/${name}` : name;
}

export function isFolder(files: IdeFile[], path: string) {
  const prefix = `${path}/`;
  return files.some((f) => f.path.startsWith(prefix));
}

export function pathExists(files: IdeFile[], path: string) {
  return files.some((f) => f.path === path) || isFolder(files, path);
}

export function deletePath(files: IdeFile[], target: string): IdeFile[] {
  const prefix = `${target}/`;
  return files.filter((f) => f.path !== target && !f.path.startsWith(prefix));
}

export function renamePath(files: IdeFile[], from: string, to: string): IdeFile[] {
  const prefix = `${from}/`;
  return files.map((f) => {
    if (f.path === from) return { ...f, path: to };
    if (f.path.startsWith(prefix)) return { ...f, path: `${to}/${f.path.slice(prefix.length)}` };
    return f;
  });
}

export function totalChars(files: IdeFile[]) {
  return files.reduce((n, f) => n + f.content.length, 0);
}

// Data dari database (jsonb) dibersihkan sebelum dipakai di UI.
export function parseFiles(value: unknown): IdeFile[] {
  if (!Array.isArray(value)) return [];
  const out: IdeFile[] = [];
  for (const item of value) {
    if (item && typeof item === "object" && typeof (item as IdeFile).path === "string") {
      out.push({ path: (item as IdeFile).path, content: String((item as IdeFile).content ?? "") });
    }
  }
  return out;
}

// ---------- Tree ----------

export type TreeNode = { name: string; path: string; type: "file" | "folder"; children: TreeNode[] };

export function buildTree(files: IdeFile[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", type: "folder", children: [] };

  const ensureFolder = (parent: TreeNode, name: string, path: string) => {
    let node = parent.children.find((c) => c.type === "folder" && c.name === name);
    if (!node) {
      node = { name, path, type: "folder", children: [] };
      parent.children.push(node);
    }
    return node;
  };

  for (const f of files) {
    const parts = f.path.split("/");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = ensureFolder(cur, parts[i], parts.slice(0, i + 1).join("/"));
    }
    const name = parts[parts.length - 1];
    if (name === KEEP_FILE) continue;
    cur.children.push({ name, path: f.path, type: "file", children: [] });
  }

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1));
    nodes.forEach((n) => sort(n.children));
  };
  sort(root.children);
  return root.children;
}

// ---------- Template file baru ----------

export function templateFor(path: string): string {
  switch (extOf(path)) {
    case "html":
      return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Halaman baru</title>
</head>
<body>

</body>
</html>
`;
    case "py":
      return `print("Halo, dunia!")\n`;
    case "c":
      return `#include <stdio.h>\n\nint main(void) {\n    printf("Halo, dunia!\\n");\n    return 0;\n}\n`;
    case "cpp":
    case "cc":
    case "cxx":
      return `#include <iostream>\n\nint main() {\n    std::cout << "Halo, dunia!" << std::endl;\n    return 0;\n}\n`;
    case "java":
      return `// Nama kelas harus Main\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Halo, dunia!");\n    }\n}\n`;
    case "php":
      return `<?php\n\necho "Halo, dunia!\\n";\n`;
    case "sql":
      return `CREATE TABLE siswa (id INTEGER PRIMARY KEY, nama TEXT);\nINSERT INTO siswa (nama) VALUES ('Budi'), ('Sari');\nSELECT * FROM siswa;\n`;
    case "json":
      return `{\n  \n}\n`;
    case "md":
      return `# Judul\n\nTulis di sini.\n`;
    default:
      return "";
  }
}

export const STARTER_FILES: IdeFile[] = [
  {
    path: "index.html",
    content: `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Proyekku</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Halo, dunia!</h1>
  <button id="btn">Klik aku</button>
  <p id="out"></p>
  <script src="script.js"></script>
</body>
</html>
`,
  },
  {
    path: "style.css",
    content: `body {
  font-family: system-ui, sans-serif;
  text-align: center;
  padding: 2rem;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 8px;
}
`,
  },
  {
    path: "script.js",
    content: `let hitung = 0;

document.getElementById("btn").addEventListener("click", () => {
  hitung++;
  document.getElementById("out").textContent = "Diklik " + hitung + " kali";
  console.log("klik ke-" + hitung);
});
`,
  },
];

// ---------- Preview web ----------

// Skrip kecil di dalam iframe: meneruskan console.* dan error ke halaman induk.
const BRIDGE = `<script>(function(){
function fmt(a){try{return typeof a==='string'?a:JSON.stringify(a,function(k,v){return typeof v==='function'?'[fungsi]':v})}catch(e){return String(a)}}
function send(type,args){try{parent.postMessage({__playground:true,type:type,text:Array.prototype.map.call(args,fmt).join(' ')},'*')}catch(e){}}
['log','info','warn','error'].forEach(function(t){var o=console[t];console[t]=function(){send(t,arguments);o&&o.apply(console,arguments)}});
window.addEventListener('error',function(e){send('error',[e.message+(e.lineno?' (baris '+e.lineno+')':'')])});
window.addEventListener('unhandledrejection',function(e){send('error',['Promise ditolak: '+(e.reason&&e.reason.message||e.reason)])});
})();</script>`;

function resolveRef(baseDir: string, ref: string): string | null {
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(ref) || /^(data|blob|mailto|javascript):/i.test(ref)) return null;
  const clean = ref.split("#")[0].split("?")[0];
  if (!clean) return null;
  const parts = clean.startsWith("/") ? [] : baseDir ? baseDir.split("/") : [];
  for (const seg of clean.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      if (!parts.length) return null;
      parts.pop();
    } else parts.push(seg);
  }
  return parts.join("/");
}

const escScript = (s: string) => s.replace(/<\/script/gi, "<\\/script");
const escStyle = (s: string) => s.replace(/<\/style/gi, "<\\/style");

export function hasWebEntry(files: IdeFile[]) {
  return files.some((f) => extOf(f.path) === "html" || extOf(f.path) === "htm");
}

// Merakit satu dokumen HTML dari file virtual: <link rel=stylesheet> dan <script src> yang menunjuk
// ke file proyek diganti dengan isinya (inline), karena iframe sandbox tidak bisa memuat file lokal.
export function buildWebDoc(files: IdeFile[], activePath: string | null): string {
  const map = new Map(files.map((f) => [f.path, f.content]));
  const isHtml = (p: string) => /\.html?$/i.test(p);

  let entry: string | null = null;
  if (map.has("index.html")) entry = "index.html";
  else if (activePath && isHtml(activePath) && map.has(activePath)) entry = activePath;
  else entry = files.find((f) => isHtml(f.path))?.path ?? null;

  if (!entry) {
    // Tanpa file HTML: jalankan JS aktif di halaman kosong, dengan semua CSS proyek.
    const css = files.filter((f) => extOf(f.path) === "css").map((f) => f.content).join("\n");
    const js = activePath && extOf(activePath) === "js" ? (map.get(activePath) ?? "") : "";
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${escStyle(css)}</style>${BRIDGE}</head><body><script>${escScript(js)}</script></body></html>`;
  }

  const dir = entry.includes("/") ? entry.slice(0, entry.lastIndexOf("/")) : "";
  let out = map.get(entry) ?? "";

  out = out.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) return tag;
    const m = tag.match(/href\s*=\s*(["'])(.*?)\1/i);
    if (!m) return tag;
    const p = resolveRef(dir, m[2]);
    const content = p ? map.get(p) : undefined;
    return content === undefined ? tag : `<style>${escStyle(content)}</style>`;
  });

  out = out.replace(
    /<script\b([^>]*?)\bsrc\s*=\s*(["'])(.*?)\2([^>]*)>\s*<\/script>/gi,
    (tag, pre: string, _q: string, src: string, post: string) => {
      const p = resolveRef(dir, src);
      const content = p ? map.get(p) : undefined;
      if (content === undefined) return tag;
      const attrs = `${pre} ${post}`.replace(/\s+/g, " ").trim();
      return `<script${attrs ? " " + attrs : ""}>${escScript(content)}</script>`;
    },
  );

  if (/<head[^>]*>/i.test(out)) out = out.replace(/<head[^>]*>/i, (m) => m + BRIDGE);
  else out = out.replace(/^(\s*<!doctype[^>]*>)?/i, (m) => m + BRIDGE);
  return out;
}
