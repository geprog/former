<template>
  <UFormField v-if="!(mode === 'read' && !modelValue)" :label :required :description="help" :error class="w-full">
    <UInput v-bind="$attrs" v-model:model-value="modelValue" type="text" size="lg" :disabled="mode === 'read'" />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import { onMounted, toRef } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  {
    label?: string;
    required?: boolean;
    help?: string;
    preset?: string;
  } & FormerProps
>();

const modelValue = defineModel<string>();
const preset = toRef(props, 'preset');

onMounted(() => {
  if (modelValue.value === undefined && preset.value !== undefined)
    modelValue.value = preset.value;
});
</script>
