import { useState } from "react";
import styled from "styled-components";
import { runAiSearch, type AiSearchResult } from "@/api/aiSearch";
import { colors } from "@/styles/colors";

const Wrapper = styled.form`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
`;

const Input = styled.input`
  flex: 1;
  min-width: 240px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${colors.border};
  background: ${colors.surfaceRaised};
  color: ${colors.text};

  &::placeholder {
    color: ${colors.textMuted};
  }
`;

const SubmitButton = styled.button`
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  background: ${colors.accent};
  color: #fff;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const ClearButton = styled.button`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${colors.border};
  background: transparent;
  color: ${colors.textMuted};
  cursor: pointer;
`;

const SourceBadge = styled.span`
  font-size: 0.78rem;
  color: ${colors.textMuted};
`;

const SOURCE_LABELS: Record<AiSearchResult["source"], string> = {
  llm: "AI (LLM)",
  heuristic: "AI (правила)",
  "text-fallback": "текстовый поиск (fallback)",
};

interface AiSearchBarProps {
  onResult: (result: AiSearchResult | null) => void;
}

export function AiSearchBar({ onResult }: AiSearchBarProps) {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [lastSource, setLastSource] = useState<AiSearchResult["source"] | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setLastSource(null);
      onResult(null);
      return;
    }

    setPending(true);
    try {
      const result = await runAiSearch(trimmed);
      setLastSource(result.source);
      onResult(result);
    } finally {
      setPending(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setLastSource(null);
    onResult(null);
  };

  return (
    <Wrapper onSubmit={handleSubmit}>
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="AI-поиск: например «команды с эффективностью выше 80»"
        aria-label="AI-поиск по орг-структуре"
      />
      <SubmitButton type="submit" disabled={pending}>
        {pending ? "Ищу…" : "Найти"}
      </SubmitButton>
      {lastSource && (
        <>
          <ClearButton type="button" onClick={handleClear}>
            Сбросить
          </ClearButton>
          <SourceBadge>{SOURCE_LABELS[lastSource]}</SourceBadge>
        </>
      )}
    </Wrapper>
  );
}
