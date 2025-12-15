# 👩🏾‍🌾 Former

Former is a headless library for building and handling forms for Vue using an UI. The available components must be configured externally so that it is highly customizable per use case.

It includes further headless features like

- conditional showing elements
- validation

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

## Tailwind CSS Configuration

Former UI uses Tailwind CSS for styling. The library's build **excludes** Tailwind's base reset styles (preflight) to avoid conflicts with your app's own CSS reset.

### Option 1: Import the library's CSS file (Recommended)

Import the pre-built CSS file in your app:

```js
// In your main.js or main.ts
import 'former-ui/former-ui.css';
```

Make sure your consuming app includes Tailwind's base reset in your own CSS:

```css
/* In your app's main CSS file */
@tailwind base; /* Include this in your app */
@tailwind components;
@tailwind utilities;
```

### Option 2: Include Former UI in your Tailwind build

If you want to include Former UI's classes in your own Tailwind build, add the library's source files to your Tailwind `content` configuration:

```js
// tailwind.config.js
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    // Include Former UI source files so Tailwind can scan them
    './node_modules/former-ui/dist/**/*.{js,vue}',
  ],
  theme: {
    extend: {
      // Your theme customizations
    },
  },
  plugins: [],
};
```

This way, Tailwind will generate only the classes used by both your app and Former UI.

### Dark Mode Configuration

**Important:** Former UI uses Tailwind's `selector`-based dark mode. If you're using Option 2 (building your own Tailwind CSS), you **must** configure your Tailwind config to use `selector`-based dark mode:

```js
// tailwind.config.js
export default {
  // ... other config
  darkMode: 'selector', // Required for Former UI dark mode to work correctly
};
```

This means dark mode is activated by adding a `dark` class to a parent element (typically `<html>` or a wrapper element), rather than using the system preference. If you're using Option 1 (importing the pre-built CSS), the dark mode classes are already included, but you still need to ensure your app's Tailwind config uses `darkMode: 'selector'` if you're also generating your own Tailwind CSS.

## Usage

Just configure your form layout, define the components and let former do the rest.

```vue
<template>
  <div>
    <label>Former mode:</label>
    <select v-model="mode">
      <option value="build">
        build
      </option>
      <option value="edit">
        edit
      </option>
      <option value="read">
        read
      </option>
    </select>
  </div>
  <Former v-slot="{ selectedNode }" v-model:schema="schema" v-model:data="data" :mode :components>
    <main>
      <h1>My Form</h1>
      <FormContent />
    </main>

    <aside>
      <h2>Form Config</h2>
      <template v-if="mode === 'build'">
        <FormNodeProps v-if="selectedNode" />
        <FormAdd v-else />
      </template>
      <pre>{{ data }}</pre>
    </aside>
  </Former>
</template>

<script setup lang="ts">
import { FormAdd, type FormComponents, type FormData, Former, FormNodeProps, Mode, type SchemaNode } from 'former-ui';
import { markRaw, ref } from 'vue';

import TextInput from './TextInput.vue';

const schema = ref<SchemaNode[]>([
  {
    type: 'text',
    name: 'name',
    props: {
      label: 'Name',
      placeholder: 'Enter your name',
    },
  },
  {
    type: 'text',
    name: 'email',
    props: {
      label: 'Email',
      placeholder: 'Enter your e-mail',
      type: 'email'
    },
  },
  {
    type: 'text',
    name: 'password',
    props: {
      label: 'Password',
      placeholder: 'Enter your password',
      type: 'password'
    },
  },
]);

const components: FormComponents = {
  text: {
    label: 'Text',
    component: markRaw(TextInput),
    propsSchema: [
      {
        type: 'text',
        name: '$name',
        props: {
          label: 'Name',
          placeholder: 'Enter the name of the data field',
        },
      },

      {
        type: 'text',
        name: 'label',
        props: {
          label: 'Label',
          placeholder: 'Enter a label',
        },
      },
      {
        type: 'text',
        name: 'placeholder',
        props: {
          label: 'Placeholder',
          placeholder: 'Enter a placeholder',
        },
      },
      {
        type: 'text',
        name: 'type',
        props: {
          label: 'Text input type',
          placeholder: 'Specify the text input type e.g. "text", "password", "email", ...'
        }
      }
    ],
  },
};

const mode = ref<Mode>('edit');

const data = ref<FormData>({});
</script>
```

Of course you need to provide the relevant component implementations.
Here is a sample text input implementation that is suitable for the above sample

```vue
<template>
  <div>
    <label v-if="label" :for="id">{{ label }}</label>
    <div>
      <input :id v-model="modelValue" :disabled="mode === 'read'" :type :placeholder>
    </div>
    <div v-if="error">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';

const props = withDefaults(
  defineProps<{
    label?: string;
    type?: 'text' | 'password' | 'email';
    placeholder?: string;
  } & FormerProps>(),
  {
    type: 'text',
  },
);
const modelValue = defineModel<string>();
</script>
```

For more detailed usage example check out the [Playground](https://github.com/geprog/former/blob/main/packages/former/src/Playground.vue) implementation.
