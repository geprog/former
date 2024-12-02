<template>
  <div class="grid grid-cols-2 gap-4 w-full">
    <FormRenderer category="left" />
    <FormRenderer category="right" />
  </div>
</template>

<script setup lang="ts">
import FormRenderer from '~/components/FormRenderer.vue';
</script>
