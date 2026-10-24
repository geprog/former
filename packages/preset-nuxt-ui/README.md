# 👩🏾‍🌾 Former – Nuxt UI preset

Ready-to-use form components for [Former](../former/README.md) built with [Nuxt UI](https://ui.nuxt.com).

## Installation

```bash
pnpm add @former-ui/former @former-ui/preset-nuxt-ui @nuxt/ui @internationalized/date vue-i18n
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

## Storing form data

Fields can have a preset value. A preset is applied as long as the field's key does not exist in the form data. This way a field that is newly added to a form, or that becomes visible again, gets its preset, while a field the user cleared on purpose stays empty.

A cleared field is therefore stored as `null`, never removed from the data. An unchecked checkbox or switch counts as cleared, so it is `null` as well and only checked ones are stored as `true`. **Your backend must store and return `null` values unchanged.** If it drops them (e.g. `omitempty` in Go, `NON_NULL` in Jackson or `exclude_none` in Pydantic), cleared fields get their preset back the next time the form is opened.

In read mode presets are never applied.

File uploads are stored as data URL with the file name as `name` parameter, e.g. `data:image/png;name=floor%20plan.png;base64,...`. Browsers ignore the parameter, so the value can be used as image source directly.
