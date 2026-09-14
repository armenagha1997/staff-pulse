import { describe, expect, it } from "vitest";
import type { OrgNode } from "@/api/schema";
import { computeRollups } from "@/lib/aggregate";
import { applyLivePatch } from "@/lib/liveUpdate";
import { buildTree, flattenTree } from "@/lib/tree";

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

// division
//  ├─ deptA
//  │   └─ teamA
//  └─ deptB
//      └─ teamB
function setup() {
  const nodes: OrgNode[] = [
    node({ id: "division", parentId: null, headcount: 1, budget: 1000, performance: 50 }),
    node({ id: "deptA", parentId: "division", headcount: 2, budget: 2000, performance: 60 }),
    node({ id: "teamA", parentId: "deptA", headcount: 3, budget: 3000, performance: 70 }),
    node({ id: "deptB", parentId: "division", headcount: 4, budget: 4000, performance: 80 }),
    node({ id: "teamB", parentId: "deptB", headcount: 5, budget: 5000, performance: 90 }),
  ];
  const tree = buildTree(nodes);
  const { aggById } = computeRollups(tree);
  const nodesById = new Map(flattenTree(tree).map((n) => [n.id, n]));
  return { tree, aggById, nodesById };
}

describe("applyLivePatch", () => {
  it("returns null for an unknown node id", () => {
    const { tree, aggById, nodesById } = setup();
    const result = applyLivePatch(tree, nodesById, aggById, {
      type: "node-updated",
      id: "does-not-exist",
      changes: { headcount: 99 },
    });
    expect(result).toBeNull();
  });

  it("touches only the patched node and its ancestors, not unrelated branches", () => {
    const { tree, aggById, nodesById } = setup();
    const result = applyLivePatch(tree, nodesById, aggById, {
      type: "node-updated",
      id: "teamA",
      changes: { headcount: 30 },
    });

    expect(result?.touchedIds).toEqual(["teamA", "deptA", "division"]);
  });

  it("recomputes ancestor totals to reflect the patched descendant", () => {
    const { tree, aggById, nodesById } = setup();
    // deptA total before: own(2) + teamA(3) = 5; division total before: 1+5+ (deptB:4+5=9) = 15
    applyLivePatch(tree, nodesById, aggById, {
      type: "node-updated",
      id: "teamA",
      changes: { headcount: 30 },
    });

    expect(aggById.get("teamA")?.headcount).toBe(30);
    expect(aggById.get("deptA")?.headcount).toBe(32); // 2 + 30
    expect(aggById.get("division")?.headcount).toBe(42); // 1 + 32 + deptB's 9 (unchanged)
    // deptB's own subtree is untouched by a patch to teamA.
    expect(aggById.get("deptB")?.headcount).toBe(9);
  });

  it("preserves object identity for sibling subtrees not on the patched path", () => {
    const { tree, aggById, nodesById } = setup();
    const originalDeptB = tree[0].children.find((n) => n.id === "deptB");

    const result = applyLivePatch(tree, nodesById, aggById, {
      type: "node-updated",
      id: "teamA",
      changes: { headcount: 30 },
    });

    const newDivision = result!.tree[0];
    const newDeptB = newDivision.children.find((n) => n.id === "deptB");
    const newDeptA = newDivision.children.find((n) => n.id === "deptA");

    expect(newDeptB).toBe(originalDeptB); // untouched sibling — same reference
    expect(newDeptA).not.toBe(tree[0].children.find((n) => n.id === "deptA")); // on the path — new reference
    expect(newDivision).not.toBe(tree[0]); // root is always on the path — new reference
  });

  it("mutates the node's own fields so the clone reflects the patch", () => {
    const { tree, aggById, nodesById } = setup();
    const result = applyLivePatch(tree, nodesById, aggById, {
      type: "node-updated",
      id: "teamA",
      changes: { headcount: 30, performance: 12 },
    });

    const patchedNode = result!.tree[0].children
      .find((n) => n.id === "deptA")!
      .children.find((n) => n.id === "teamA")!;

    expect(patchedNode.headcount).toBe(30);
    expect(patchedNode.performance).toBe(12);
  });

  it("keeps nodesById pointing at the live (cloned) ancestors for the next patch", () => {
    const { tree, aggById, nodesById } = setup();
    const first = applyLivePatch(tree, nodesById, aggById, {
      type: "node-updated",
      id: "teamA",
      changes: { headcount: 30 },
    })!;

    // A second patch, applied against the tree returned by the first patch,
    // touches the root again — nodesById must resolve "division" to the
    // clone from the first patch, not the original pre-clone object.
    const second = applyLivePatch(first.tree, nodesById, aggById, {
      type: "node-updated",
      id: "teamB",
      changes: { headcount: 50 },
    });

    expect(second?.touchedIds).toEqual(["teamB", "deptB", "division"]);
    expect(aggById.get("division")?.headcount).toBe(87); // 1 + deptA(32) + deptB(4+50)
    expect(second?.tree[0]).not.toBe(first.tree[0]);
  });
});
