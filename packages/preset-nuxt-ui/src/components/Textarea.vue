<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
    :label="label"
    :required="required"
    :description="help"
    :error="hasBlurred ? error : undefined"
    class="w-full"
  >
    <UTextarea
      v-model="modelValue"
      :rows="rows"
      :autoresize="autoresize"
      :disabled="mode === 'read'"
      :ui="ui"
      :class="klass"
      v-bind="$attrs"
      @blur="hasBlurred = true"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui'
import { ref, toRef } from 'vue'

type ClassNameValue = string | string[] | Record<string, boolean>

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  label?: string; required?: boolean; help?: string
  rows?: number; autoresize?: boolean
  ui?: Record<string, string>; klass?: ClassNameValue
} & Partial<FormerProps>>(), { rows: 3, autoresize: false })

const modelValue = defineModel<string>()
const hasBlurred = ref(false)

const mode  = toRef(props, 'mode')
const error = toRef(props, 'error')

const { label, required, help, rows, autoresize, ui, klass } = props
</script>