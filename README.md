# 👩🏾‍🌾 Former

Former is a library to create [FormKit](https://formkit.com/) forms using an UI.

## Playground

Create and test your own form at [playground](https://geprog.github.io/former).

## Installation

```bash
pnpm add former-ui
```

```bash
npm install former-ui
```

```bash
yarn add former-ui
```

## Usage

```vue
<template>
  <FormBuilder v-model:schema="schema" :mode="mode" v-model:data="data">
    <main id="form-panel">
      <FormContent />
    </main>

    <aside id="form-field-options">
      <FormFieldOptions />

      <pre>{{ data }}</pre>
    </aside>
  </FormBuilder>
</template>

<script setup lang="ts">
import type { FormKitSchemaNode } from '@formkit/core';
import { FormBuilder, FormBuilderOptions } from 'former-ui';

const schema = ref<FormKitSchemaNode[]>([
  {
    $el: 'h1',
    children: 'Register',
    attrs: {
      class: 'text-2xl font-bold mb-4',
    },
  },
  {
    $formkit: 'text',
    name: 'username',
    label: 'Username',
    help: 'This is your username.',
  },
  {
    $formkit: 'text',
    name: 'email',
    label: 'Email',
    help: 'This is your email.',
  },
  {
    $formkit: 'password',
    name: 'password',
    label: 'Password',
    help: 'This is your password.',
  },
  {
    $formkit: 'checkbox',
    name: 'terms',
    label: 'I agree to the terms and conditions.',
  },
]);

const mode = ref<'edit' | 'preview'>('edit');

const data = ref<Record<string, any>>({});
</script>
```

## Credits

- https://github.com/formkit/formkit
