<template>
  <UFormField :label="label" :description="help" :error="error" class="w-full">
    <div :class="klass" :style="{ display: 'grid', gridTemplateColumns: `repeat(${cols || 1}, minmax(0, 1fr))` }">
      <FormRenderer category="default" />
      <template v-for="i in (cols || 1) - 1" :key="i">
        <FormRenderer :category="`column-${i}`" />
      </template>
    </div>
  </UFormField>
</template>

<script setup lang="ts">
import { type FormerProps, FormRenderer } from 'former-ui';

type ClassNameValue = string | string[] | Record<string, boolean>;

const props = withDefaults(defineProps<{
  label?: string;
  help?: string;
  cols?: number;
  klass?: ClassNameValue;
} & Partial<FormerProps>>(), { cols: 2 });

const { label, help, error, cols, klass } = props;
</script>
