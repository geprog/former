<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
    :label="label"
    :description="help"
    :error="hasBlurred ? error : undefined"
    class="w-full"
  >
    <URadioGroup
      color="primary"
      variant="card"
      v-model="modelValue"
      :items="items"
      option-attribute="label"
      value-attribute="value"
      :disabled="mode === 'read'"
      class="w-full"
      @blur="hasBlurred = true"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui'
import { computed, ref, onMounted } from 'vue'

type Opt = { label?: string; value: string }

const props = defineProps<{
  label?: string
  help?: string
  options?: Array<Opt>
} & Partial<FormerProps>>()

const modelValue = defineModel<string>()
const hasBlurred = ref(false)

const DEFAULT_ITEMS: Required<Opt>[] = [
  { label: 'Item 1', value: 'item_1' },
  { label: 'Item 2', value: 'item_2' }
]

const items = computed(() =>
  (props.options && props.options.length
    ? props.options
    : DEFAULT_ITEMS
  ).map(o => ({ label: o.label ?? o.value, value: o.value }))
)

onMounted(() => {
  if (modelValue.value == null && items.value.length) {
    modelValue.value = items.value[0].value
  }
})

const { label, help, error, mode } = props
</script>