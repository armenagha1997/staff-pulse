# Архитектура

## Слои приложения

```
┌─────────────────────────────────────────────────────────┐
│ server/  — Express mock API + WS + AI-поиск               │
│  data.ts     — генерация и мутируемое хранение узлов       │
│  live.ts     — WS-сервер /ws, раз в 2-5с шлёт node-updated │
│  aiSearch.ts — heuristicParse: офлайн NL → StructuredFilter │
│  llmSearch.ts— опционально: то же через Claude (tool-use)   │
│  index.ts    — GET /api/org-tree, POST /api/ai-search,      │
│                http.Server для HTTP+WS                      │
└─────────────────────────────────────────────────────────┘
       │ HTTP (JSON, dev: Vite / прод: Nginx)  │ WS (/ws)
┌─────────────────────────────────────────────────────────┐
│ client/src/api/        — доступ к данным                │
│  schema.ts     — zod-схемы OrgNode/ответа API/патча/фильтра│
│  orgTree.ts    — fetch + валидация (бросает при невалидном ответе) │
│  queryClient.ts— конфигурация react-query (staleTime=5s) │
│  useOrgTree.ts — хук данных (кэш, retry, отмена запроса) │
│  liveSocket.ts — WS-соединение, backoff, статус          │
│  aiSearch.ts   — POST /api/ai-search + клиентский текстовый│
│                  fallback при сбое запроса                 │
├─────────────────────────────────────────────────────────┤
│ client/src/lib/        — чистые вычисления (без React)    │
│  tree.ts       — buildTree, flattenTree, idChain,          │
│                  cloneAlongChain, ancestorIds, rootIds      │
│  aggregate.ts  — computeRollups/recomputeOwnRollup/         │
│                  aggregateTree (полный и точечный пересчёт) │
│  liveUpdate.ts — applyLivePatch (мутация + O(глубина)       │
│                  пересчёт + клонирование по цепочке)        │
│  format.ts     — formatBudget ("12 345 678 руб.")          │
│  useDebouncedValue.ts, useFadingHighlights.ts               │
│  aiFilter.ts   — matchesFilter: чистая функция StructuredFilter → bool │
├─────────────────────────────────────────────────────────┤
│ client/src/features/live/useLiveOrgData.ts — владеет       │
│  мутируемой моделью (nodesById/aggById в ref) и подпиской   │
│  на WS; отдаёт tree/aggregatedRows/updatedIds/статус        │
├─────────────────────────────────────────────────────────┤
│ client/src/features/   — UI-фичи                          │
│  tree/OrgTree.tsx, TreeRow.tsx     — дерево (controlled),  │
│                                       height-transition     │
│  table/OrgTable.tsx, columns.ts    — таблица, клав. навигация │
├─────────────────────────────────────────────────────────┤
│ client/src/components/ — переиспользуемые UI-примитивы    │
│  StatusPanels.tsx, PerformanceIndicator.tsx, ViewToggle.tsx│
│  ConnectionIndicator.tsx — статус WS в шапке               │
│  AiSearchBar.tsx — ввод запроса, вызов aiSearch, badge источника │
├─────────────────────────────────────────────────────────┤
│ client/src/App.tsx — владеет UI-состоянием (selectedId,    │
│  expandedIds, view, aiResult→matchIds) и получает live-     │
│  данные из useLiveOrgData; передаёт всё вниз в OrgTree/     │
│  OrgTable как controlled-компоненты                          │
└─────────────────────────────────────────────────────────┘
```

## Deployment (Docker Compose)

```
┌──────────────┐        /api/*, /ws        ┌──────────────┐
│  client (80)  │ ─────────────────────────▶ │ server (4000) │
│  Nginx + build │◀───────────────────────── │ Node (Express) │
└──────────────┘                            └──────────────┘
       ▲
       │ ${CLIENT_PORT:-8080}:80
     браузер
```

Nginx — единственный публично открытый порт; `server` виден только внутри
Docker-сети compose (`http://server:4000`). См. [ADR-007](adr/007-docker-and-nginx.md).

## Поток данных (API → UI)

1. `useOrgTree()` вызывает `fetchOrgTree(signal)`.
2. `fetchOrgTree` делает `fetch('/api/org-tree')`, парсит JSON и валидирует его
   через `OrgTreeResponseSchema.safeParse`. Невалидная форма ответа → выбрасывается
   `InvalidOrgTreeResponseError`, что react-query превращает в состояние `isError`.
3. react-query кэширует результат под ключом `['org-tree']` с `staleTime: 5000` —
   повторные подписки на тот же ключ в течение 5с не порождают новый запрос
   (устраняет лишние сетевые обращения при повторном монтировании/фокусе окна).
4. Компонент `App` читает `{ data, isLoading, isError, error }` и рендерит один из:
   `LoadingState`, `ErrorState` (с кнопкой retry → `refetch()`), `EmptyState`
   (при `data.length === 0`), либо `OrgTree`.
5. `OrgTree` строит иерархию через `buildTree(nodes)` (мемоизировано по ссылке на
   `nodes`) и управляет набором развёрнутых `id` в локальном состоянии
   (`Set<string>`), инициализированным id корневых узлов — поэтому второй уровень
   (отделы) виден сразу, а третий (команды) — по клику.

## Отмена запросов и повторные обращения

react-query передаёt в `queryFn` `AbortSignal`, связанный с жизненным циклом
запроса: при размонтировании последнего наблюдателя запроса активный `fetch`
отменяется автоматически — отдельного `useEffect`-cleanup не требуется.

## Дерево и таблица — общее состояние

`App.tsx` — единственный владелец состояния, которое должно быть согласовано
между деревом и таблицей:
- `tree` / `aggregatedRows` — вычисляются один раз на новые данные (см.
  [data-model.md](data-model.md#агрегация)).
- `selectedId` — узел, выбранный кликом по строке дерева ИЛИ таблицы;
  `OrgTree`/`OrgTable` — controlled-компоненты, сами не хранят выбор.
- `expandedIds` — раскрытые узлы дерева; выбор узла из таблицы дополняет этот
  набор цепочкой предков (`ancestorIds`), чтобы выделенный узел не остался
  скрытым в свёрнутой ветке.

Таблица и фильтр/сортировка внутри неё — локальное состояние `OrgTable`
(`filter`, `sort`), не поднятое в `App`: оно не влияет ни на дерево, ни на
агрегацию, поэтому не должно быть в общем состоянии.

## Live-обновления

`useLiveOrgData` (не react-query) — единственный владелец мутируемой модели
дерева/агрегатов и WS-подключения. REST-кэш (`['org-tree']`) поставляет
только начальный снимок структуры; живые патчи применяются напрямую к
отдельной модели, минуя react-query (см. [data-model.md](data-model.md#live-патчи)
и [ADR-005](adr/005-live-updates-transport-and-recompute.md)). `App` получает
из этого хука уже готовые `tree`/`aggregatedRows`/`updatedIds`/`connectionStatus`
и не знает о механике патчей — с его точки зрения это просто ещё один
источник данных, как `useOrgTree`.

## AI-поиск

`AiSearchBar` вызывает `runAiSearch(query)` (`client/src/api/aiSearch.ts`),
который либо получает `StructuredFilter` от `/api/ai-search` (LLM или
офлайн-эвристика на сервере — см. [ADR-008](adr/008-ai-search-design.md)),
либо, если весь запрос не удался, строит его локально как `{ nameContains }`.
`App` мемоизирует `matchIds = Set<string>` через `matchesFilter` по текущим
`aggregatedRows` и передаёт его в `OrgTable` (жёсткий фильтр строк) и
`OrgTree` (затемнение несовпадающих узлов + авто-раскрытие предков совпадений).

## Почему так (детали решений)

Нетривиальные решения (react-query vs самописный кэш, styled-components vs
CSS-модули, структура монорепозитория, режим просмотра и модель сортировки,
транспорт live-обновлений и инкрементальный пересчёт, height-transition
дерева и модель клавиатурной навигации, Docker/Nginx, дизайн AI-поиска)
зафиксированы в [docs/adr](adr/).
