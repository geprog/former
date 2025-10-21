<template>
  <UFormField :label="label" :error="error" class="w-full">
    <div :class="klass ?? 'flex flex-col gap-2 w-full items-start'">
      <div
        v-for="(item, index) in modelValue"
        :key="index"
        class="flex gap-2 w-full items-start"
      >
        <FormDataProvider :data="item">
          <FormRenderer />
        </FormDataProvider>

        <UButton
          v-if="mode !== 'read'"
          type="button"
          variant="soft"
          color="red"
          size="xs"
          @click.stop.prevent="deleteItem(index)"
        >
          ×
        </UButton>
      </div>

      <UButton
        v-if="mode !== 'read'"
        type="button"
        variant="outline"
        icon="i-heroicons-plus"
        @click.stop.prevent="addItem"
      >
        Add {{ itemLabel || 'item' }}
      </UButton>
    </div>
  </UFormField>
</template>

<script setup lang="ts">
import { FormDataProvider, FormRenderer, type FormData, type FormerProps } from 'former-ui'

const props = defineProps<{
  label?: string
  itemLabel?: string
  klass?: string | string[] | Record<string, boolean>
} & Partial<FormerProps>>()

const modelValue = defineModel<FormData[]>({ default: () => [] })

function addItem() {
  modelValue.value = [...(modelValue.value ?? []), {}]
}

function deleteItem(index: number) {
  modelValue.value = [
    ...modelValue.value.slice(0, index),
    ...modelValue.value.slice(index + 1),
  ]
}

const { label, itemLabel, klass, error, mode } = props
</script>