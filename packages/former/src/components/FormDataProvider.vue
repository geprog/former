<template>
  <slot />
</template>

<script setup lang="ts">
import type { FormData } from '~/types';
import { computed, onUnmounted, ref, toRef, watch } from 'vue';
import { inject, provide } from '~/compositions/injectProvide';
import { nanoid } from '~/utils';

const props = defineProps<{ data: FormData }>();
const data = toRef(props, 'data');

provide('data', data);

const id = nanoid();
const validityMap = inject('validityMap');

const childrenValidityMap = ref<Record<string, boolean | undefined>>({});
provide('validityMap', childrenValidityMap);

const areChildrenValid = computed(() => {
  return Object.values(childrenValidityMap.value).every(
    validFlag => validFlag !== false,
  );
});

watch(
  areChildrenValid,
  () => {
    validityMap.value[id] = areChildrenValid.value;
  },
  { immediate: true },
);

onUnmounted(() => {
  delete validityMap.value[id];
});
</script>
