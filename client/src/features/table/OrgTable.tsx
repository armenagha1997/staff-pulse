import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import type { AggregatedRow } from "@/lib/aggregate";
import { formatBudget } from "@/lib/format";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { colors } from "@/styles/colors";
import { performanceColor } from "@/styles/colors";
import { COLUMNS, compareRows, type ColumnKey } from "@/features/table/columns";

type SortDirection = "asc" | "desc";

interface SortState {
  column: ColumnKey;
  direction: SortDirection;
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const FilterInput = styled.input`
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid ${colors.border};
  background: ${colors.surfaceRaised};
  color: ${colors.text};

  &::placeholder {
    color: ${colors.textMuted};
  }
`;

const TableScroll = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;

  &:focus {
    outline: none;
  }
`;

const Th = styled.th<{ $align: "left" | "right" }>`
  text-align: ${(props) => props.$align};
  padding: 8px 10px;
  border-bottom: 1px solid ${colors.border};
  white-space: nowrap;
`;

const ThButton = styled.button<{ $active: boolean }>`
  background: transparent;
  border: none;
  color: ${(props) => (props.$active ? colors.text : colors.textMuted)};
  font-weight: ${(props) => (props.$active ? 700 : 400)};
  cursor: pointer;
  padding: 0;
  font-size: inherit;
`;

const Tr = styled.tr<{ $selected: boolean; $focused: boolean; $updated: boolean }>`
  cursor: pointer;
  background: ${(props) => (props.$updated ? colors.highlightFlash : props.$selected ? colors.surfaceRaised : "transparent")};
  outline: ${(props) => (props.$focused ? `1px solid ${colors.accent}` : "none")};
  outline-offset: -1px;
  /* Instant flash on, slow (1.5s) fade back to normal — see TreeRow for why
     this can't be a single symmetric transition. */
  transition: background-color ${(props) => (props.$updated ? "0s" : "1.5s")} ease-out;

  &:hover {
    background: ${colors.surfaceRaised};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Td = styled.td<{ $align: "left" | "right" }>`
  text-align: ${(props) => props.$align};
  padding: 6px 10px;
  border-bottom: 1px solid ${colors.border};
  white-space: nowrap;
`;

const NameCell = styled.span<{ $level: number }>`
  padding-left: ${(props) => (props.$level - 1) * 14}px;
`;

const PerformanceCell = styled.span<{ $color: string }>`
  color: ${(props) => props.$color};
  font-weight: 600;
`;

const EmptyRow = styled.div`
  padding: 24px;
  text-align: center;
  color: ${colors.textMuted};
`;

interface OrgTableProps {
  rows: AggregatedRow[];
  selectedId: string | null;
  updatedIds: Set<string>;
  onSelect: (id: string) => void;
}

export function OrgTable({ rows, selectedId, updatedIds, onSelect }: OrgTableProps) {
  const [filter, setFilter] = useState("");
  const debouncedFilter = useDebouncedValue(filter, 250);
  const [sort, setSort] = useState<SortState>({ column: "name", direction: "asc" });
  const [rawFocusedIndex, setFocusedIndex] = useState(0);
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);

  const visibleRows = useMemo(() => {
    const query = debouncedFilter.trim().toLowerCase();
    const filtered = query ? rows.filter((row) => row.name.toLowerCase().includes(query)) : rows;

    const sorted = [...filtered].sort((a, b) => {
      const cmp = compareRows(a, b, sort.column);
      return sort.direction === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [rows, debouncedFilter, sort]);

  // Clamp during render rather than via a setState-in-effect: if the
  // filtered/sorted row count shrinks, the previous index simply may not
  // exist any more — this is a pure function of current props/state, not a
  // side effect to synchronize.
  const focusedIndex = Math.min(rawFocusedIndex, Math.max(0, visibleRows.length - 1));

  useEffect(() => {
    rowRefs.current[focusedIndex]?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  const handleHeaderClick = (column: ColumnKey) => {
    setSort({ column, direction: "asc" });
  };

  // Two clicks land here as `click, click, dblclick` in the DOM, so by the time
  // this fires, handleHeaderClick has already forced "asc" — a plain overwrite
  // to "desc" is enough to make double-click the reverse of a single click.
  const handleHeaderDoubleClick = (column: ColumnKey) => {
    setSort({ column, direction: "desc" });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableElement>) => {
    if (visibleRows.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, visibleRows.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setFocusedIndex(visibleRows.length - 1);
        break;
      case "Enter":
        e.preventDefault();
        onSelect(visibleRows[focusedIndex].id);
        break;
      default:
        break;
    }
  };

  return (
    <Wrapper>
      <FilterInput
        type="search"
        placeholder="Фильтр по названию…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        aria-label="Фильтр по названию подразделения"
      />

      {visibleRows.length === 0 ? (
        <EmptyRow>Ничего не найдено.</EmptyRow>
      ) : (
        <TableScroll>
          <Table
            role="grid"
            tabIndex={0}
            aria-activedescendant={visibleRows[focusedIndex]?.id}
            onKeyDown={handleKeyDown}
          >
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <Th key={column.key} $align={column.align}>
                    <ThButton
                      type="button"
                      $active={sort.column === column.key}
                      onClick={() => handleHeaderClick(column.key)}
                      onDoubleClick={() => handleHeaderDoubleClick(column.key)}
                      title="Клик — сортировать; двойной клик — в обратном порядке"
                    >
                      {column.label}
                      {sort.column === column.key && (sort.direction === "asc" ? " ▲" : " ▼")}
                    </ThButton>
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <Tr
                  key={row.id}
                  id={row.id}
                  ref={(el) => {
                    rowRefs.current[index] = el;
                  }}
                  role="row"
                  aria-selected={row.id === selectedId}
                  $selected={row.id === selectedId}
                  $focused={index === focusedIndex}
                  $updated={updatedIds.has(row.id)}
                  onClick={() => {
                    setFocusedIndex(index);
                    onSelect(row.id);
                  }}
                >
                  <Td $align="left">
                    <NameCell $level={row.level}>{row.name}</NameCell>
                  </Td>
                  <Td $align="right">{row.level}</Td>
                  <Td $align="right">{row.totalHeadcount}</Td>
                  <Td $align="right">{formatBudget(row.totalBudget)}</Td>
                  <Td $align="right">
                    <PerformanceCell $color={performanceColor(row.avgPerformance)}>
                      {Math.round(row.avgPerformance)}
                    </PerformanceCell>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}
    </Wrapper>
  );
}
