import { useMemo, useState } from "react";
import { baseName, buildTree, extOf, type IdeFile, type TreeNode } from "@/lib/ide-files";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Trash2,
} from "lucide-react";

const CODE_EXT = new Set(["html", "htm", "css", "js", "mjs", "ts", "tsx", "jsx", "json", "py", "c", "h", "cpp", "cc", "hpp", "java", "php", "sql"]);

function FileIcon({ path }: { path: string }) {
  const ext = extOf(path);
  if (CODE_EXT.has(ext)) return <FileCode className="h-4 w-4 shrink-0 text-primary/80" />;
  if (ext === "md" || ext === "txt") return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <File className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

type Props = {
  files: IdeFile[];
  activePath: string | null;
  selected: string | null;
  onSelect: (path: string | null) => void;
  onOpen: (path: string) => void;
  onNewFile?: () => void;
  onNewFolder?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
};

// Explorer ala VS Code. Aksi (baru/ganti nama/hapus) bekerja pada item yang sedang dipilih,
// supaya nyaman dipakai di layar sentuh.
export function FileTree({ files, activePath, selected, onSelect, onOpen, onNewFile, onNewFolder, onRename, onDelete }: Props) {
  const tree = useMemo(() => buildTree(files), [files]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (path: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const renderNode = (node: TreeNode, depth: number) => {
    const isSelected = selected === node.path;
    const pad = { paddingLeft: `${depth * 12 + 8}px` };

    if (node.type === "folder") {
      const open = !collapsed.has(node.path);
      return (
        <div key={`d:${node.path}`}>
          <button
            type="button"
            style={pad}
            onClick={() => {
              toggle(node.path);
              onSelect(node.path);
            }}
            className={`flex w-full items-center gap-1.5 py-1.5 pr-2 text-left text-sm hover:bg-muted ${isSelected ? "bg-muted" : ""}`}
          >
            {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            {open ? <FolderOpen className="h-4 w-4 shrink-0 text-amber-600" /> : <Folder className="h-4 w-4 shrink-0 text-amber-600" />}
            <span className="truncate">{node.name}</span>
          </button>
          {open && node.children.map((c) => renderNode(c, depth + 1))}
        </div>
      );
    }

    const isActive = activePath === node.path;
    return (
      <button
        key={`f:${node.path}`}
        type="button"
        style={{ paddingLeft: `${depth * 12 + 24}px` }}
        onClick={() => {
          onSelect(node.path);
          onOpen(node.path);
        }}
        className={`flex w-full items-center gap-1.5 py-1.5 pr-2 text-left text-sm hover:bg-muted ${
          isActive ? "bg-primary/10 font-medium text-foreground" : isSelected ? "bg-muted" : ""
        }`}
      >
        <FileIcon path={node.path} />
        <span className="truncate">{node.name}</span>
      </button>
    );
  };

  const editable = !!onNewFile;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b px-2 py-1.5">
        <span className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Explorer</span>
        {editable && (
          <div className="flex items-center">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="File baru" onClick={onNewFile}>
              <FilePlus className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Folder baru" onClick={onNewFolder}>
              <FolderPlus className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Ganti nama" disabled={!selected} onClick={onRename}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Hapus" disabled={!selected} onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto py-1" onClick={(e) => e.target === e.currentTarget && onSelect(null)}>
        {tree.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Belum ada file.</p>
        ) : (
          tree.map((n) => renderNode(n, 0))
        )}
      </div>
      {selected && editable && (
        <div className="truncate border-t px-3 py-1 text-xs text-muted-foreground">Dipilih: {baseName(selected)}</div>
      )}
    </div>
  );
}
