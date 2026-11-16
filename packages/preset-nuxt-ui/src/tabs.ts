import type { SchemaNode } from '@former-ui/former';

export type Tab = { label?: string | null };

// the default tab count, used as long as no tabs were set in the settings
export const DEFAULT_TAB_COUNT = 2;

// the tabs of the settings or the default tabs
export function tabsOf(tabs: Tab[] | null | undefined): Tab[] {
  if (tabs === undefined || tabs === null) {
    return Array.from({ length: DEFAULT_TAB_COUNT }, () => ({}));
  }
  return Array.isArray(tabs) ? tabs : [];
}

// the categories of the children that are rendered in the tabs, e.g. `tab-0`
export function tabCategories(tabs: Tab[] | null | undefined): string[] {
  return tabsOf(tabs).map((_, index) => `tab-${index}`);
}

// only the children of the rendered tabs are shown, children of removed tabs are kept but not shown
export function shownTabChildren(node: SchemaNode): SchemaNode[] {
  const children = node.children;
  if (!children || Array.isArray(children)) {
    return [];
  }
  return tabCategories(node.props?.tabs).flatMap(tab => children[tab] ?? []);
}
