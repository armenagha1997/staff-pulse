import { useCallback, useRef, useState } from "react";
import type { OrgNode, OrgNodePatch } from "@/api/schema";
import { useOrgTreeLiveSocket, type ConnectionStatus } from "@/api/liveSocket";
import { computeRollups, rowFromRollup, type AggregatedRow, type Rollup } from "@/lib/aggregate";
import { useFadingHighlights } from "@/lib/useFadingHighlights";
import { applyLivePatch } from "@/lib/liveUpdate";
import { buildTree, flattenTree, type TreeNode } from "@/lib/tree";

export interface LiveOrgData {
  tree: TreeNode[];
  aggregatedRows: AggregatedRow[];
  updatedIds: Set<string>;
  connectionStatus: ConnectionStatus;
}

// Owns the mutable tree/rollup model: `nodesById`/`aggById`/`orderRef` are
// refs (not state) because they're the model live patches mutate directly;
// `tree`/`aggregatedRows` are the React-visible snapshots, only replaced
// with freshly-cloned data for the nodes a patch actually touched.
export function useLiveOrgData(nodes: OrgNode[]): LiveOrgData {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [aggregatedRows, setAggregatedRows] = useState<AggregatedRow[]>([]);
  const { highlighted, trigger } = useFadingHighlights();

  const treeRef = useRef<TreeNode[]>([]);
  const nodesByIdRef = useRef<Map<string, TreeNode>>(new Map());
  const aggByIdRef = useRef<Map<string, Rollup>>(new Map());
  const orderRef = useRef<string[]>([]);
  const lastNodesRef = useRef<OrgNode[] | null>(null);

  // Full O(n) (re)build — only when `nodes` actually changes reference (a
  // real data load/refetch), never on a live patch. Comparing against a ref
  // and setting state directly during render is React's documented pattern
  // for "reset state when a prop changes" (react.dev/learn/you-might-not-need-an-effect),
  // avoiding an extra effect-triggered render pass. oxlint's react/refs rule
  // can't distinguish this guarded reset from an unsafe read, hence the
  // disable below.
  // oxlint-disable-next-line react/refs
  if (lastNodesRef.current !== nodes) {
    // oxlint-disable-next-line react/refs
    lastNodesRef.current = nodes;

    const builtTree = buildTree(nodes);
    const { aggById, order } = computeRollups(builtTree);
    const nodesById = new Map(flattenTree(builtTree).map((node) => [node.id, node]));

    // oxlint-disable-next-line react/refs
    treeRef.current = builtTree;
    // oxlint-disable-next-line react/refs
    nodesByIdRef.current = nodesById;
    // oxlint-disable-next-line react/refs
    aggByIdRef.current = aggById;
    // oxlint-disable-next-line react/refs
    orderRef.current = order;

    setTree(builtTree);
    setAggregatedRows(order.map((id) => rowFromRollup(nodesById.get(id)!, aggById.get(id)!)));
  }

  const applyPatch = useCallback(
    (patch: OrgNodePatch) => {
      const result = applyLivePatch(treeRef.current, nodesByIdRef.current, aggByIdRef.current, patch);
      if (!result) return;

      treeRef.current = result.tree;
      setTree(result.tree);

      const touchedSet = new Set(result.touchedIds);
      setAggregatedRows((prevRows) =>
        orderRef.current.map((id, index) =>
          touchedSet.has(id)
            ? rowFromRollup(nodesByIdRef.current.get(id)!, aggByIdRef.current.get(id)!)
            : prevRows[index],
        ),
      );

      result.touchedIds.forEach(trigger);
    },
    [trigger],
  );

  const connectionStatus = useOrgTreeLiveSocket(applyPatch);

  return { tree, aggregatedRows, updatedIds: highlighted, connectionStatus };
}
