<template>
  <UFormField v-if="!(mode === 'read' && !modelValue)" :error>
    <UCheckbox
      v-model:model-value="modelValue"
      :label
      :required
      :disabled="mode === 'read' || isUpdating"
      :description="help"
      @change="waitForUpdate"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import { usePresetValue } from '@former-ui/former';
import { ref, toRef } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  {
    label?: string;
    required?: boolean;
    help?: string;
    preset?: boolean;
  } & FormerProps
>();

const isUpdating = ref(false);

const modelValue = defineModel<boolean | null>();
const preset = toRef(props, 'preset');

usePresetValue(modelValue, preset);

function waitForUpdate() {
  isUpdating.value = true;
  requestAnimationFrame(() => (isUpdating.value = false));
}
</script>
