# 👩🏾‍🌾 Former

Former is a headless library for building and handlings forms for Vue using an UI. The available components must be configured externally so that it is highly customizable per use case.

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
