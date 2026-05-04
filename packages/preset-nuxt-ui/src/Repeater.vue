<template>
  <div class="flex flex-col gap-2 w-full items-start">
    <span v-if="label" class="text-sm font-medium">{{ label }}</span>
    <div v-for="(item, index) in modelValue" :key="index" class="flex gap-2 w-full">
      <FormDataProvider :data="item">
        <FormRenderer />
      </FormDataProvider>
      <UButton v-if="mode !== 'read'" color="neutral" variant="soft" @click.prevent="deleteItem(index)">
        x
      </UButton>
    </div>
    <UButton v-if="mode !== 'read'" @click.prevent="addItem">
      Add
    </UButton>
  </div>
</template>

<script setup lang="ts">
import type { FormData, FormerProps } from '@former-ui/former';
import UButton from '@nuxt/ui/components/Button.vue';
import { FormDataProvider, FormRenderer } from '@former-ui/former';

defineProps<{
  label?: string;
  placeholder?: string;
} & FormerProps>();

const modelValue = defineModel<FormData[]>({
  default: () => [],
});

function addItem() {
  if (!modelValue.value) {
    modelValue.value = [];
  }
  modelValue.value = [...modelValue.value, {}];
}

function deleteItem(index: number) {
  modelValue.value = [...modelValue.value.slice(0, index), ...modelValue.value.slice(index + 1)];
}
</script>
