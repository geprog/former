<template>
  <FormKit
    type="button"
    v-for="type in availableFieldTypes"
    :key="type"
    :label="`select ${type} as type for the new input field`"
    @click="addNewElement(type)"
  >
    <span class="text-2xl">{{ type }}</span>
  </FormKit>
</template>
<script setup lang="ts">
import { availableFieldTypes } from './formFieldOptions';
import { inject } from '~/compositions/injectProvide';

const { addNewElement } = inject('newElementHandler');
</script>
