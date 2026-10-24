<template>
  <UFormField
    v-if="!(mode === 'read' && !hasContent)"
    :label
    :error
    :description="help"
    class="flex w-full flex-col"
    :class="{ 'gap-1 pt-3': $props.label }"
  >
    <UCard class="w-full">
      <FormRenderer />
    </UCard>
  </UFormField>
</template>

<script setup lang="ts">
import type { FormData, FormerProps, SchemaNode } from '@former-ui/former';
import { FormRenderer, nodeChildren, useHasContent } from '@former-ui/former';
import { inject, type Ref } from 'vue';
import { useIsRepeater } from './composables/useIsRepeater';

defineOptions({ inheritAttrs: false });

defineProps<
  {
    label?: string;
    help?: string;
  } & FormerProps
>();
const modelValue = defineModel<FormData | null | undefined>();
const node = inject<Ref<SchemaNode> | undefined>('node', undefined);
const hasContent = useHasContent(() => (node ? nodeChildren(node.value) : []), modelValue, { isList: useIsRepeater() });
</script>
