<template>
  <UFormField :label :required :description="help" :error class="w-full">
    <UInput
      v-model:model-value="modelValue"
      :placeholder
      size="lg"
      :disabled="mode === 'read'"
      class="w-full"
    >
      <template #leading>
        <UPopover :disabled="mode === 'read'">
          <button
            type="button"
            class="size-5 rounded border border-default"
            :class="{ 'cursor-pointer': mode !== 'read' }"
            :style="{ backgroundColor: modelValue || 'transparent' }"
            :aria-label="label"
          />
          <template #content>
            <UColorPicker v-model:model-value="pickerValue" class="p-2" />
          </template>
        </UPopover>
      </template>
    </UInput>
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
    placeholder?: string;
    preset?: string;
  } & FormerProps
>();

// colors are stored as hex strings (e.g. `#00C16A`), they can be typed or chosen with the picker
const modelValue = defineModel<string | null>();
const preset = toRef(props, 'preset');

usePresetValue(modelValue, preset);

const pickerValue = computed({
  get: () => modelValue.value || undefined,
  set: (value: string | undefined) => (modelValue.value = value ?? null),
});
</script>
