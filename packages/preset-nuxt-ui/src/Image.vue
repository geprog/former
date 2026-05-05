<template>
  <div class="flex flex-col items-center justify-center text-center">
    <img
      class="my-1 h-[100px] w-[100px] rounded object-contain"
      :src
      @click="allowImagePopup ? (isOpen = true) : undefined"
    >
    <UModal v-model:open="isOpen" :ui="{ content: 'items-center w-auto h-auto' }">
      <template #content>
        <img class="h-auto max-h-[90vh] w-auto max-w-[90vw] rounded object-contain" :src>
      </template>
    </UModal>
    <span v-if="label" class="w-[100px] break-words">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import type { FormerProps, SchemaNode } from '@former-ui/former';
import { computed, inject, ref, type Ref, toRef } from 'vue';

defineOptions({ inheritAttrs: false });
const props = defineProps<
  {
    image?: string;
    label?: string;
  } & FormerProps
>();
const isOpen = ref(false);
const mode = toRef(props, 'mode');
const nodeId = toRef(props, 'id');
const image = toRef(props, 'image');
const src = computed(() => image.value || '/image-placeholder.jpg');
type SelectedNode = SchemaNode & { _id: string };
const selectedNode = inject<Ref<SelectedNode | undefined>>('selectedNode', ref(undefined));

const allowImagePopup = computed(
  () => mode.value !== 'build' || (!!selectedNode.value && selectedNode.value._id === nodeId.value),
);
</script>
