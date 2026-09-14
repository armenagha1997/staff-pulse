import styled from "styled-components";
import { colors } from "@/styles/colors";

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.surface};
  color: ${colors.textMuted};
  text-align: center;
`;

const Spinner = styled.div`
  width: 28px;
  height: 28px;
  border: 3px solid ${colors.border};
  border-top-color: ${colors.accent};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const RetryButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid ${colors.border};
  background: ${colors.surfaceRaised};
  color: ${colors.text};
  cursor: pointer;

  &:hover {
    border-color: ${colors.accent};
  }
`;

export function LoadingState() {
  return (
    <Panel role="status" aria-live="polite">
      <Spinner aria-hidden="true" />
      <span>Загрузка данных орг-структуры…</span>
    </Panel>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Panel role="alert">
      <span>Не удалось загрузить данные: {message}</span>
      <RetryButton type="button" onClick={onRetry}>
        Повторить
      </RetryButton>
    </Panel>
  );
}

export function EmptyState() {
  return (
    <Panel>
      <span>Нет данных для отображения.</span>
    </Panel>
  );
}
