<template>
  <FormRenderer v-model:data="data" :edit :schema />
</template>

<script setup lang="ts">
import { inject } from '~/compositions/injectProvide';
import FormRenderer from './FormRenderer.vue';

const edit = inject('edit');
const schema = inject('schema');
const data = inject('data');
</script>
