<template>
  <div class="flex flex-col gap-2">
    <span>Add an element by dragging into the form</span>
    <div class="grid grid-cols-2 gap-4" ref="sortableContainer">
      <div v-for="(component, i) in components" :key="i" class="flex flex-col gap-2" :data-type="i">
        <span>{{ component.label }}</span>

        <div class="flex flex-grow flex-col border rounded p-2 bg-white gap-2 !cursor-move former-draggable">
          <div class="pointer-events-none">
            <FormComponent
              :node="{
                _id: '123',
                type: i,
              }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { inject } from '~/compositions/injectProvide';

import Sortable from 'sortablejs';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import FormComponent from './FormComponent.vue';
import { nanoid } from '~/utils';

const sortableContainer = ref<HTMLElement>();

const components = inject('components');
const schema = inject('schema');

let sortable: Sortable | null = null;

onMounted(() => {
  if (!sortableContainer.value) {
    throw new Error('sortableContainer is not defined');
  }

  sortable = Sortable.create(sortableContainer.value, {
    group: {
      name: 'shared',
      put: false, // Do not allow items to be put into this list
      pull: 'clone', // To clone: set pull to 'clone'
      revertClone: true,
    },
    // draggable: '.former-draggable',
    sort: false,
    animation: 150,
    onEnd: (e) => {
      if (e.newIndex === undefined) {
        return;
      }

      const type = e.item.getAttribute('data-type');

      if (type === null) {
        console.error('data-type attribute is not defined');
        return;
      }

      schema.value.splice(e.newIndex, 0, {
        _id: nanoid(),
        type,
        props: {
          options: [],
        },
      });

      e.item.remove();
    },
  });
});

onBeforeUnmount(() => {
  sortable?.destroy();
  sortable = null;
});
</script>
