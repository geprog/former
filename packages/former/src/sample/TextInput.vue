<template>
  <div class="flex flex-col w-full">
    <label class="p-1" v-if="label">{{ label }}</label>
    <div class="border rounded">
      <input :type v-model="modelValue" :placeholder class="w-full p-1 rounded" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
    type?: 'text' | 'password' | 'email';
    placeholder?: string;
  }>(),
  {
    type: 'text',
  },
);

const modelValue = defineModel<string>();
</script>
