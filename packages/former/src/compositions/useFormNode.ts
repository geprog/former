import type { ComputedRef, DeepReadonly } from 'vue';
import type { EditedNode, ValidationContext } from '~/types';
import { computed, readonly } from 'vue';
import { inject } from './injectProvide';

/**
 * The node a component is rendered for, with the path of its data and the scopes of the data it is in
 * (e.g. the repeater item), or `undefined` outside of a form node.
 * It is read-only, as components change their data with their `modelValue` only.
 * Must be called in the `setup` of a component rendered by Former.
 */
export function useFormNode(): ComputedRef<DeepReadonly<ValidationContext> | undefined> {
  const nodeContext = inject('nodeContext', false);
  return computed(() => (nodeContext?.value
    ? readonly(nodeContext.value) as DeepReadonly<ValidationContext>
    : undefined));
}

/**
 * The node whose props are edited, inside of the props form of the builder (see `FormNodeProps`),
 * with its parents and the whole schema, otherwise `undefined`.
 * It is read-only, as the props are changed by the props form only.
 * Must be called in the `setup` of a component.
 */
export function useEditedNode(): ComputedRef<DeepReadonly<EditedNode> | undefined> {
  const editedNode = inject('editedNode', false);
  return computed(() => (editedNode?.value
    ? readonly(editedNode.value) as DeepReadonly<EditedNode>
    : undefined));
}
