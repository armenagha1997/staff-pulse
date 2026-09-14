import styled from "styled-components";
import { colors } from "@/styles/colors";

export type ViewMode = "tree" | "table";

const Bar = styled.div`
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
  background: ${colors.surfaceRaised};
  margin-bottom: 12px;

  /* At >=1280px both panels render side by side (split-view), so the toggle
     is redundant — hide it rather than let it silently do nothing. */
  @media (min-width: 1280px) {
    display: none;
  }
`;

const Button = styled.button<{ $active: boolean }>`
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: ${(props) => (props.$active ? colors.accent : "transparent")};
  color: ${(props) => (props.$active ? "#fff" : colors.textMuted)};
`;

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <Bar role="tablist" aria-label="Переключение вида">
      <Button type="button" role="tab" aria-selected={value === "tree"} $active={value === "tree"} onClick={() => onChange("tree")}>
        Дерево
      </Button>
      <Button type="button" role="tab" aria-selected={value === "table"} $active={value === "table"} onClick={() => onChange("table")}>
        Таблица
      </Button>
    </Bar>
  );
}
