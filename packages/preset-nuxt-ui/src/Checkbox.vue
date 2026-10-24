<template>
  <UFormField v-if="!(mode === 'read' && !modelValue)" :error>
    <UCheckbox
      v-model:model-value="checked"
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
import { computed, ref } from 'vue';

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

// unchecking clears the value, so the data only contains `true` for checked fields
const checked = computed({
  get: () => modelValue.value === true,
  set: value => (modelValue.value = value ? true : null),
});

// an unchecked field is cleared, so a preset of `false` (also the value of a missing prop) is no preset
usePresetValue(modelValue, () => props.preset || undefined);

function waitForUpdate() {
  isUpdating.value = true;
  requestAnimationFrame(() => (isUpdating.value = false));
}
</script>
