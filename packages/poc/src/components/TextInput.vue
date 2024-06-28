<template>
  <div>
    <input :type v-model="modelValue" :placeholder />
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
