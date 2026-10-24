import type { FieldData, FormData, SchemaNode } from '~/types';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { hasValue, nodeChildren } from '~/utils';

// whether any of the nodes shows something in read mode for the given data,
// nodes without name and children (e.g. images) always show something
export function useHasContent(nodes: MaybeRefOrGetter<SchemaNode[]>, data: MaybeRefOrGetter<FieldData | FormData>) {
  function hasContent(nodes: SchemaNode[], data: FieldData | FormData): boolean {
    const fields = data !== null && typeof data === 'object' && !Array.isArray(data) ? data : {};
    return nodes.some((node) => {
      if (!node.name) {
        return node.children ? hasContent(nodeChildren(node), fields) : true;
      }
      const value = fields[node.name];
      if (hasValue(value)) {
        return true;
      }
      // the children of a list (e.g. a repeater) are only shown for its items, so an empty list shows nothing,
      // while e.g. a group can show images without data
      return !Array.isArray(value) && hasContent(nodeChildren(node), value);
    });
  }

  return computed(() => hasContent(toValue(nodes), toValue(data)));
}
