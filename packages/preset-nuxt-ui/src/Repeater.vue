<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
    :label
    :required
    :error
    class="flex w-full flex-col gap-2 [&>*]:w-full"
  >
    <RepeaterItem
      v-for="(item, index) in modelValue"
      :key="index"
      :index
      :item
      :item-label
      :mode="mode"
      class="[&:not(:last-child)]:mb-2"
      @delete="deleteItem(index)"
    />
    <div class="flex flex-col gap-4">
      <UButton
        v-if="mode !== 'read'"
        :label="addButtonLabel"
        icon="i-heroicons-plus"
        variant="outline"
        block
        @click.prevent="addItem"
      />
    </div>
  </UFormField>
</template>

<script setup lang="ts">
import type { FormData, FormerProps } from '@former-ui/former';
import { computed } from 'vue';

import RepeaterItem from './RepeaterItem.vue';

const props = defineProps<
  {
    label?: string;
    placeholder?: string;
    required?: boolean;
    itemLabel?: string;
  } & FormerProps
>();

const addButtonLabel = computed(() => {
  const item = props.itemLabel ?? 'item';
  return `Add ${item}`;
});

const modelValue = defineModel<FormData[]>({
  default: () => [],
});

function addItem() {
  modelValue.value = [...modelValue.value, {}];
}
function deleteItem(index: number) {
  modelValue.value = [...modelValue.value.slice(0, index), ...modelValue.value.slice(index + 1)];
}
</script>
