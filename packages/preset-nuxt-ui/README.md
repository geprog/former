# 👩🏾‍🌾 Former – Nuxt UI preset

Ready-to-use form components for [Former](../former/README.md) built with [Nuxt UI](https://ui.nuxt.com).

## Installation

```bash
pnpm add @former-ui/former @former-ui/preset-nuxt-ui @nuxt/ui @internationalized/date vue-i18n zod
```

Set up [Nuxt UI for Vue](https://ui.nuxt.com/docs/getting-started/installation/vue) and let its Vite plugin scan the preset. The preset uses the Nuxt UI components (`UInput`, `UFormField`, …) without importing them, so they are only resolved if the preset is listed in `scanPackages`:

```ts
// vite.config.ts
import ui from '@nuxt/ui/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    vue(),
    ui({
      scanPackages: ['@former-ui/preset-nuxt-ui'],
    }),
  ],
});
```

```ts
// main.ts
import ui from '@nuxt/ui/vue-plugin';
import { createApp } from 'vue';
import App from './App.vue';
import { i18n } from './i18n'; // see "Texts" below
import './main.css';

createApp(App).use(ui).use(i18n).mount('#app');
```

Tailwind does not scan `node_modules`, so add the preset as a source to the CSS file that imports Nuxt UI. Former's own classes can be included the same way (see [Styling](../former/README.md#option-2-include-former-ui-in-your-tailwind-build) for the alternatives):

```css
/* main.css */
@import 'tailwindcss';
@import '@nuxt/ui';

@source '../node_modules/@former-ui/preset-nuxt-ui/dist';
@source '../node_modules/@former-ui/former/dist';
```

## Usage

```vue
<template>
  <UApp :locale="de">
    <Former v-model:schema="schema" v-model:data="data" :components mode="edit">
      <FormContent />
    </Former>
  </UApp>
</template>

<script setup lang="ts">
import type { FormData, SchemaNode } from '@former-ui/former';
import { FormContent, Former } from '@former-ui/former';
import { useFormComponents } from '@former-ui/preset-nuxt-ui';
import { de } from '@nuxt/ui/locale';
import { ref } from 'vue';

const schema = ref<SchemaNode[]>([]);
const data = ref<FormData>({});

const components = useFormComponents();
</script>
```

## Texts

The preset uses [vue-i18n](https://vue-i18n.intlify.dev) for its texts. It ships english texts in `@former-ui/preset-nuxt-ui/en.json`. Add them to the messages of your i18n instance and overwrite or translate the keys you need:

```ts
import en from '@former-ui/preset-nuxt-ui/en.json';
import { createI18n } from 'vue-i18n';

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: { ...en, text_field: 'Short text' },
    de: { add_item: '{item} hinzufügen', repeater_item: 'Element', /* ... */ },
  },
});
```

`useFormComponents` uses this i18n instance for the labels of the components and their settings in the form builder as well, and updates them when the locale changes. As it uses `useI18n`, call it in the `setup` of a component.

## Validation

The components validate their data with the settings of the form builder: a field with `required` needs a value (a checkbox or switch needs to be checked, a repeater needs an item), repeaters check their minimum and maximum number of items, file uploads check their maximum size, number and date fields check their `min` and `max`, text fields and free texts check their length, and text fields check the format of emails and URLs. This applies to the settings of the nodes in build mode as well, e.g. the required technical name. The error messages are texts of the preset (`error_required`, `error_min_value`, …), so they can be translated like the others.

The validation is built with [Zod](https://zod.dev). To validate more, replace the `validation` of a component and fall back to the one of the preset. The second parameter is the context of the node with its `path` and the `scopes` of data containing it (see [Former](../former/README.md#form-data-and-validation)), e.g. to compare it to a field next to it:

```ts
import type { FormComponents, FormData } from '@former-ui/former';
import { useFormComponents } from '@former-ui/preset-nuxt-ui';
import { computed } from 'vue';
import { z } from 'zod';

const presetComponents = useFormComponents();
const components = computed<FormComponents>(() => {
  const { text } = presetComponents.value;
  return {
    ...presetComponents.value,
    text: {
      ...text,
      validation: (props, context) => {
        // `confirms` is the name of the field to repeat, e.g. an email in the same group or repeater item
        if (!props.confirms) {
          return text.validation(props, context);
        }
        // the data of a scope is unset until something was filled in
        const confirmed = ((context.scopes[0].data ?? {}) as FormData)[props.confirms];
        return z.custom(value => value === confirmed, 'The values do not match');
      },
    },
  };
});
```

## Storing form data

Fields can have a preset value. A preset is applied as long as the field's key does not exist in the form data. This way a field that is newly added to a form, or that becomes visible again, gets its preset, while a field the user cleared on purpose stays empty.

A cleared field is therefore stored as `null`, never removed from the data. An unchecked checkbox or switch counts as cleared, so it is `null` as well and only checked ones are stored as `true`. **Your backend must store and return `null` values unchanged.** If it drops them (e.g. `omitempty` in Go, `NON_NULL` in Jackson or `exclude_none` in Pydantic), cleared fields get their preset back the next time the form is opened.

In read mode presets are never applied.

File uploads are stored as data URL with the file name as `name` parameter, e.g. `data:image/png;name=floor%20plan.png;base64,...`. Browsers ignore the parameter, so the value can be used as image source directly.
