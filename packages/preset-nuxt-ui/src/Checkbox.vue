<template>
  <UFormField v-if="!(mode === 'read' && !$props.modelValue)" :error="hasBlurred && error">
    <UCheckbox
      v-model:model-value="modelValue"
      v-bind="$attrs"
      :disabled="mode === 'read' || isUpdating"
      :description="help"
      @blur="hasBlurred = true"
      @change="waitForUpdate"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import { computed, onMounted, ref, toRef, watch } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{ help?: string; preset?: boolean } & FormerProps>();

const isUpdating = ref(false);

const hasBlurred = ref(false);
const modelValue = defineModel<boolean | undefined>();
const preset = toRef(props, 'preset');

// set the preset value to modelValue if modelValue is not set
onMounted(() => {
  if (preset.value && modelValue.value === undefined) {
    modelValue.value = true;
  }
});

watch(preset, () => {
  if (preset.value !== undefined) {
    modelValue.value = preset.value;
  }
});

function waitForUpdate() {
  isUpdating.value = true;
  requestAnimationFrame(() => (isUpdating.value = false));
}
</script>
