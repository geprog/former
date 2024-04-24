<template>
  <UseFocusTrap>
    <div role="dialog" class="fixed inset-0 z-20 flex items-center justify-center bg-gray-900 bg-opacity-50">
      <div class="rounded bg-white p-8 shadow-md">
        <div class="text-center">
          <p class="mb-10 text-4xl">Select the type of input field</p>
          <slot />
        </div>
      </div>
    </div>
  </UseFocusTrap>
</template>
<script setup lang="ts">
import { UseFocusTrap } from '@vueuse/integrations/useFocusTrap/component';
</script>
