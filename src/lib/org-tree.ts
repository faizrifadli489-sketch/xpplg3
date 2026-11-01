export type OrgRowLike = { id: string; parent_id: string | null; order_index: number };
export type OrgNode<T extends OrgRowLike> = T & { children: OrgNode<T>[] };

/** Ubah daftar datar (id + parent_id) menjadi pohon. Aman terhadap data siklus. */
export function buildOrgTree<T extends OrgRowLike>(rows: T[]): OrgNode<T>[] {
  const sorted = [...rows].sort((a, b) => a.order_index - b.order_index);
  const byId = new Map<string, OrgNode<T>>(sorted.map((r) => [r.id, { ...r, children: [] } as OrgNode<T>]));

  const roots: OrgNode<T>[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  }

  // Node yang tidak terjangkau dari root berarti berada di dalam siklus; jadikan root baru.
  const seen = new Set<string>();
  const walk = (node: OrgNode<T>) => {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    node.children.forEach(walk);
  };
  roots.forEach(walk);

  for (const node of byId.values()) {
    if (seen.has(node.id)) continue;
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    if (parent) parent.children = parent.children.filter((c) => c.id !== node.id);
    roots.push(node);
    walk(node);
  }

  return roots;
}

/** Semua keturunan dari sebuah node (dipakai supaya atasan tidak bisa dipilih dari bawahannya sendiri). */
export function descendantIds(rows: { id: string; parent_id: string | null }[], id: string): Set<string> {
  const result = new Set<string>();
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const row of rows) {
      if (row.parent_id === current && !result.has(row.id)) {
        result.add(row.id);
        stack.push(row.id);
      }
    }
  }
  return result;
}
