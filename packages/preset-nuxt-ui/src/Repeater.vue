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
      :key="itemKey(item, index)"
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
import { computed, toRaw } from 'vue';

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

const modelValue = defineModel<FormData[] | null>({
  default: () => [],
});

// items are keyed by their object, so the components of the remaining items are kept
// when an item is deleted (keying by index would show other items in them)
const itemKeys = new WeakMap<object, number>();
let nextItemKey = 0;
function itemKey(item: FormData, index: number) {
  if (item === null || typeof item !== 'object') {
    return `index-${index}`;
  }
  const raw = toRaw(item);
  if (!itemKeys.has(raw)) {
    itemKeys.set(raw, nextItemKey++);
  }
  return itemKeys.get(raw)!;
}

function addItem() {
  modelValue.value = [...(modelValue.value ?? []), {}];
}
function deleteItem(index: number) {
  const items = modelValue.value ?? [];
  modelValue.value = [...items.slice(0, index), ...items.slice(index + 1)];
}
</script>
