import type { OrgNode } from "./types.js";

// Deterministic PRNG (mulberry32) so the mock dataset is stable across restarts.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260914);

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

const DIVISIONS = ["Продажи", "Разработка", "Маркетинг", "Операции"];
const DEPARTMENTS = [
  "Клиентский сервис",
  "Стратегия",
  "Аналитика",
  "Платформа",
  "Мобильные продукты",
  "Инфраструктура",
  "Бренд",
  "Digital",
  "Исследования",
  "Логистика",
  "Качество",
  "Поддержка",
];
const TEAM_PREFIXES = [
  "Команда роста",
  "Команда поддержки",
  "Команда автоматизации",
  "Команда данных",
  "Команда UX",
  "Команда интеграций",
  "Команда региона",
  "Команда партнёрств",
];

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function makeNode(
  name: string,
  parentId: string | null,
  headcountRange: [number, number],
  perCapitaBudgetRange: [number, number],
): OrgNode {
  const headcount = randInt(...headcountRange);
  const perCapita = randInt(...perCapitaBudgetRange);
  return {
    id: nextId("node"),
    name,
    parentId,
    headcount,
    budget: headcount * perCapita,
    performance: randInt(35, 99),
    updatedAt: new Date().toISOString(),
  };
}

function generateOrgTree(): OrgNode[] {
  idCounter = 0;
  const nodes: OrgNode[] = [];
  const usedDeptNames = new Set<string>();

  for (const divisionName of DIVISIONS) {
    const division = makeNode(`Дивизион «${divisionName}»`, null, [8, 25], [900_000, 1_500_000]);
    nodes.push(division);

    const deptCount = randInt(3, 4);
    for (let i = 0; i < deptCount; i += 1) {
      let deptLabel = pick(DEPARTMENTS);
      let attempts = 0;
      while (usedDeptNames.has(`${divisionName}:${deptLabel}`) && attempts < 10) {
        deptLabel = pick(DEPARTMENTS);
        attempts += 1;
      }
      usedDeptNames.add(`${divisionName}:${deptLabel}`);

      const department = makeNode(
        `Отдел «${deptLabel}»`,
        division.id,
        [4, 12],
        [700_000, 1_200_000],
      );
      nodes.push(department);

      const teamCount = randInt(2, 4);
      for (let j = 0; j < teamCount; j += 1) {
        const team = makeNode(
          `${pick(TEAM_PREFIXES)} ${j + 1}`,
          department.id,
          [3, 15],
          [500_000, 950_000],
        );
        nodes.push(team);
      }
    }
  }

  return nodes;
}

// Mutable in-memory store — mutated in place by the live-update simulator (stage 03).
export const store: { nodes: OrgNode[] } = {
  nodes: generateOrgTree(),
};

export function resetStore(): void {
  store.nodes = generateOrgTree();
}
