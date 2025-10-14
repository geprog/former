<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
    :label="label"
    :required="required"
    :error="error"
    class="flex w-full flex-col gap-2 [&>*]:w-full"
  >
    <div
      v-for="(item, index) in modelValue"
      :key="index"
      class="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-4 [&:not(:last-child)]:mb-2"
    >
      <header class="flex items-center justify-between gap-4 mb-3">
        <span class="block font-medium text-gray-700 dark:text-gray-200">
          {{ `${itemLabel || defaultLabels.repeaterItem} ${index + 1}` }}
        </span>
        <UButton
          v-if="mode !== 'read'"
          variant="soft"
          color="red"
          icon="i-heroicons-trash"
          size="xs"
          @click.prevent="deleteItem(index)"
        />
      </header>

      <div class="flex w-full gap-2">
        <FormDataProvider :data="item">
          <FormRenderer class="w-full" />
        </FormDataProvider>
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <UButton
        v-if="mode !== 'read'"
        :label="`${defaultLabels.add} ${itemLabel || defaultLabels.item}`"
        icon="i-heroicons-plus"
        variant="outline"
        block
        @click.prevent="addItem"
      />
    </div>
  </UFormField>
</template>

<script setup lang="ts">
import { type FormData, FormDataProvider, type FormerProps, FormRenderer } from 'former-ui';

const props = defineProps<{
  label?: string
  placeholder?: string
  required?: boolean
  itemLabel?: string
} & FormerProps>();

const modelValue = defineModel<FormData[]>({ default: () => [] });

// eslint-disable-next-line style/max-statements-per-line
function addItem() { modelValue.value = [...modelValue.value, {}]; }
function deleteItem(index: number) {
  modelValue.value = [...modelValue.value.slice(0, index), ...modelValue.value.slice(index + 1)];
}

const defaultLabels = {
  repeaterItem: 'Item',
  add: 'Add',
  item: 'item',
};

const { label, required, itemLabel, error, mode } = props;
</script>
