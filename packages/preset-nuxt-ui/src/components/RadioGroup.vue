<template>
  <UFormGroup :label="label" :help="help" :error="error">
    <URadioGroup v-model="modelValue" :disabled="mode === 'read'">
      <div class="flex flex-col gap-2">
        <URadio
          v-for="(opt, i) in options"
          :key="i"
          v-bind="$attrs"
          :value="opt.value"
          :label="opt.label"
        />
      </div>
    </URadioGroup>
  </UFormGroup>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { toRefs } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{ label?: string; help?: string; options?: Opt[] } & Partial<FormerProps>>();
type Opt = { label: string; value: string };
const modelValue = defineModel<string>();
const { label, help, error, mode } = toRefs(props);
const options = props.options ?? [];
</script>
