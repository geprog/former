<template>
  <UFormField :label="label" :error="error" class="w-full">
    <div :class="klass ?? 'flex flex-col gap-2 w-full items-start'">
      <div v-for="(item, index) in modelValue" :key="index" class="flex gap-2 w-full items-start">
        <FormDataProvider :data="item">
          <FormRenderer />
        </FormDataProvider>

        <UButton
          v-if="mode !== 'read'" type="button" variant="soft"
          class="w-7 h-7 grid place-items-center border border-zinc-300 dark:border-zinc-600 rounded"
          aria-label="Remove item" @click.stop.prevent="deleteItem(index)"
        >
          <span class="leading-none text-base">×</span>
        </UButton>
      </div>

      <div class="self-start">
        <UButton
          v-if="mode !== 'read'" type="button" variant="outline" icon="i-heroicons-plus"
          class="w-auto inline-flex border border-zinc-300 dark:border-zinc-600"
          @click.stop.prevent="addItem"
        >
          Add {{ itemLabel || 'item' }}
        </UButton>
      </div>
    </div>
  </UFormField>
</template>

<script setup lang="ts">
import { type FormData, FormDataProvider, type FormerProps, FormRenderer } from 'former-ui';

const props = defineProps<{
  label?: string;
  itemLabel?: string;
  klass?: string | string[] | Record<string, boolean>;
} & Partial<FormerProps>>();

const modelValue = defineModel<FormData[]>({ default: () => [] });

function addItem() {
  modelValue.value = [...(modelValue.value ?? []), {}];
}

function deleteItem(index: number) {
  modelValue.value = [
    ...modelValue.value.slice(0, index),
    ...modelValue.value.slice(index + 1),
  ];
}

const { label, itemLabel, klass, error, mode } = props;
</script>
