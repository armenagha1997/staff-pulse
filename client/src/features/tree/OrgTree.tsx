import styled from "styled-components";
import type { TreeNode } from "@/lib/tree";
import { TreeRow } from "@/features/tree/TreeRow";

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

// grid-template-rows 0fr -> 1fr animates a dynamic-height element without
// JS measurement; the child needs to be a single grid item so it can shrink
// past its own content height (default grid item min-height is auto, so a
// nested wrapper is used purely to give the grid something to collapse).
const Branch = styled.div<{ $expanded: boolean }>`
  display: grid;
  grid-template-rows: ${(props) => (props.$expanded ? "1fr" : "0fr")};
  overflow: hidden;
  transition: grid-template-rows 0.2s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const BranchInner = styled.div`
  min-height: 0;
`;

interface OrgTreeProps {
  tree: TreeNode[];
  expandedIds: Set<string>;
  selectedId: string | null;
  updatedIds: Set<string>;
  matchIds: Set<string> | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

function TreeBranch({ tree, expandedIds, selectedId, updatedIds, matchIds, onToggle, onSelect }: OrgTreeProps) {
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
              updated={updatedIds.has(node.id)}
              dimmed={matchIds !== null && !matchIds.has(node.id)}
              onToggle={onToggle}
              onSelect={onSelect}
            />
            {node.children.length > 0 && (
              <Branch $expanded={expanded} aria-hidden={!expanded}>
                <BranchInner>
                  <TreeBranch
                    tree={node.children}
                    expandedIds={expandedIds}
                    selectedId={selectedId}
                    updatedIds={updatedIds}
                    matchIds={matchIds}
                    onToggle={onToggle}
                    onSelect={onSelect}
                  />
                </BranchInner>
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
