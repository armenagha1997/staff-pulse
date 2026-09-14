import type { OrgNode } from "@/api/schema";

export interface TreeNode extends OrgNode {
  children: TreeNode[];
  level: number; // 1 = division, 2 = department, 3 = team, ...
}

export function buildTree(nodes: OrgNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  nodes.forEach((node) => byId.set(node.id, { ...node, children: [], level: 0 }));

  const roots: TreeNode[] = [];
  byId.forEach((node) => {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const assignLevels = (list: TreeNode[], level: number): void => {
    for (const node of list) {
      node.level = level;
      assignLevels(node.children, level + 1);
    }
  };
  assignLevels(roots, 1);

  return roots;
}

export function rootIds(nodes: OrgNode[]): string[] {
  return nodes.filter((node) => node.parentId === null).map((node) => node.id);
}

// Chain of parent ids from `id` up to (excluding) the root's non-existent parent.
// Used to expand a node's branch when it's selected from outside the tree (e.g. the table).
export function ancestorIds(nodes: OrgNode[], id: string): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const result: string[] = [];
  let current = byId.get(id);
  while (current?.parentId) {
    result.push(current.parentId);
    current = byId.get(current.parentId);
  }
  return result;
}

export function flattenTree(tree: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  const walk = (nodes: TreeNode[]): void => {
    for (const node of nodes) {
      result.push(node);
      walk(node.children);
    }
  };
  walk(tree);
  return result;
}

// [rootId, ..., parentId, id] — the full path from a root down to `id`.
export function idChain(nodesById: Map<string, TreeNode>, id: string): string[] {
  const chain: string[] = [];
  let current = nodesById.get(id);
  while (current) {
    chain.unshift(current.id);
    current = current.parentId ? nodesById.get(current.parentId) : undefined;
  }
  return chain;
}

export interface CloneAlongChainResult {
  roots: TreeNode[];
  clonedById: Map<string, TreeNode>;
}

// Rebuilds only the nodes on `chain` (root...target) as new objects; every
// sibling subtree not on the path keeps its original reference. This is what
// lets a live patch produce a fresh top-level array (so React re-renders)
// without copying the whole tree.
export function cloneAlongChain(roots: TreeNode[], chain: string[]): CloneAlongChainResult {
  const clonedById = new Map<string, TreeNode>();
  if (chain.length === 0) {
    return { roots, clonedById };
  }

  const [headId, ...rest] = chain;

  const cloneNode = (node: TreeNode, remaining: string[]): TreeNode => {
    if (remaining.length === 0) {
      const clone = { ...node };
      clonedById.set(node.id, clone);
      return clone;
    }
    const [nextId, ...tail] = remaining;
    const clone: TreeNode = {
      ...node,
      children: node.children.map((child) => (child.id === nextId ? cloneNode(child, tail) : child)),
    };
    clonedById.set(node.id, clone);
    return clone;
  };

  const newRoots = roots.map((root) => (root.id === headId ? cloneNode(root, rest) : root));
  return { roots: newRoots, clonedById };
}
