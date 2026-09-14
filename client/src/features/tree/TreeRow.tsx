import styled from "styled-components";
import { PerformanceIndicator } from "@/components/PerformanceIndicator";
import { colors } from "@/styles/colors";
import type { TreeNode } from "@/lib/tree";

const Row = styled.div<{ $level: number; $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  padding-left: ${(props) => 12 + (props.$level - 1) * 20}px;
  border-radius: 6px;
  cursor: pointer;
  background: ${(props) => (props.$selected ? colors.surfaceRaised : "transparent")};
  outline: ${(props) => (props.$selected ? `1px solid ${colors.accent}` : "none")};

  &:hover {
    background: ${colors.surfaceRaised};
  }
`;

const ToggleButton = styled.button<{ $expanded: boolean }>`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: ${colors.textMuted};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: rotate(${(props) => (props.$expanded ? 90 : 0)}deg);
  transition: transform 0.15s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ToggleSpacer = styled.span`
  width: 18px;
  flex-shrink: 0;
`;

const Name = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Headcount = styled.span`
  color: ${colors.textMuted};
  font-size: 0.9em;
  min-width: 64px;
  text-align: right;
`;

interface TreeRowProps {
  node: TreeNode;
  expanded: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

export function TreeRow({ node, expanded, selected, onToggle, onSelect }: TreeRowProps) {
  const hasChildren = node.children.length > 0;

  return (
    <Row
      $level={node.level}
      $selected={selected}
      role="treeitem"
      aria-selected={selected}
      onClick={() => onSelect(node.id)}
    >
      {hasChildren ? (
        <ToggleButton
          type="button"
          $expanded={expanded}
          aria-expanded={expanded}
          aria-label={expanded ? "Свернуть" : "Развернуть"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.id);
          }}
        >
          ▸
        </ToggleButton>
      ) : (
        <ToggleSpacer />
      )}
      <Name>{node.name}</Name>
      <Headcount>{node.headcount} чел.</Headcount>
      <PerformanceIndicator performance={node.performance} />
    </Row>
  );
}
