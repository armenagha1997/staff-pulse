export interface OrgNode {
  id: string;
  name: string;
  parentId: string | null;
  headcount: number;
  budget: number;
  performance: number;
  updatedAt: string;
}
