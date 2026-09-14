import { flattenTree, type TreeNode } from "@/lib/tree";

export interface AggregatedRow {
  id: string;
  name: string;
  level: number;
  totalHeadcount: number;
  totalBudget: number;
  avgPerformance: number;
}

export interface Rollup {
  headcount: number;
  budget: number;
  weightedPerformance: number;
}

export function rowFromRollup(node: TreeNode, rollup: Rollup): AggregatedRow {
  return {
    id: node.id,
    name: node.name,
    level: node.level,
    totalHeadcount: rollup.headcount,
    totalBudget: rollup.budget,
    avgPerformance: rollup.headcount > 0 ? rollup.weightedPerformance / rollup.headcount : 0,
  };
}

function visitRollup(node: TreeNode, aggById: Map<string, Rollup>, order: string[]): Rollup {
  let headcount = node.headcount;
  let budget = node.budget;
  let weightedPerformance = node.headcount * node.performance;

  for (const child of node.children) {
    const childRollup = visitRollup(child, aggById, order);
    headcount += childRollup.headcount;
    budget += childRollup.budget;
    weightedPerformance += childRollup.weightedPerformance;
  }

  const rollup: Rollup = { headcount, budget, weightedPerformance };
  aggById.set(node.id, rollup);
  order.push(node.id);
  return rollup;
}

// Full post-order pass, O(n). Run once per real data load (see docs/data-model.md).
export function computeRollups(tree: TreeNode[]): { aggById: Map<string, Rollup>; order: string[] } {
  const aggById = new Map<string, Rollup>();
  const order: string[] = [];
  for (const root of tree) {
    visitRollup(root, aggById, order);
  }
  return { aggById, order };
}

// Recomputes ONE node's rollup from its own (possibly just-mutated) fields
// plus its direct children's ALREADY-KNOWN rollups. O(direct children), not
// O(subtree) — this is what makes live-patch recomputation cheap: walking
// this from a patched node up to the root costs O(depth), never O(n).
export function recomputeOwnRollup(node: TreeNode, aggById: Map<string, Rollup>): Rollup {
  let headcount = node.headcount;
  let budget = node.budget;
  let weightedPerformance = node.headcount * node.performance;

  for (const child of node.children) {
    const childRollup = aggById.get(child.id);
    if (childRollup) {
      headcount += childRollup.headcount;
      budget += childRollup.budget;
      weightedPerformance += childRollup.weightedPerformance;
    }
  }

  return { headcount, budget, weightedPerformance };
}

// Aggregates each node's own values with every descendant's, weighting the
// average performance by headcount. Runs once per tree (O(n), post-order).
export function aggregateTree(tree: TreeNode[]): AggregatedRow[] {
  const { aggById, order } = computeRollups(tree);
  const nodesById = new Map(flattenTree(tree).map((node) => [node.id, node]));
  return order.map((id) => rowFromRollup(nodesById.get(id)!, aggById.get(id)!));
}
