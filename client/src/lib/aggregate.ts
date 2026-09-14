import type { TreeNode } from "@/lib/tree";

export interface AggregatedRow {
  id: string;
  name: string;
  level: number;
  totalHeadcount: number;
  totalBudget: number;
  avgPerformance: number;
}

interface Rollup {
  headcount: number;
  budget: number;
  weightedPerformance: number;
}

function visit(node: TreeNode, out: AggregatedRow[]): Rollup {
  let headcount = node.headcount;
  let budget = node.budget;
  let weightedPerformance = node.headcount * node.performance;

  for (const child of node.children) {
    const rollup = visit(child, out);
    headcount += rollup.headcount;
    budget += rollup.budget;
    weightedPerformance += rollup.weightedPerformance;
  }

  out.push({
    id: node.id,
    name: node.name,
    level: node.level,
    totalHeadcount: headcount,
    totalBudget: budget,
    avgPerformance: headcount > 0 ? weightedPerformance / headcount : 0,
  });

  return { headcount, budget, weightedPerformance };
}

// Aggregates each node's own values with every descendant's, weighting the
// average performance by headcount. Runs once per tree (O(n), post-order).
export function aggregateTree(tree: TreeNode[]): AggregatedRow[] {
  const rows: AggregatedRow[] = [];
  for (const root of tree) {
    visit(root, rows);
  }
  return rows;
}
