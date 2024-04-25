<template>
  <div
    ref="formFieldSelector"
    v-if="isFormFieldSelectorOpen"
    role="dialog"
    class="fixed inset-0 z-20 flex items-center justify-center bg-gray-900 bg-opacity-50"
  >
    <div class="rounded bg-white p-8 shadow-md">
      <div class="text-center">
        <p class="mb-10 text-4xl">Select the type of input field</p>
        <div class="flex flex-col items-center">
          <FormKit
            type="button"
            v-for="type in availableFieldTypes"
            :key="type"
            :label="`select ${type} as type for the new input field`"
            @click="selectType(type)"
          >
            <span class="text-2xl">{{ type }}</span>
          </FormKit>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { UseFocusTrap } from '@vueuse/integrations/useFocusTrap/component';
import { availableFieldTypes } from './formFieldOptions';
import { useConfirmDialog, onClickOutside } from '@vueuse/core';
import { ref, toRef, watch } from 'vue';

const props = defineProps<{
  isSelectorOpen: boolean;
}>();

const {
  reveal: openFormFieldSelector,
  isRevealed: isFormFieldSelectorOpen,
  confirm: selectType,
  cancel: closeFormFieldSelector,
  onConfirm,
} = useConfirmDialog();
const formFieldSelector = ref<HTMLElement>();
const open = toRef(props, 'isSelectorOpen');
const selectedType = ref<'text' | 'number'>();

watch(open, async () => {
  if (open.value === true) {
    const { data: elementType, isCanceled } = await openFormFieldSelector();
  }
});

onClickOutside(formFieldSelector, () => closeFormFieldSelector());
</script>
