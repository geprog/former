<template>
  <UFormField v-if="!(mode === 'read' && !modelValue)" :label :required :description="help" :error class="w-full">
    <div class="flex w-full flex-col items-center justify-center gap-3">
      <Image v-if="showImages" :id :image="selectedImage" :mode :error class="w-full" />
      <USelect
        v-bind="$attrs"
        v-model:model-value="modelValue"
        :items
        size="lg"
        :disabled="mode === 'read'"
        class="w-full"
      />
    </div>
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import { computed, toRef } from 'vue';

import { useOptions } from './composables/useOptions';
import Image from './Image.vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  {
    label?: string;
    required?: boolean;
    help?: string;
    options?: { label?: string; value: string; image?: string; presetFormula?: string }[];
  } & FormerProps
>();
const modelValue = defineModel<string>();
const options = toRef(props, 'options');

const { items } = useOptions(modelValue, options);

const showImages = computed(() => items.value.some(option => option.image !== undefined));
const selectedImage = computed(() => items.value.find(option => option.value === modelValue.value)?.image);
</script>
