import type { FieldData, FormData, SchemaNode } from '~/types';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { hasValue, nodeChildren } from '~/utils';
import { inject } from './injectProvide';

// whether any of the nodes shows something in read mode for the given data,
// nodes hidden by their show if condition show nothing, while other nodes without name and children (e.g. images) always do
export function useHasContent(
  nodes: MaybeRefOrGetter<SchemaNode[]>,
  data: MaybeRefOrGetter<FieldData | FormData>,
) {
  const showIf = inject('showIf', false);
  const components = inject('components', false);

  function shownChildren(node: SchemaNode): SchemaNode[] | undefined {
    const shownChildrenOfComponent = components?.value[node.type]?.shownChildren;
    if (shownChildrenOfComponent) {
      return shownChildrenOfComponent(node);
    }
    return node.children ? nodeChildren(node) : undefined;
  }

  function hasContent(nodes: SchemaNode[], data: FieldData | FormData): boolean {
    const fields = data !== null && typeof data === 'object' && !Array.isArray(data) ? data : {};
    return nodes.some((node) => {
      if (showIf && !showIf(node)) {
        return false;
      }
      const children = shownChildren(node);
      if (!node.name) {
        return children ? hasContent(children, fields) : true;
      }
      const value = fields[node.name];
      // the children of a list (e.g. a repeater) are only shown for its items, so an empty list shows nothing,
      // while each item is shown even if it is empty,
      // lists without data are detected by their component, as only an array tells them apart from e.g. groups otherwise
      if (Array.isArray(value) || components?.value[node.type]?.isList) {
        return Array.isArray(value) && value.length > 0;
      }
      // e.g. a group can show images without data
      return hasValue(value) || hasContent(children ?? [], value);
    });
  }

  return computed(() => hasContent(toValue(nodes), toValue(data)));
}
