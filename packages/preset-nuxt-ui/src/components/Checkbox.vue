<template>
  <UFormField
    v-if="!(mode === 'read' && modelValue === undefined)"
    :label="fieldLabel"
    :description="help"
    :error="hasBlurred ? error : undefined"
  >
    <UCheckbox
      v-model="modelValue"
      :label="checkboxLabel || label"
      :disabled="mode === 'read' || isUpdating"
      @blur="hasBlurred = true"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { computed, onMounted, ref } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  label?: string
  help?: string
  checkboxLabel?: string
  preset?: boolean
} & Partial<FormerProps>>();

const modelValue = defineModel<boolean | undefined>();
const hasBlurred = ref(false);
const isUpdating = ref(false);

const fieldLabel = computed(() => (props.checkboxLabel ? undefined : props.label));

onMounted(() => {
  if (props.preset !== undefined && modelValue.value === undefined)
    modelValue.value = props.preset;
});
</script>
