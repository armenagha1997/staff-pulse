import styled from "styled-components";
import type { ConnectionStatus } from "@/api/liveSocket";
import { colors } from "@/styles/colors";

const LABELS: Record<ConnectionStatus, string> = {
  connecting: "Подключение…",
  open: "Live",
  reconnecting: "Переподключение…",
};

const DOT_COLORS: Record<ConnectionStatus, string> = {
  connecting: colors.textMuted,
  open: colors.performanceHigh,
  reconnecting: colors.performanceMid,
};

const Wrapper = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: ${colors.textMuted};
`;

const Dot = styled.span<{ $color: string; $pulse: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(props) => props.$color};
  animation: ${(props) => (props.$pulse ? "pulse 1.6s ease-in-out infinite" : "none")};

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  return (
    <Wrapper role="status" aria-live="polite" title={`Соединение: ${LABELS[status]}`}>
      <Dot $color={DOT_COLORS[status]} $pulse={status !== "open"} aria-hidden="true" />
      {LABELS[status]}
    </Wrapper>
  );
}
