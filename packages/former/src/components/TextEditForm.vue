<template>
          <FormKit
        type="text"
        name="name"
        label="Name"
        help="What do people call you?"
        v-model="properties.name"
      />
      <FormKit
        type="text"
        name="label"
        label="Label"
        help="What should the user see?"
        v-model="properties.label"
      />
      <FormKit
        type="text"
        name="help"
        label="Help"
        help="What should the user know?"
        v-model="properties.help"
      />
      </template>

      <script setup lang="ts">
import { FormKit } from '@formkit/vue';

const properties = defineModel<{name: string; label: string; help: string}>('properties', {required: true});

</script>
