export interface Department {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  parent?: Department | null;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentInput {
  name: string;
  type: string;
  parent_id: string | null;
  description: string;
}

// ---- Tree helpers ----

export interface DepartmentNode extends Department {
  children: DepartmentNode[];
  depth: number;
}

export function buildFlatTree(departments: Department[]): DepartmentNode[] {
  const map = new Map<string, DepartmentNode>();
  departments.forEach(d => map.set(d.id, { ...d, children: [], depth: 0 }));

  const roots: DepartmentNode[] = [];
  map.forEach(node => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  map.forEach(node => node.children.sort((a, b) => a.name.localeCompare(b.name)));
  roots.sort((a, b) => a.name.localeCompare(b.name));

  const result: DepartmentNode[] = [];
  function flatten(nodes: DepartmentNode[], depth: number) {
    nodes.forEach(n => {
      n.depth = depth;
      result.push(n);
      flatten(n.children, depth + 1);
    });
  }
  flatten(roots, 0);
  return result;
}

export function deptPath(dept: Department, allDepts: Department[]): string {
  const parts: string[] = [dept.name];
  let current = dept;
  const visited = new Set<string>();
  while (current.parent_id && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = allDepts.find(d => d.id === current.parent_id);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }
  return parts.join(' / ');
}

const BADGE_COLORS = [
  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
];

export function deptTypeBadgeColor(type: string): string {
  if (!type) return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
  let hash = 0;
  for (let i = 0; i < type.length; i++) hash = (hash * 31 + type.charCodeAt(i)) >>> 0;
  return BADGE_COLORS[hash % BADGE_COLORS.length];
}
