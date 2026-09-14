import styled from "styled-components";
import { performanceColor } from "@/styles/colors";

const Dot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(props) => props.$color};
  flex-shrink: 0;
`;

const Wrapper = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

export function PerformanceIndicator({ performance }: { performance: number }) {
  const color = performanceColor(performance);
  return (
    <Wrapper title={`Эффективность: ${performance}`}>
      <Dot $color={color} aria-hidden="true" />
      <span>{Math.round(performance)}</span>
    </Wrapper>
  );
}
