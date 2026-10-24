import type { FormComponents, SchemaNode } from '@former-ui/former';
import { inject, type Ref } from 'vue';
import Repeater from '../Repeater.vue';

// detects repeaters by their component, so it also works when they are registered under another type
export function useIsRepeater() {
  const components = inject<Ref<FormComponents> | undefined>('components', undefined);
  return (node: SchemaNode) => components?.value[node.type]?.component === Repeater;
}
