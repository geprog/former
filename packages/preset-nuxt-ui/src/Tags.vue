<template>
  <UFormField :label :required :description="help" :error class="w-full">
    <UInputTags
      v-model:model-value="tags"
      :placeholder
      :max="maxItems ?? undefined"
      add-on-blur
      add-on-paste
      size="lg"
      :disabled="mode === 'read'"
      class="w-full"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import { computed } from 'vue';

defineOptions({ inheritAttrs: false });

defineProps<
  {
    label?: string;
    required?: boolean;
    help?: string;
    placeholder?: string;
    // only used by the validation
    minItems?: number | null;
    maxItems?: number | null;
  } & FormerProps
>();

const modelValue = defineModel<string[] | null>();

// removing all tags clears the value
const tags = computed({
  get: () => modelValue.value ?? [],
  set: (value: string[]) => (modelValue.value = value.length ? value : null),
});
</script>
