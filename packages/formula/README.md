# 🧮 Former Formula

Formulas for [Former](https://github.com/geprog/former/blob/main/packages/former/README.md), based on [mathjs](https://mathjs.org): conditions to show nodes, props calculated from the data of the form (e.g. the maximum of a number field) and calculations in components.

```
$dimensions.width * $dimensions.height
equalText($color, 'red') and $count > 2
sum(map($rows, f($rows_item) = $rows_item.width * $rows_item.height))
```

## Installation

```bash
pnpm add @former-ui/formula mathjs vue-i18n
```

Its components are styled with [Tailwind CSS](https://tailwindcss.com). Tailwind does not scan `node_modules`, so add the package as a source to your CSS file:

```css
/* main.css */
@import 'tailwindcss';

@source '../node_modules/@former-ui/formula/dist';
```

The package has two entries:

- `@former-ui/formula`: the engine, which doesn't depend on Vue, so it can evaluate formulas on a server too
- `@former-ui/formula/vue`: the integration into Former

## Usage

```vue
<template>
  <Former v-model:schema="schema" v-model:data="data" :components :show-if />
</template>

<script setup lang="ts">
import { createFormulaEngine, valueSource } from '@former-ui/formula';
import { useFormulaProps, useFormulaShowIf } from '@former-ui/formula/vue';
import { formulaProps, useFormComponents } from '@former-ui/preset-nuxt-ui';
import { all, create } from 'mathjs';

const engine = createFormulaEngine({
  math: create(all)
});
const sources = [
  valueSource({
    id: 'settings',
    values: { taxRate: 0.19 }
  })
];

const presetComponents = useFormComponents();
const components = useFormulaProps(presetComponents, formulaProps, {
  engine,
  sources,
  // the component editing formulas in the props form
  editor: { component: presetComponents.value.textarea.component },
});
const showIf = useFormulaShowIf({ engine, sources, components });
</script>
```

`useFormulaProps` adds formulas to the props of the components (see [Formula props](#formula-props)) and provides the engine and sources to the form. `useFormulaShowIf` returns a `showIf` predicate for `Former`, which shows a node if the formula in its `showIf` prop evaluates to `true`. Both have to be called in the `setup` of the component rendering the form.

## Variables

Every variable starts with `$`, so that it can't be mistaken for a function or constant of mathjs (e.g. `e` or `pi`) or a unit (e.g. `t`).

- The fields of the form are named by the path of their data, e.g. `$dimensions.width` for the field `width` of the group `dimensions`.
- A list (e.g. a repeater `rows`) is `$rows`, its current item is `$rows_item`, e.g. `$rows_item.width`. The item is available in the nodes inside of the list and in callbacks of `map`, `filter` and `forEach`: `sum(map($rows, f($rows_item) = $rows_item.width))`.
- A variable without value is `''`, which is `0` in calculations and doesn't match in comparisons, a list without value is `[]`.
- Text is compared with `equalText($color, 'red')`, as `==` compares numbers.

## External data

Data that isn't part of the form is provided by sources:

```ts
import { formulaSource, schemaSource, valueSource } from '@former-ui/formula';

// plain values, e.g. `$taxRate` and `$price.total`, a getter is read on each evaluation (e.g. of a ref)
const settings = valueSource({
  id: 'settings',
  values: () => ({
    taxRate: 0.19,
    price: { total: total.value }
  })
});

// the data of another form, e.g. `$order.dimensions.width`
const order = schemaSource({
  id: 'order',
  namespace: 'order',
  schema: orderSchema,
  data: () => orderData.value,
  components
});

// named formulas, which other formulas use like variables, e.g. `$area`
const calculations = formulaSource({
  id: 'calculations',
  formulas: { area: '$dimensions.width * $dimensions.height' }
});
```

Sources are passed to the engine (`createFormulaEngine({ sources })`), to the composables (`sources`) or provided to the components below with `provideFormulaSources`. The variables are top-level unless a source has a `namespace`. Fields of the form can't be named like the top-level variables of sources (see `engine.reservedNames()`), the props form reports such names. While a source is `pending` (e.g. its data is loading), its values are missing.

## Formula props

`useFormulaProps(components, formulaProps)` lets each prop listed in `formulaProps` (e.g. `{ number: { max: 'number' } }`, [`@former-ui/preset-nuxt-ui`](../preset-nuxt-ui/README.md#formulas) declares its props) be either a fixed value or a formula. In the props form, an icon button in the label row of the field (`fx` and `123`) switches between the field of the prop and a formula editor, and clears the other one, so only one of them is set. The formula is stored as `<prop>Formula` (e.g. `maxFormula`), so the fixed values keep their type and a schema works without the formula package too. As long as the formula is set, the component and its validation get its value instead of the fixed one. A formula that can't be evaluated or uses a variable without value (except lists) leaves the prop unset, e.g. a maximum isn't applied until the fields it depends on are filled in, and a preset waits for them. Every component gets a `showIf` formula as well.

The switch is `FormulaSwitch` (marked with `data-formula-switch` and `data-formula-switch-toggle`), pass `switch: { component }` to use your own. The border of its button has the `primary` color of your Tailwind theme (`border-primary`), which [Nuxt UI](https://ui.nuxt.com) defines. As a layout component, it gets the props of the node as its model value and renders the field of the prop or of the formula with `<FormRenderer category="value" />` or `<FormRenderer category="formula" />`.

The formulas are checked in the props form for where the node is: unknown variables or functions, items of lists outside of the list, text compared with `==` and more.

## Texts

The package uses [vue-i18n](https://vue-i18n.intlify.dev) for its texts, the labels in the props form and the messages of the formulas. It ships english texts in `@former-ui/formula/en.json`. Add them to the messages of your i18n instance and overwrite or translate the keys you need:

```ts
import formulaEn from '@former-ui/formula/en.json';
import { createI18n } from 'vue-i18n';

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: formulaEn,
    de: { formula_prop: '{label} (Formel)', formula_unknown_variable: 'Unbekannte Variable {variable}', /* ... */ },
  },
});
```

`useFormulaProps` uses this i18n instance and updates the texts when the locale changes. As it uses `useI18n`, call it in the `setup` of a component. `withFormulaProps` takes a `translate` function instead, by default the texts are english.

The engine itself has no texts. Turn its diagnostics into messages with `diagnosticMessage(diagnostic, engine, translate)`, which is english without `translate`.

## In components

`useFormula` evaluates a formula in the data of the node the component is rendered for, e.g. its repeater item:

```ts
const props = defineProps<{ formula?: string }>();
const { value, pending } = useFormula(() => props.formula, { expect: 'number' });
```

## Editor

[`@former-ui/formula-editor`](../formula-editor/README.md) is an editor for the formulas with highlighting, completion and the documentation of functions. Other editors can use the language service of this package: `complete`, `hover`, `signatureHelp` and `engine.analyze` work on the text of a formula and a position in it, `formatFormula` formats a formula (only changing its whitespace, a formula it can't format fully comes back unchanged, see `canFormatFormula`), and `useFormulaEditorContext()` (of `@former-ui/formula/vue`) tells what an editor in the props form needs: the engine, the sources and the context of the formula (the variables of the form, the lists around the node and the expected type).

## Engine

```ts
const engine = createFormulaEngine({
  math: create(all)
});

engine.evaluate('$a * 2', {
  data: { a: 2 }
}); // 4
engine.evaluate('$a > 2', {
  data: { a: 2 },
  expect: 'boolean'
}); // false
engine.evaluateDetailed('$a +'); // { ok: false, error: FormulaError { code: 'syntax' } }
engine.analyze('$nope + 1', {
  variables: engine.schemaVariables(schema, components)
}).diagnostics;
```

Functions that would allow to break out of a formula (e.g. `import` or `evaluate`, see `UNSAFE_FUNCTIONS`) are not available. The mathjs instance isn't changed.
