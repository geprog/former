<template>
  <div ref="sortableContainer">
    <FormRenderer v-model:data="data" :edit :schema />
  </div>
</template>

<script setup lang="ts">
import { inject } from '~/compositions/injectProvide';
import FormRenderer from './FormRenderer.vue';
import Sortable from 'sortablejs';
import { isRef, nextTick, onBeforeUnmount, onMounted, ref, toValue, type MaybeRef, type MaybeRefOrGetter } from 'vue';

const edit = inject('edit');
const schema = inject('schema');
const data = inject('data');

// from: https://github.com/vueuse/vueuse/blob/main/packages/integrations/useSortable/index.ts
function moveArrayElement<T>(list: MaybeRefOrGetter<T[]>, from: number, to: number): void {
  const _valueIsRef = isRef(list);
  // When the list is a ref, make a shallow copy of it to avoid repeatedly triggering side effects when moving elements
  const array = _valueIsRef ? [...toValue(list)] : toValue(list);

  if (to >= 0 && to < array.length) {
    const element = array.splice(from, 1)[0];
    nextTick(() => {
      array.splice(to, 0, element);
      // When list is ref, assign array to list.value
      if (_valueIsRef) (list as MaybeRef).value = array;
    });
  }
}

const sortableContainer = ref<HTMLElement>();
let sortable: Sortable | null = null;
onMounted(() => {
  if (!sortableContainer.value) {
    throw new Error('sortableContainer is not defined');
  }

  Sortable.create(sortableContainer.value, {
    group: {
      name: 'shared',
    },
    draggable: '.former-draggable',
    handle: '.drag-handle',
    animation: 150,
    fallbackOnBody: true,
    swapThreshold: 0.65,
    onUpdate: (e) => {
      moveArrayElement(schema, e.oldIndex!, e.newIndex!);
    },
  });
});

onBeforeUnmount(() => {
  sortable?.destroy();
  sortable = null;
});
</script>
