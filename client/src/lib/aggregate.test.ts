import { describe, expect, it } from "vitest";
import { aggregateTree } from "@/lib/aggregate";
import { buildTree } from "@/lib/tree";
import type { OrgNode } from "@/api/schema";

function node(overrides: Partial<OrgNode>): OrgNode {
  return {
    id: "id",
    name: "name",
    parentId: null,
    headcount: 0,
    budget: 0,
    performance: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("aggregateTree", () => {
  it("sums headcount and budget across a node and all its descendants", () => {
    const nodes: OrgNode[] = [
      node({ id: "division", parentId: null, headcount: 5, budget: 1_000_000, performance: 80 }),
      node({ id: "department", parentId: "division", headcount: 3, budget: 500_000, performance: 60 }),
      node({ id: "team", parentId: "department", headcount: 2, budget: 200_000, performance: 90 }),
    ];

    const rows = aggregateTree(buildTree(nodes));
    const byId = new Map(rows.map((row) => [row.id, row]));

    expect(byId.get("team")).toMatchObject({
      totalHeadcount: 2,
      totalBudget: 200_000,
      avgPerformance: 90,
    });
    expect(byId.get("department")).toMatchObject({
      totalHeadcount: 5, // 3 + 2
      totalBudget: 700_000, // 500_000 + 200_000
    });
    expect(byId.get("division")).toMatchObject({
      totalHeadcount: 10, // 5 + 3 + 2
      totalBudget: 1_700_000,
    });
  });

  it("weights average performance by headcount, not a plain mean", () => {
    const nodes: OrgNode[] = [
      node({ id: "parent", parentId: null, headcount: 0, budget: 0, performance: 0 }),
      node({ id: "big", parentId: "parent", headcount: 90, budget: 0, performance: 100 }),
      node({ id: "small", parentId: "parent", headcount: 10, budget: 0, performance: 0 }),
    ];

    const rows = aggregateTree(buildTree(nodes));
    const parent = rows.find((row) => row.id === "parent");

    // Plain mean of [100, 0] would be 50; headcount-weighted mean is 90.
    expect(parent?.avgPerformance).toBeCloseTo(90);
  });

  it("assigns level starting at 1 for roots and increasing per depth", () => {
    const nodes: OrgNode[] = [
      node({ id: "division", parentId: null }),
      node({ id: "department", parentId: "division" }),
      node({ id: "team", parentId: "department" }),
    ];

    const rows = aggregateTree(buildTree(nodes));
    const byId = new Map(rows.map((row) => [row.id, row]));

    expect(byId.get("division")?.level).toBe(1);
    expect(byId.get("department")?.level).toBe(2);
    expect(byId.get("team")?.level).toBe(3);
  });

  it("returns one row per node, including leaves with no children", () => {
    const nodes: OrgNode[] = [
      node({ id: "a", parentId: null }),
      node({ id: "b", parentId: "a" }),
      node({ id: "c", parentId: "a" }),
    ];

    const rows = aggregateTree(buildTree(nodes));
    expect(rows).toHaveLength(3);
  });

  it("handles an empty tree", () => {
    expect(aggregateTree(buildTree([]))).toEqual([]);
  });
});
