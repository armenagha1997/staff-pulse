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
