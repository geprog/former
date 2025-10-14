<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
    :label="label"
    :required="required"
    :description="help"
    :error="hasBlurred ? error : undefined"
    class="w-full"
  >
    <div class="relative w-full">
      <USelectMenu
        v-model="modelValue"
        :items="items"
        value-key="value"
        size="lg"
        :disabled="mode === 'read'"
        class="w-full border border-zinc-300 dark:border-zinc-600 rounded"
        :content="{
          side: 'bottom',
          align: 'start',
          sideOffset: 6,
        }"
        :ui="{ content: 'z-[1000]' }"
        @blur="hasBlurred = true"
      />
    </div>
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { computed, ref, toRefs } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  label?: string
  required?: boolean
  help?: string
  options?: Opt[]
} & FormerProps>();

type Opt = { label: string; value: string };

const modelValue = defineModel<string>();
const hasBlurred = ref(false);

const { label, required, help, error, mode } = toRefs(props);
const items = computed(() => props.options ?? []);
</script>
