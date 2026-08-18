export type TreeNode<T extends { id: string; parentId: string | null }> = T & {
  children: TreeNode<T>[];
};

/**
 * Build nested tree from flat parentId-referenced items.
 * Two-pass HashMap approach — O(n) time, O(n) space.
 * Items referencing a missing parentId are dropped (orphans).
 * Input order preserved (roots first, children in appearance order).
 */
export function buildTree<T extends { id: string; parentId: string | null }>(
  items: T[],
): TreeNode<T>[] {
  const map = new Map<string, TreeNode<T>>();
  const roots: TreeNode<T>[] = [];

  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parentId) {
      const parent = map.get(item.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}
