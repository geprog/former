<template>
  <UFormField :label="label" :help="help" :error="errorStr" class="w-full">
    <section class="flex flex-col gap-3 w-full">
      <!-- Empty state -->
      <p v-if="!items.length" class="text-xs opacity-60 italic">
        {{ itemLabel || 'Item' }} list is empty. Click “Add”.
      </p>

      <!-- Items -->
      <div
        v-for="(item, index) in items"
        :key="index"
        class="rounded-lg border border-dashed border-zinc-600/60 dark:border-zinc-500/50 p-4"
      >
        <header class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-medium">
            {{ itemLabel || 'Item' }} {{ index + 1 }}
          </h4>
          <UButton
            color="red"
            variant="ghost"
            size="xs"
            :disabled="mode === 'read'"
            @click.prevent="remove(index)"
          >
            Remove
          </UButton>
        </header>

        <FormDataProvider :data="item">
          <FormRenderer />
        </FormDataProvider>
      </div>

      <!-- Add -->
      <div class="mt-2">
        <UButton
          color="primary"
          :disabled="mode === 'read'"
          @click.prevent="add"
        >
          Add {{ itemLabel || 'item' }}
        </UButton>
      </div>
    </section>
  </UFormField>
</template>

<script setup lang="ts">
import type { FormData, FormerProps } from 'former-ui';
import { FormDataProvider, FormRenderer } from 'former-ui';
import { computed } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  label?: string
  help?: string
  itemLabel?: string
} & Partial<FormerProps>>();

const modelValue = defineModel<FormData[]>({ default: () => [] });

const items = computed({
  get: () => modelValue.value ?? [],
  set: v => (modelValue.value = v),
});

function add() {
  items.value = [...items.value, {}];
}

function remove(index: number) {
  items.value = items.value.filter((_, i) => i !== index);
}

const errorStr = computed(() => (typeof props.error === 'string' ? props.error : undefined));
const { label, help, itemLabel, mode } = props;
</script>
