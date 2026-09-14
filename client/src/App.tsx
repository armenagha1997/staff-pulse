import styled from "styled-components";
import { useOrgTree } from "@/api/useOrgTree";
import { EmptyState, ErrorState, LoadingState } from "@/components/StatusPanels";
import { OrgTree } from "@/features/tree/OrgTree";
import { colors } from "@/styles/colors";

const Page = styled.div`
  min-height: 100%;
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
`;

const Header = styled.header`
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

const Card = styled.section`
  border: 1px solid ${colors.border};
  border-radius: 10px;
  background: ${colors.surface};
  padding: 12px;
`;

function App() {
  const { data, isLoading, isError, error, refetch } = useOrgTree();

  return (
    <Page>
      <Header>
        <Title>Staff Pulse — орг-структура компании</Title>
        <Subtitle>Дивизионы → отделы → команды</Subtitle>
      </Header>

      <Card>
        {isLoading && <LoadingState />}
        {isError && (
          <ErrorState message={error instanceof Error ? error.message : "неизвестная ошибка"} onRetry={() => refetch()} />
        )}
        {!isLoading && !isError && data && data.length === 0 && <EmptyState />}
        {!isLoading && !isError && data && data.length > 0 && <OrgTree nodes={data} />}
      </Card>
    </Page>
  );
}

export default App;
