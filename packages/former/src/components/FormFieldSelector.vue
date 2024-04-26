<template>
  <UseFocusTrap v-if="isSelectorOpen" :options="{ immediate: true }">
    <div role="dialog" class="fixed inset-0 z-20 flex items-center justify-center bg-gray-900 bg-opacity-50">
      <div ref="formFieldSelector" class="rounded bg-white p-8 shadow-md">
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
  </UseFocusTrap>
</template>
<script setup lang="ts">
import { UseFocusTrap } from '@vueuse/integrations/useFocusTrap/component';
import { availableFieldTypes } from './formFieldOptions';
import { useConfirmDialog, onClickOutside } from '@vueuse/core';
import { ref, watch } from 'vue';

const isSelectorOpen = defineModel<boolean>('isSelectorOpen');

const emits = defineEmits<{
  selectedType: [value: string];
}>();

const {
  reveal: openFormFieldSelector,
  confirm: selectType,
  cancel: closeFormFieldSelector,
} = useConfirmDialog<never, string, never>();
const formFieldSelector = ref<HTMLElement>();

watch(isSelectorOpen, async () => {
  if (isSelectorOpen.value) {
    const { data: elementType, isCanceled } = await openFormFieldSelector();
    if (!elementType || isCanceled) {
      closeFormFieldSelector();
      return;
    }
    emits('selectedType', elementType);
  }
});
onClickOutside(formFieldSelector, () => {
  closeFormFieldSelector();
  isSelectorOpen.value = false;
});
</script>
