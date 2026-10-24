import type { SchemaNode } from '@former-ui/former';

// the default column count, also used before the settings of a new columns node were opened, which apply the preset of `cols`
export const DEFAULT_COLUMN_COUNT = 2;

// the categories of the children that are rendered as columns, e.g. `column-0`
export function columnCategories(cols: number | '' | null | undefined): string[] {
  const count = cols === undefined || cols === null ? DEFAULT_COLUMN_COUNT : cols;
  return typeof count !== 'number' || count < 0 ? [] : Array.from({ length: count }, (_, index) => `column-${index}`);
}

// only the children of the rendered columns are shown, children of removed columns are kept but not shown
export function shownColumnChildren(node: SchemaNode): SchemaNode[] {
  const children = node.children;
  if (!children || Array.isArray(children)) {
    return [];
  }
  return columnCategories(node.props?.cols).flatMap(column => children[column] ?? []);
}
