import type { MaybeRefOrGetter } from 'vue';
import type { DataScope, FieldData, FormData, SchemaNode } from '~/types';
import { computed, toValue } from 'vue';
import { dataScopesOfChildren, hasValue, isListNode, nodeChildren } from '~/utils';
import { inject } from './injectProvide';

// whether any of the nodes shows something in read mode for the given data,
// nodes hidden by their show if condition show nothing, while other nodes without name and children (e.g. images) always do,
// `scopes` are the scopes of the data the nodes are in, passed to their show if conditions
export function useHasContent(
  nodes: MaybeRefOrGetter<SchemaNode[]>,
  data: MaybeRefOrGetter<FieldData | FormData>,
  scopes: MaybeRefOrGetter<DataScope[]> = () => [
    {
      data: toValue(data),
      path: [],
    },
  ],
) {
  const showIf = inject('showIf', false);
  const components = inject('components', false);

  function shownChildren(node: SchemaNode): SchemaNode[] | undefined {
    const shownChildrenOfComponent = components?.value[node.type]?.shownChildren;
    if (shownChildrenOfComponent) {
      return shownChildrenOfComponent(node);
    }
    return node.children
      ? nodeChildren(node)
      : undefined;
  }

  function hasContent(nodes: SchemaNode[], data: FieldData | FormData, scopes: DataScope[]): boolean {
    const fields = data !== null && typeof data === 'object' && !Array.isArray(data)
      ? data
      : {};
    return nodes.some((node) => {
      if (showIf && !showIf(node, scopes)) {
        return false;
      }
      const children = shownChildren(node);
      const childrenScopes = dataScopesOfChildren(node, data, scopes, components?.value ?? {});
      if (!node.name) {
        return children
          ? hasContent(children, fields, childrenScopes)
          : true;
      }
      const value = fields[node.name];
      // the children of a list (e.g. a repeater) are only shown for its items, so an empty list shows nothing,
      // while each item is shown even if it is empty
      if (isListNode(node, value, components?.value ?? {})) {
        return Array.isArray(value) && value.length > 0;
      }
      // e.g. a group can show images without data
      return hasValue(value) || hasContent(children ?? [], value, childrenScopes);
    });
  }

  return computed(() => hasContent(toValue(nodes), toValue(data), toValue(scopes)));
}
