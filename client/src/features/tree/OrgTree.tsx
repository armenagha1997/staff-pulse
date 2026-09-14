import styled from "styled-components";
import type { TreeNode } from "@/lib/tree";
import { TreeRow } from "@/features/tree/TreeRow";

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

const Branch = styled.div`
  overflow: hidden;
`;

interface OrgTreeProps {
  tree: TreeNode[];
  expandedIds: Set<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

function TreeBranch({ tree, expandedIds, selectedId, onToggle, onSelect }: OrgTreeProps) {
  return (
    <>
      {tree.map((node) => {
        const expanded = expandedIds.has(node.id);
        return (
          <div key={node.id}>
            <TreeRow
              node={node}
              expanded={expanded}
              selected={node.id === selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
            {node.children.length > 0 && expanded && (
              <Branch>
                <TreeBranch
                  tree={node.children}
                  expandedIds={expandedIds}
                  selectedId={selectedId}
                  onToggle={onToggle}
                  onSelect={onSelect}
                />
              </Branch>
            )}
          </div>
        );
      })}
    </>
  );
}

export function OrgTree(props: OrgTreeProps) {
  return (
    <List role="tree">
      <TreeBranch {...props} />
    </List>
  );
}
