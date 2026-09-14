import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import type { AiSearchResult } from "@/api/aiSearch";
import type { OrgNode } from "@/api/schema";
import { useOrgTree } from "@/api/useOrgTree";
import { AiSearchBar } from "@/components/AiSearchBar";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";
import { EmptyState, ErrorState, LoadingState } from "@/components/StatusPanels";
import { ViewToggle, type ViewMode } from "@/components/ViewToggle";
import { useLiveOrgData } from "@/features/live/useLiveOrgData";
import { OrgTree } from "@/features/tree/OrgTree";
import { OrgTable } from "@/features/table/OrgTable";
import { matchesFilter } from "@/lib/aiFilter";
import { ancestorIds, rootIds } from "@/lib/tree";
import { colors } from "@/styles/colors";

const Page = styled.div`
  min-height: 100%;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  font-size: 1.4rem;
  margin: 0 0 4px;
`;

const Subtitle = styled.p`
  margin: 0;
  color: ${colors.textMuted};
  font-size: 0.9rem;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 1280px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Panel = styled.section<{ $visible: boolean }>`
  display: ${(props) => (props.$visible ? "block" : "none")};
  border: 1px solid ${colors.border};
  border-radius: 10px;
  background: ${colors.surface};
  padding: 12px;

  @media (min-width: 1280px) {
    display: block;
  }
`;

const PanelTitle = styled.h2`
  font-size: 0.95rem;
  color: ${colors.textMuted};
  margin: 0 0 10px;

  @media (min-width: 1280px) {
    display: block;
  }
`;

const EMPTY_NODES: OrgNode[] = [];

function App() {
  const { data, isLoading, isError, error, refetch } = useOrgTree();
  const [view, setView] = useState<ViewMode>("tree");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const didInitExpansion = useRef(false);

  const nodes = data ?? EMPTY_NODES;
  const { tree, aggregatedRows, updatedIds, connectionStatus } = useLiveOrgData(nodes);
  const [aiResult, setAiResult] = useState<AiSearchResult | null>(null);

  const matchIds = useMemo(() => {
    if (!aiResult) return null;
    return new Set(aggregatedRows.filter((row) => matchesFilter(row, aiResult.filter)).map((row) => row.id));
  }, [aiResult, aggregatedRows]);

  // "Второй уровень открыт по умолчанию": seed expansion with root ids once,
  // the first time data arrives — later refetches must not reset the user's
  // manual expand/collapse choices.
  useEffect(() => {
    if (!didInitExpansion.current && nodes.length > 0) {
      setExpandedIds(new Set(rootIds(nodes)));
      didInitExpansion.current = true;
    }
  }, [nodes]);

  const toggleExpanded = (id: string) => {
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

  const selectNode = (id: string) => {
    setSelectedId(id);
    // Make sure the selected node is actually visible in the tree, even if
    // it was picked from the table while its branch was collapsed.
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const ancestorId of ancestorIds(nodes, id)) {
        next.add(ancestorId);
      }
      return next;
    });
  };

  const handleAiResult = (result: AiSearchResult | null) => {
    setAiResult(result);
    if (!result) return;

    // AI matches should be visible without manual clicking: expand every
    // matched node's ancestor chain (the tree dims non-matches rather than
    // hiding them, since hiding would also have to hide ancestors that
    // aren't themselves matches). Done here, in the event handler that
    // already knows the new filter, rather than a useEffect on matchIds.
    const matched = aggregatedRows.filter((row) => matchesFilter(row, result.filter));
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const row of matched) {
        for (const ancestorId of ancestorIds(nodes, row.id)) next.add(ancestorId);
      }
      return next;
    });
  };

  return (
    <Page>
      <Header>
        <div>
          <Title>Staff Pulse — орг-структура компании</Title>
          <Subtitle>Дивизионы → отделы → команды</Subtitle>
        </div>
        {!isLoading && !isError && nodes.length > 0 && <ConnectionIndicator status={connectionStatus} />}
      </Header>

      {isLoading && <LoadingState />}
      {isError && (
        <ErrorState message={error instanceof Error ? error.message : "неизвестная ошибка"} onRetry={() => refetch()} />
      )}
      {!isLoading && !isError && nodes.length === 0 && <EmptyState />}

      {!isLoading && !isError && nodes.length > 0 && (
        <>
          <AiSearchBar onResult={handleAiResult} />
          <ViewToggle value={view} onChange={setView} />
          <Layout>
            <Panel $visible={view === "tree"}>
              <PanelTitle>Дерево</PanelTitle>
              <OrgTree
                tree={tree}
                expandedIds={expandedIds}
                selectedId={selectedId}
                updatedIds={updatedIds}
                matchIds={matchIds}
                onToggle={toggleExpanded}
                onSelect={selectNode}
              />
            </Panel>
            <Panel $visible={view === "table"}>
              <PanelTitle>Аналитическая таблица</PanelTitle>
              <OrgTable
                rows={aggregatedRows}
                selectedId={selectedId}
                updatedIds={updatedIds}
                matchIds={matchIds}
                onSelect={selectNode}
              />
            </Panel>
          </Layout>
        </>
      )}
    </Page>
  );
}

export default App;
