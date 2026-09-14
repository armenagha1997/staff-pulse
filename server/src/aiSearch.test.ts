import { describe, expect, it } from "vitest";
import { heuristicParse } from "./aiSearch.js";

describe("heuristicParse", () => {
  it("recognizes level keywords", () => {
    expect(heuristicParse("покажи все команды")).toMatchObject({ levels: [3] });
    expect(heuristicParse("отделы компании")).toMatchObject({ levels: [2] });
    expect(heuristicParse("дивизионы")).toMatchObject({ levels: [1] });
  });

  it("parses a performance lower bound", () => {
    expect(heuristicParse("команды с эффективностью выше 80")).toMatchObject({
      levels: [3],
      minPerformance: 80,
    });
  });

  it("parses a performance upper bound", () => {
    expect(heuristicParse("отделы с эффективностью ниже 50")).toMatchObject({
      levels: [2],
      maxPerformance: 50,
    });
  });

  it("parses a budget lower bound in millions", () => {
    expect(heuristicParse("подразделения с бюджетом больше 5 млн")).toMatchObject({
      minBudget: 5_000_000,
    });
  });

  it("parses a headcount upper bound", () => {
    expect(heuristicParse("команды с сотрудников менее 10")).toMatchObject({
      levels: [3],
      maxHeadcount: 10,
    });
  });

  it("falls back to a plain name search when nothing structured is recognized", () => {
    expect(heuristicParse("Продажи")).toEqual({ nameContains: "Продажи" });
  });

  it("combines multiple constraints from one query", () => {
    const filter = heuristicParse("команды с эффективностью выше 70 и бюджетом больше 2 млн");
    expect(filter).toMatchObject({ levels: [3], minPerformance: 70, minBudget: 2_000_000 });
  });
});
