<template>
  <UCard>
    <div class="flex w-full gap-2">
      <FormDataProvider :data="item">
        <FormRenderer class="w-full" />
      </FormDataProvider>
    </div>
    <template #header>
      <div class="flex items-center justify-between gap-4">
        <span class="block font-medium text-gray-700 dark:text-gray-200">{{
          `${itemLabel ?? 'Item'} ${index + 1}`
        }}</span>
        <UButton
          v-if="mode !== 'read'"
          variant="soft"
          color="error"
          icon="i-heroicons-trash"
          @click.prevent="$emit('delete', index)"
        />
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import type { FormData, Mode } from '@former-ui/former';
import { FormDataProvider, FormRenderer } from '@former-ui/former';

defineProps<{
  item: FormData;
  itemLabel?: string;
  index: number;
  mode: Mode;
}>();

defineEmits<{
  delete: [index: number];
}>();
</script>
