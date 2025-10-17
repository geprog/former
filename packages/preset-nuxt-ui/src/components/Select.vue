<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
    :label="label"
    :required="required"
    :description="help"
    :error="hasBlurred ? error : undefined"
    class="w-full"
  >
    <USelect
      v-model="modelValue"
      :items="selectItems"
      :placeholder="placeholder || 'Select…'"
      size="lg"
      :disabled="mode === 'read'"
      class="w-full"
      :ui="{
        base: 'w-full bg-transparent border border-zinc-300 dark:border-zinc-600 rounded'
      }"
      @blur="hasBlurred = true"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui'
import { computed, ref, toRefs } from 'vue'

defineOptions({ inheritAttrs: false })

type Opt = { label: string; value: string }

const props = defineProps<{
  label?: string
  required?: boolean
  help?: string
  options?: Opt[]
  placeholder?: string
} & FormerProps>()

const modelValue = defineModel<string>()
const hasBlurred = ref(false)

const { label, required, help, error, mode, placeholder } = toRefs(props)

const selectItems = computed(() =>
  (props.options ?? []).map(o => ({ label: o.label, value: o.value }))
)
</script>