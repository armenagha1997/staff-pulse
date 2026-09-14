# Модель данных

## Контракт API

`GET /api/org-tree` возвращает плоский массив узлов:

```ts
interface OrgNode {
  id: string;
  name: string;
  parentId: string | null; // null у корневых узлов (дивизионов)
  headcount: number;       // собственная численность узла (без потомков)
  budget: number;          // собственный бюджет узла (без потомков), в рублях
  performance: number;     // 0..100
  updatedAt: string;       // ISO-8601
}
```

Валидируется на клиенте схемой `OrgNodeSchema` (zod), см. `client/src/api/schema.ts`.
Невалидная форма (лишнее/отсутствующее поле, `performance` вне `[0,100]` и т.п.) —
ошибка, а не молчаливое искажение данных.

## Дерево

Иерархия: **дивизион (уровень 1) → отдел (уровень 2) → команда (уровень 3)**.
Мок-данные — минимум 40 узлов (фактически ~55-60, т.к. количество отделов/команд
на узел рандомизировано в диапазоне), ровно 3 уровня.

`buildTree(nodes: OrgNode[])` (`client/src/lib/tree.ts`):
1. Строит `Map<id, TreeNode>`, где `TreeNode = OrgNode & { children: TreeNode[]; level: number }`.
2. Один проход по узлам: узел с `parentId`, найденным в `Map`, добавляется в
   `children` родителя; иначе — в список корней.
3. BFS/DFS-проход от корней проставляет `level`, начиная с 1.

Сложность: O(n) по числу узлов, без ограничения на глубину.

## Агрегация (этап 02)

> Реализуется в `client/src/lib/aggregate.ts` на этапе 02 — здесь фиксируется
> контракт заранее, чтобы не менять форму данных между этапами.

Для каждого узла агрегат включает **сам узел + всех потомков**:

```
totalHeadcount(node) = node.headcount + Σ totalHeadcount(child)  для child ∈ node.children
totalBudget(node)    = node.budget    + Σ totalBudget(child)
avgPerformance(node) = Σ (n.performance * n.headcount) / Σ n.headcount
                        по node и всем потомкам n (взвешено по headcount)
```

Считается один раз после загрузки данных (одним проходом снизу вверх, post-order),
результат мемоизируется (`useMemo` по ссылке на исходные `nodes`) — повторный рендер
без изменения данных не пересчитывает агрегаты.

## Live-патчи (этап 03)

> Контракт фиксируется заранее для этапа 03.

Сервер транслирует изменения по WebSocket (`/ws`) в виде точечных патчей:

```ts
interface OrgNodePatch {
  type: "node-updated";
  id: string;                       // изменённый узел
  changes: Partial<Pick<OrgNode, "headcount" | "budget" | "performance" | "updatedAt">>;
}
```

Клиент применяет патч точечно (обновляет один узел в кэше react-query через
`setQueryData`, без рефетча всего дерева) и пересчитывает агрегаты только для
затронутого узла и цепочки его предков (не для всего дерева).
