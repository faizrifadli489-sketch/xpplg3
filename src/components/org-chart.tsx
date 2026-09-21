import { useMemo } from "react";
import { User } from "lucide-react";
import { buildOrgTree, type OrgNode } from "@/lib/org-tree";

export type OrgPerson = {
  id: string;
  title: string;
  student_name: string;
  photo_url: string | null;
  parent_id: string | null;
  order_index: number;
};

function Avatar({ person, size }: { person: OrgPerson; size: "lg" | "sm" }) {
  const box = size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const icon = size === "lg" ? "h-6 w-6" : "h-5 w-5";
  return (
    <div className={`flex ${box} shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted`}>
      {person.photo_url ? (
        <img src={person.photo_url} alt={person.student_name} className="h-full w-full object-cover" />
      ) : (
        <User className={`${icon} text-muted-foreground`} />
      )}
    </div>
  );
}

// Layar lebar: bagan pohon dengan garis penghubung (gaya di styles.css: .org-chart)
function ChartBranch({ nodes }: { nodes: OrgNode<OrgPerson>[] }) {
  return (
    <ul>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex w-40 flex-col items-center rounded-lg border border-border bg-card px-3 py-3 text-center shadow-sm">
            <div className="ring-2 ring-primary/20 rounded-full">
              <Avatar person={node} size="lg" />
            </div>
            <p className="mt-2 text-sm font-medium leading-tight text-foreground">{node.student_name}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{node.title}</p>
          </div>
          {node.children.length > 0 && <ChartBranch nodes={node.children} />}
        </li>
      ))}
    </ul>
  );
}

// Layar kecil: pohon vertikal dengan indentasi supaya tidak perlu geser ke samping
function ListBranch({ nodes, nested = false }: { nodes: OrgNode<OrgPerson>[]; nested?: boolean }) {
  return (
    <ul className={nested ? "mt-3 ml-5 space-y-3 border-l-2 border-border pl-4" : "space-y-3"}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-3">
            <Avatar person={node} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{node.student_name}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{node.title}</p>
            </div>
          </div>
          {node.children.length > 0 && <ListBranch nodes={node.children} nested />}
        </li>
      ))}
    </ul>
  );
}

export function OrgChart({ positions }: { positions: OrgPerson[] }) {
  const roots = useMemo(() => buildOrgTree(positions), [positions]);

  return (
    <>
      <div className="hidden overflow-x-auto pb-4 md:block">
        <div className="org-chart mx-auto w-max">
          <ChartBranch nodes={roots} />
        </div>
      </div>
      <div className="md:hidden">
        <ListBranch nodes={roots} />
      </div>
    </>
  );
}
