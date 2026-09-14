import type { OrgNodePatch } from "@/api/schema";
import { recomputeOwnRollup, type Rollup } from "@/lib/aggregate";
import { cloneAlongChain, idChain, type TreeNode } from "@/lib/tree";

export interface LiveUpdateResult {
  tree: TreeNode[];
  // Patched node first, then its ancestors up to the root — every id whose
  // rollup actually changed as a result of this patch.
  touchedIds: string[];
}

// Applies a live patch to the tree in three O(depth) steps:
//   1. mutate the matched node's own fields in place,
//   2. walk that node's ancestor chain, recomputing each rollup from its
//      OWN fields + its direct children's already-known rollups,
//   3. clone only the nodes on that chain so React sees a new top-level
//      array; every sibling subtree keeps its original object identity.
// `nodesById`/`aggById` are mutated in place and are the caller's source of
// truth — the caller must also adopt the returned tree's clones into
// `nodesById` (see useLiveOrgData) so the *next* patch mutates the node that
// is actually still part of the rendered tree, not an orphaned pre-clone copy.
export function applyLivePatch(
  tree: TreeNode[],
  nodesById: Map<string, TreeNode>,
  aggById: Map<string, Rollup>,
  patch: OrgNodePatch,
): LiveUpdateResult | null {
  const node = nodesById.get(patch.id);
  if (!node) return null;

  Object.assign(node, patch.changes);

  const chain = idChain(nodesById, patch.id); // [rootId, ..., patch.id]
  const touchedIds = [...chain].reverse(); // patch.id first, then ancestors

  for (const id of touchedIds) {
    const current = nodesById.get(id);
    if (current) {
      aggById.set(id, recomputeOwnRollup(current, aggById));
    }
  }

  const { roots, clonedById } = cloneAlongChain(tree, chain);
  for (const [id, clone] of clonedById) {
    nodesById.set(id, clone);
  }

  return { tree: roots, touchedIds };
}
