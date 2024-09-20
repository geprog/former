<template>
  <div class="flex flex-wrap gap-4 w-full">
    <FormDragContainer :node>
      <FormRenderer
        v-model:data="modelValue"
        :schema="node.children"
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
