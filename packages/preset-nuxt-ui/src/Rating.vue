<template>
  <UFormField :label :required :description="help" :error>
    <UInputRating
      v-model:model-value="rating"
      :length="stars || DEFAULT_STARS"
      :step="halfStars ? 0.5 : 1"
      :clearable="!required"
      :required
      size="lg"
      :readonly="mode === 'read'"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import { usePresetValue } from '@former-ui/former';
import { computed, toRef } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  {
    label?: string;
    required?: boolean;
    help?: string;
    stars?: number | null;
    halfStars?: boolean;
    preset?: number;
  } & FormerProps
>();

const DEFAULT_STARS = 5;

const modelValue = defineModel<number | null | undefined>();
const preset = toRef(props, 'preset');

usePresetValue(modelValue, preset);

// clearing the rating (clicking the chosen star again) sets it to 0, which clears the value
const rating = computed({
  get: () => modelValue.value ?? 0,
  set: (value: number) => (modelValue.value = value || null),
});
</script>
