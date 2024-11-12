<template>
  <div class="grid grid-cols-2 gap-4 w-full">
    <FormDragContainer :node category="left">
      <FormRenderer
        v-model:data="modelValue"
        :schema="node.children"
        category="left"
      />
    </FormDragContainer>
    <FormDragContainer :node category="right">
      <FormRenderer
        v-model:data="modelValue"
        :schema="node.children"
        category="right"
      />
    </FormDragContainer>
  </div>
</template>

<script setup lang="ts">
import FormDragContainer from '~/components/FormDragContainer.vue';
import FormRenderer from '~/components/FormRenderer.vue';
import type { FormData, FormerProps } from '~/types';

defineProps<FormerProps>();

const modelValue = defineModel<FormData>();
</script>
