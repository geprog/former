<template>
  <div class="grid grid-cols-2 gap-4 w-full">
    <FormRenderer category="left" />
    <FormRenderer category="right" />
  </div>
</template>

<script setup lang="ts">
import { FormAdd, FormContent, FormDataProvider, Former, FormNodeProps, FormRenderer } from 'former-ui';
</script>
