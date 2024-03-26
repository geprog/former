<template>
  <TextFieldOptions
    v-if="type === 'text'"
    :properties="{
      name: 'name',
      label: 'Label',
      help: 'Help',
    }"
  />
</template>

<script setup lang="ts">
import TextFieldOptions from './TextFieldOptions.vue';

const type = 'text';
</script>
