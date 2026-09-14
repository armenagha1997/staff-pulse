import { useMemo, useState } from "react";
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

const Tr = styled.tr<{ $selected: boolean; $level: number }>`
  cursor: pointer;
  background: ${(props) => (props.$selected ? colors.surfaceRaised : "transparent")};

  &:hover {
    background: ${colors.surfaceRaised};
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
  onSelect: (id: string) => void;
}

export function OrgTable({ rows, selectedId, onSelect }: OrgTableProps) {
  const [filter, setFilter] = useState("");
  const debouncedFilter = useDebouncedValue(filter, 250);
  const [sort, setSort] = useState<SortState>({ column: "name", direction: "asc" });

  const visibleRows = useMemo(() => {
    const query = debouncedFilter.trim().toLowerCase();
    const filtered = query ? rows.filter((row) => row.name.toLowerCase().includes(query)) : rows;

    const sorted = [...filtered].sort((a, b) => {
      const cmp = compareRows(a, b, sort.column);
      return sort.direction === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [rows, debouncedFilter, sort]);

  const handleHeaderClick = (column: ColumnKey) => {
    setSort({ column, direction: "asc" });
  };

  // Two clicks land here as `click, click, dblclick` in the DOM, so by the time
  // this fires, handleHeaderClick has already forced "asc" — a plain overwrite
  // to "desc" is enough to make double-click the reverse of a single click.
  const handleHeaderDoubleClick = (column: ColumnKey) => {
    setSort({ column, direction: "desc" });
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
          <Table>
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
              {visibleRows.map((row) => (
                <Tr
                  key={row.id}
                  $selected={row.id === selectedId}
                  $level={row.level}
                  onClick={() => onSelect(row.id)}
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
