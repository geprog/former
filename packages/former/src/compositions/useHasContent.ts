import type { FieldData, FormData, SchemaNode } from '~/types';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { hasValue, nodeChildren } from '~/utils';

type Options = {
  // whether the data of the node is a list whose items each render its children (e.g. a repeater),
  // needed for lists without data as only an array tells them apart from e.g. groups otherwise
  isList?: (node: SchemaNode) => boolean;
};

// whether any of the nodes shows something in read mode for the given data,
// nodes without name and children (e.g. images) always show something
export function useHasContent(
  nodes: MaybeRefOrGetter<SchemaNode[]>,
  data: MaybeRefOrGetter<FieldData | FormData>,
  options: Options = {},
) {
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
      const isList = Array.isArray(value) || (options.isList?.(node) ?? false);
      return !isList && hasContent(nodeChildren(node), value);
    });
  }

  return computed(() => hasContent(toValue(nodes), toValue(data)));
}
