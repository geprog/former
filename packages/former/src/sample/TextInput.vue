<template>
  <div class="border rounded">
    <input :type v-model="modelValue" :placeholder class="w-full p-1 rounded" />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    type?: 'text' | 'password' | 'email';
    placeholder?: string;
  }>(),
  {
    type: 'text',
  },
);

const modelValue = defineModel<string>({
  required: true,
});
</script>
