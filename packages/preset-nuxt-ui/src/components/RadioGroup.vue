<!-- RadioGroup.vue -->
<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
    :label="label"
    :description="help"
    :error="hasBlurred ? error : undefined"
    class="w-full"
  >
    <URadioGroup
      v-model="modelValue"
      :items="items"
      option-attribute="label"
      value-attribute="value"
      :disabled="mode === 'read'"
      size="lg"
      class="w-full rounded border border-dashed border-zinc-300 dark:border-zinc-600"
      @blur="hasBlurred = true"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { computed, ref } from 'vue';

const props = defineProps<{
  label?: string
  help?: string
  options?: Array<{ label?: string; value: string }>
} & Partial<FormerProps>>();
const modelValue = defineModel<string>();
const hasBlurred = ref(false);

const items = computed(() =>
  (props.options ?? []).map(o => ({ label: o.label ?? o.value, value: o.value })),
);

const { label, help, error, mode } = props;
</script>
