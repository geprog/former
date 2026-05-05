<template>
  <UFormField :label :required :description="help" :error class="w-full">
    <UInput
      v-bind="$attrs"
      :model-value="internalTextValue"
      :min
      :max
      :step="stepSize"
      type="text"
      size="lg"
      :disabled="mode === 'read'"
      @update:model-value="updateModelValue"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import { computed, onMounted, ref, toRef, watch } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  {
    label?: string;
    required?: boolean;
    help?: string;
    preset?: number;
    min?: number;
    max?: number;
    stepSize?: number;
  } & FormerProps
>();

const modelValue = defineModel<number | string>();

// keep internal text value for being able keep user input as entered by the user
const internalTextValue = ref('');
// and then watch model value to update the internal text value only if necessary
watch(
  modelValue,
  (newValue) => {
    const newNumber = typeof newValue === 'number' ? newValue : stringToNumber(newValue?.toString() ?? '');
    if (
      newNumber !== stringToNumber(internalTextValue.value) // numbers are equal
      && !(newNumber !== undefined && Number.isNaN(newNumber) && newValue === internalTextValue.value) // if not a number, then text must be equal
    ) {
      // only update the text value if the new value results in a different number disregarding the formatting
      internalTextValue.value
        = typeof newNumber === 'number' && !Number.isNaN(newNumber)
          ? newNumber.toString().replace('.', ',')
          : (newValue?.toString() ?? '');
    }
  },
  { immediate: true },
);

const preset = toRef(props, 'preset');

onMounted(() => {
  if (modelValue.value === undefined) {
    modelValue.value = preset.value;
  }
});

watch(preset, () => {
  if (preset.value !== undefined) {
    modelValue.value = preset.value;
  }
});

function updateModelValue(value: string) {
  internalTextValue.value = value;
  const newValue = stringToNumber(value);
  if (newValue !== undefined && Number.isNaN(newValue)) {
    // value from user is not a number so we keep the actual user input so that
    // he can correct it by entering a valid number
    modelValue.value = value;
    return;
  }
  modelValue.value = newValue;
}

/**
 * Utility function to properly convert german number format to numbers
 * @param value
 */
function stringToNumber(value: string): number | undefined {
  return value === '' ? undefined : Number(value.replace('.', '').replace(',', '.'));
}
</script>
