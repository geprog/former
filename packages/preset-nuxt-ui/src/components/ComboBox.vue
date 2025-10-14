<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
    :label="label"
    :required="required"
    :description="help"
    :error="hasBlurred ? error : undefined"
    class="w-full"
  >
    <UInputMenu
      v-model="modelValue"
      :ui="{ base: 'bg-transparent', content: 'z-[1000]' }"
      class="w-full border border-zinc-300 dark:border-zinc-600 rounded"
      :items="items"
      value-key="value"
      size="lg"
      :disabled="mode === 'read'"
      :content="{ side: 'bottom', align: 'start', sideOffset: 6 }"
      @update:query="updateQuery"
      @blur="hasBlurred = true"
    >
      <template #option-empty="{ query }">
        <div v-if="!disableCustomValue">
          {{ newItemText(query) }}
        </div>
        <div v-else>
          {{ noResultsText }}
        </div>
      </template>
    </UInputMenu>
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { computed, ref, toRef } from 'vue';

const props = defineProps<{
  label?: string
  required?: boolean
  disableCustomValue?: boolean
  help?: string
  placeholder?: string
  options?: ({ value: string } | { value: string; label: string })[]
} & FormerProps>();
const modelValue = defineModel<string>();
const hasBlurred = ref(false);

const options = toRef(props, 'options');
const disableCustomValue = toRef(props, 'disableCustomValue');

const items = computed(() =>
  (options.value ?? []).map(o => 'label' in o ? { label: o.label, value: o.value } : { label: o.value, value: o.value }),
);

function updateQuery(query: string) {
  if (disableCustomValue.value)
    return;
  modelValue.value = query;
}

const newItemText = (q: string) => `New "${q}"`;
const noResultsText = 'No results found';

const { label, required, help, error, mode } = props;
</script>
