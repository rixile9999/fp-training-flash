/** Dependency graphs (skill prerequisites, unit prerequisites). */

/** A cycle as [a, b, ..., a], or null. Edges to unknown nodes and self-edges are ignored (reported separately). */
export function findCycle(graph: ReadonlyMap<string, readonly string[]>): string[] | null {
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const visit = (node: string): string[] | null => {
    const st = state.get(node);
    if (st === "done") return null;
    if (st === "visiting") return [...stack.slice(stack.indexOf(node)), node];
    state.set(node, "visiting");
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      if (next === node || !graph.has(next)) continue; // reported separately
      const c = visit(next);
      if (c) return c;
    }
    stack.pop();
    state.set(node, "done");
    return null;
  };
  for (const node of graph.keys()) {
    const c = visit(node);
    if (c) return c;
  }
  return null;
}
