import { useMemo, useState } from "react";
import styled from "styled-components";
import type { OrgNode } from "@/api/schema";
import { buildTree, rootIds, type TreeNode } from "@/lib/tree";
import { TreeRow } from "@/features/tree/TreeRow";

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

const Branch = styled.div`
  overflow: hidden;
`;

interface TreeBranchProps {
  nodes: TreeNode[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}

function TreeBranch({ nodes, expandedIds, onToggle }: TreeBranchProps) {
  return (
    <>
      {nodes.map((node) => {
        const expanded = expandedIds.has(node.id);
        return (
          <div key={node.id}>
            <TreeRow node={node} expanded={expanded} onToggle={onToggle} />
            {node.children.length > 0 && expanded && (
              <Branch>
                <TreeBranch nodes={node.children} expandedIds={expandedIds} onToggle={onToggle} />
              </Branch>
            )}
          </div>
        );
      })}
    </>
  );
}

export function OrgTree({ nodes }: { nodes: OrgNode[] }) {
  const tree = useMemo(() => buildTree(nodes), [nodes]);

  // "Второй уровень открыт по умолчанию": root divisions start expanded so
  // departments (level 2) are visible without any interaction; deeper levels
  // stay collapsed until the user opens them.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(rootIds(nodes)));

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <List role="tree">
      <TreeBranch nodes={tree} expandedIds={expandedIds} onToggle={toggle} />
    </List>
  );
}
