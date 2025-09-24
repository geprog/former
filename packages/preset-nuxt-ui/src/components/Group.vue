<template>
  <!-- Gruppe mit optionaler Label/Help/Error-Anzeige -->
  <UFormGroup
    :label="label"
    :help="help"
    :error="error"
    class="w-full"
  >
    <!-- Optionaler Rahmen (border=true) -->
    <UCard v-if="border" :ui="{ body: { padding: 'p-4 sm:p-6' } }">
      <slot />
    </UCard>

    <!-- Ohne Rahmen einfach Inhalt rendern -->
    <div v-else>
      <slot />
    </div>
  </UFormGroup>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';

const props = withDefaults(defineProps<{
  /** Überschrift/Label der Gruppe (optional) */
  label?: string
  /** Hilfe-/Beschreibungstext unter dem Label (optional) */
  help?: string
  /** Rahmen um den Inhalt anzeigen */
  border?: boolean
} & Partial<FormerProps>>(), {
  border: false,
});

// nur für Template-Zugriff (optional)
const { label, help, error, border } = props;
</script>
