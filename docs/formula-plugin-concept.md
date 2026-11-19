# Concept: `@former-ui/formula` – mathjs formulas for Former

Status: draft · Source of truth for the behaviour: talomat (`~/talishaus/talomat`)

## 1. Goal

Allow schema authors to write mathjs formulas wherever a static value is too limited:

- **`showIf`**: `$hasBasement and $basement.height > 2`
- **Dynamic constraints**: `min`, `max`, `stepSize` and similar, e.g. `max = $roof.width * 0.8`
- **Presets**: `presetFormula = $rows_item.width * $rows_item.height`
- **Computed fields**: a read-only field that shows the result of a calculation
- **Named formulas**: reusable calculations that other formulas reference. Talomat calls these price parameters.

Authors should get IDE-like help per formula: completion, hover docs, signature help, diagnostics and formatting. That help depends on where the formula sits: the expected result type, the variables in scope and the surrounding repeater items.

## 2. What talomat does today (inventory)

| Concern                                                                                                              | talomat location                                         | Generalizable?                                                   |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| Evaluation (`evaluateFormula`, `calculatePriceParameter`)                                                            | `composables/usePriceCalculation.ts`                     | yes – core                                                       |
| Data → scope (`$` prefix on every key)                                                                               | `prepareData` / `getContext`                             | yes – core                                                       |
| Missing values → `""`, empty repeaters → `[]`                                                                        | `adjustFormula`, `withEmptyRepeaterLists`                | yes – core                                                       |
| Named formulas + dependency ordering                                                                                 | `preparePriceParameters`, `getOrderedRelevantParameters` | yes – core (reworked)                                            |
| Variables derived from the schema (`roof.width`, `rows_item.width`, options, types)                                  | `usePriceVariables().getSchemaElements`                  | yes – core, using Former's `nodeChildren` / `isList`             |
| `#` comments, NBSP, newlines                                                                                         | `utils/normalizeFormula.ts`                              | yes – core                                                       |
| Static validation (syntax, unknown vars/functions, block statements, `equalText` option checks, repeater-item scope) | `utils/ValidationUtils.ts › validateFormula`             | yes – core                                                       |
| Repeater-item scope at caret (lexical scan, `map(…)` frames)                                                         | `utils/repeaterItemScope.ts`                             | yes – core                                                       |
| Referenced-variables list                                                                                            | `listReferencedDollarVariables`                          | yes – core                                                       |
| Formatter (own tokenizer + parser)                                                                                   | `utils/formatFormula.ts`                                 | yes – core                                                       |
| `showIf` evaluation                                                                                                  | `components/former/ShowIfUtils.ts`                       | yes – core                                                       |
| min/max formulas in validation                                                                                       | `useValidator` (`minFormula`, `maxFormula`)              | yes – core                                                       |
| Formula input with tribute autocompletion and format button                                                          | `components/former/Formula.vue`                          | replaced by the tiptap editor                                    |
| Formulas inside `{{ }}` in the document editor (tiptap decorations)                                                  | `components/editor/FormulaValidationExtension.ts`        | the language service, yes; Handlebars itself stays in talomat    |
| Price parameters, house context, `distanceToTalis`, `formatMoney`, `definitionHref`s                                 | various                                                  | **stays in talomat**, plugged in as external variables/functions |

Talomat already has two copies of the "walk the tree and classify Symbol/Accessor nodes" logic (`parseDollarVariables` and `validateFormula`). It also has two scanners that work on half-typed input (`repeaterItemScope.scan`, `formatFormula.tokenize`). The package should have one analysis pass that every feature uses.

## 3. Package layout

```
packages/
  formula/          @former-ui/formula          (no UI, no tiptap; runs on the server too)
  formula-editor/   @former-ui/formula-editor   (Vue + tiptap editor component, depends on formula)
```

Why two packages:

- Evaluation must run without a DOM. Talomat evaluates on the server for PDFs and calculations, so tiptap must not be pulled in there.
- Some consumers only need `showIf` and calculations and bring their own input.
- `mathjs` is a **peer dependency** of `formula`. The app passes in its own `math` instance. **Decided:** the default and documented setup is the full bundle (`create(all)`). A curated subset can come later without API changes, because the instance is injected.

`@former-ui/formula` has two entry points (**decided**):

- `@former-ui/formula`: engine, sources, analysis, language service. No Vue, so it can be imported from Nitro or Node.
- `@former-ui/formula/vue`: `useFormula`, `provideFormulaSources`, `withFormulaProps`, `showIf` integration. Vue and `@former-ui/former` are peer dependencies of this entry only.

`@former-ui/former` gets a few small core changes (§7), but no dependency on mathjs.

## 4. Core: `@former-ui/formula`

### 4.1 Engine

```ts
import { createFormulaEngine } from '@former-ui/formula';
import { all, create } from 'mathjs';

const engine = createFormulaEngine({
  math: create(all),
  prefix: '$', // mandatory for every variable (decided); only the character is configurable. Keeps variables apart from mathjs symbols (`e`, `i`, `pi`, units like `t`)
  itemSuffix: '_item', // `$rows_item` = current item of repeater `rows`
  missingValue: '', // what an unset variable evaluates to (talomat: "" so equalText/compare don't throw)
  functions: { formatMoney }, // extra functions, documented for intellisense (§5.3)
  disabledFunctions: 'unsafe', // default: import, createUnit, evaluate, parse, compile, simplify, derivative, resolve, …
});
```

Responsibilities:

- `engine.compile(text)`: normalize the text (comments, NBSP, newlines), then `math.compile`, with an **LRU cache keyed by text**. Talomat re-parses on every evaluation. With dozens of reactive `showIf`s per form, caching the compiled formula pays off.
- `engine.evaluate(text, scope, { expect?: 'number' | 'boolean' | 'string' })`: returns `undefined` on error, on a `ResultSet` (more than one statement) or when the type doesn't match. A mathjs `Unit` or matrix counts as a mismatch unless `expect: 'any'`. These are the same rules as `calculatePriceParameter` today.
- **Scope as a `Map`-like object instead of string rewriting.** mathjs accepts any object with `get/set/has/keys`. The scope resolves lazily:
  - `$a.b` resolves to the value at that path in the form data, or `missingValue`.
  - A repeater whose data is not an array resolves to `[]`. This replaces `withEmptyRepeaterLists`.
  - Variables of external sources (§4.6) are resolved through their source.
  - A variable backed by a formula (a formula source, §4.6) is evaluated on first access and memoized for the rest of the evaluation. Recursion is tracked with an "in progress" set, so a **cycle becomes a clear error** instead of a stack overflow.

  This removes the need for `adjustFormula`'s regex replacement and for `getOrderedRelevantParameters`' topological concatenation. Mutations by assignments stay in a child scope, so the `cloneDeep(data)` per evaluation is no longer needed.

### 4.2 Variables

A generalized `PriceVariable`:

```ts
type FormulaVariable = {
  name: string; // without prefix: 'roof.width', 'rows_item.width', 'total'
  label?: string; // shown in completion / chips
  description?: string; // hover
  type?: 'number' | 'string' | 'boolean' | 'date' | 'list' | 'object' | 'unknown';
  options?: { value: string; label?: string }[]; // select/radio → completion inside equalText(…, '|')
  itemOf?: string; // 'rows' for rows_item.* (scope check, §4.4)
  source?: { kind: 'field'; nodeId?: string; path: DataPath } | { kind: 'formula'; name: string } | { kind: 'external'; href?: string };
  group?: string; // completion grouping ("Fields", "Calculations", "Context")
};
```

Variable providers are composed:

- `schemaVariables(schema, components, options)`: generic port of `getSchemaElements`. It uses Former's `nodeChildren` and `isNodeLayoutComponent`. For lists (`components[type].isList`) it emits `rows` (type `list`) and `rows_item.*`. The value type per component type and where to read the options from are configurable:
  ```ts
  schemaVariables(schema, components, {
    valueTypes: {
      number: 'number',
      checkbox: 'boolean',
      select: 'string',
      date: 'date'
    },
    options: node => node.props?.options,
  });
  ```
- Each external source (§4.6) describes its own variables.

### 4.3 Analysis (single pass)

`engine.analyze(text, context)` parses once and caches by `text` plus the identity of `context`. It returns:

```ts
type Analysis = {
  ast?: MathNode; // undefined on syntax error
  tokens: Token[]; // own lexer (from formatFormula.tokenize), works on half-typed input → highlighting
  references: Reference[]; // { token: '$roof.width', from, to, variable?: FormulaVariable }
  diagnostics: Diagnostic[]; // { from, to, severity, code, message params }
  inferredType?: VariableType; // light inference: comparisons/and/or/not/equalText → boolean, arithmetic → number
};
```

Diagnostics are a superset of talomat's `FormulaValidationError` kinds and now carry **source ranges** (`from`/`to`), so the editor can underline them:
`syntax`, `block`, `unknown-variable`, `unknown-function`, `out-of-scope` (repeater item), `not-text-comparable`, `unknown-option`, plus new ones: `type-mismatch` (e.g. a `showIf` that is not boolean), `self-reference` (a field's `max` that references the field itself), `cycle` (named formulas).

mathjs nodes don't carry source positions. Ranges come from matching the AST references to the lexer tokens in order, which the lexer can do because it already knows every `$…` token's offset.

Messages are **codes + params**, not strings. The app translates them, the same way the presets translate validation messages via `t`.

### 4.4 Formula context

The context is the input that makes help specific to each formula:

```ts
type FormulaContext = {
  variables: FormulaVariable[];
  expect?: 'boolean' | 'number' | 'string' | 'any'; // showIf → boolean, min/max → number
  loopScopes?: string[]; // repeaters whose item exists around the formula without `map`
  self?: string; // variable name of the node the formula belongs to (self-reference check)
  allowStatements?: boolean;
};
```

`loopScopes` can be **derived from Former's `DataScope[]`**: every scope whose `node` is a list contributes its name. Talomat currently needs a `LOOP_REPEATERS_KEY` provide for this.

### 4.5 Former integration helpers

```ts
// <Former :show-if="showIf">
const showIf: ShowIfPredicate = createShowIf(engine);

// Adds `<prop>Formula` props to a components map (props form, validation, rendering), see §4.7
withFormulaProps(components, formulaProps);

// For components: evaluate a formula reactively in the node's data scope and the provided sources (§4.6)
useFormula(() => props.presetFormula, { expect: 'number' }); // → { value: ComputedRef, isPending: ComputedRef }
// combines with Former's existing usePresetValue:
usePresetValue(modelValue, useFormula(() => props.presetFormula));

// Standard Schema validating a formula *as a prop*, so invalid formulas mark the node invalid in build mode
// (plugs straight into Former's isNodeValid / propsValidity)
formulaPropValidation(engine, context);
```

### 4.6 External data (sources)

Formulas often need data that is not in the form. In talomat that is:

- the house context: address fields, `date`, `today`, `talismann`, `assemblyModel`;
- computed results: `price.total`, `price.services`, …;
- data of _other_ forms: the house modules, the assembly and service modules, each under its module name;
- configuration values: `vat`, `distanceToTalis`;
- price parameters, which are formulas themselves (see "formula sources" below);
- extra functions: `formatMoney`.

All of these are the same thing for the formula package: **something that provides variables (for intellisense and validation) and values (for evaluation)**. The package models this as a **source**:

```ts
type FormulaSource = {
  id: string;
  // optional path prefix: namespace 'house' → `$house.today`. Without a namespace the variables are top-level (`$vat`)
  namespace?: string;
  // descriptors for completion, hover and the unknown-variable check
  variables: MaybeRefOrGetter<FormulaVariable[]>;
  // values for evaluation: a (reactive) object read by path, or a resolver for values that are expensive to compute
  values: MaybeRefOrGetter<Record<string, unknown>> | ((path: string) => unknown);
  // extra functions with docs, e.g. formatMoney
  functions?: Record<string, FormulaFunction>;
  // while true, values are treated as missing and evaluation results are marked as pending
  pending?: MaybeRefOrGetter<boolean>;
};
```

The core ships helpers for the common kinds:

| Helper                                                      | For                                                                         | Variables come from                                | Values come from                                                                         |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `valueSource({ id, namespace, values, describe })`          | plain data, e.g. `vat`, `today`, `price.*`                                  | explicit descriptors                               | the object                                                                               |
| `schemaSource({ id, namespace, schema, data, components })` | the data of another Former form, e.g. the house modules or the address form | `schemaVariables(schema)`                          | the form data                                                                            |
| `formulaSource({ id, formulas })`                           | named formulas, e.g. price parameters                                       | the formula names (type inferred from the formula) | each formula is evaluated lazily in the same scope, with memoization and cycle detection |

The form being edited or filled is **the implicit `form` source**. It is always present, has no namespace, and its values are read relative to the node's `DataScope`s (repeater items included).

**Named formulas** is the general name for what talomat calls price parameters: a formula stored under a name, for example `wallArea = $roof.width * $roof.height`, which other formulas then use as `$wallArea`. They are not form fields and have no input; they are only calculated. In the package they are just one kind of source (`formulaSource`). Talomat loads them from its database and passes them in. Former itself does not need to know anything about them.

**Providing sources:**

- Engine-wide: `createFormulaEngine({ sources: [...] })`, for data that is the same everywhere.
- Per component subtree (`@former-ui/formula/vue`): `provideFormulaSources(() => [houseContext, priceParameters])` above a `<Former>`. The editor and `useFormula` below it see the provided sources. This covers talomat's case where the assembly module builder sees other variables than the house configuration.
- On the server: `engine.evaluate(text, { sources: [...] })` with plain objects.

**Reactivity.** The lazy scope only reads the variables a formula actually references. When the values are reactive (refs, `reactive`, Former's data), Vue tracks exactly those reads, so `useFormula` and `showIf` re-evaluate only when a referenced value changes. This happens without a manual dependency list.

**Asynchronous data.** mathjs evaluates synchronously, so a source never returns promises. The app loads the data (e.g. `useLazyFetch`) and passes a ref. While the source is `pending`, its values are missing (`missingValue`). `useFormula` exposes `isPending`, so a `showIf` can, for example, keep a field hidden while the data is loading.

**Name collisions.** A field named `vat` would shadow the external `$vat`. Namespacing is optional (**decided**) and is not a way to avoid collisions: it only moves them to the namespace, because a field could just as well be named `house`. Collisions are handled by checking the first path segment of every variable instead:

- `engine.reservedNames(context)` lists the first segments taken by the external sources. That is the namespace for a namespaced source and every top-level name for the others. The `$name` prop of the components is validated against it, so a colliding field can't be created in the builder. This replaces talomat's hard-coded `isReservedWord`.
- Two external sources that claim the same first segment are a configuration error. `provideFormulaSources` and `createFormulaEngine` report it in development.
- A collision can still exist in stored data, e.g. a schema that was built before a source was added. `analyze` then reports an `ambiguous-variable` diagnostic on every reference. Evaluation stays deterministic, in this order: the repeater item, then the form, then the external sources in the order they were provided.

**In the editor**, sources are completion groups ("Fields", "House", "Price parameters"). A variable's `source` makes the hover show where it comes from, and its `href` becomes the link in the referenced-variables panel (talomat's `definitionHref`).

### 4.7 Formula props and the presets (decided: separate props)

Formula props are stored under their own key next to the static prop: `min` and `minFormula`. Rules:

- If a formula prop is set, it **wins** over the static prop.
- If the formula evaluates to `undefined` (syntax error, missing data, wrong type), the constraint is **not applied**. It does not fall back to the static value, because that would mix two different meanings without showing it.
- `analyze` warns in build mode when both are set (`shadowed-static-prop`).

The presets must not depend on mathjs. So the combination works in three layers:

1. **The preset only declares which props may be formulas.** `@former-ui/preset-nuxt-ui` exports plain metadata, without any dependency on the formula package:

   ```ts
   export const formulaProps = {
     number: {
       min: 'number',
       max: 'number',
       stepSize: 'number',
       preset: 'number'
     },
     slider: { min: 'number', max: 'number', stepSize: 'number' },
     date: { min: 'date', max: 'date', preset: 'date' },
     date_range: { min: 'date', max: 'date' },
     time: { min: 'string', max: 'string' },
     repeater: { minItems: 'number', maxItems: 'number' },
     text: { preset: 'string' },
     // … plus `showIf: 'boolean'` for every component
   } satisfies FormulaPropsMap;
   ```

   The preset already knows its props best, and the list stays next to the code that uses them. The type `FormulaPropsMap` is a plain type that can be declared in `@former-ui/former`, so the preset doesn't need the formula package even for types.

2. **The formula package applies the metadata to any components map:**

   ```ts
   import { withFormulaProps } from '@former-ui/formula/vue';
   import { formulaProps, useFormComponents } from '@former-ui/preset-nuxt-ui';

   const components = computed(() => withFormulaProps(useFormComponents().value, formulaProps, {
     editor: 'formula', // component type used for formula props in the props form
     label: (prop, t) => t('formula_for', { prop }),
   }));
   ```

   For each component and each listed prop, `withFormulaProps`:
   - **adds a `<prop>Formula` field to `propsSchema`**, directly after the static prop, rendered with the formula editor and configured with `expect: <type>`;
   - **wraps `validation`**: it evaluates the formula props in the node's scope, puts the results in place of the static props, and calls the original validation. The preset's `numberValidation` stays unchanged;
   - **wraps `component`** in a small wrapper component that evaluates the formula props with `useFormula` and passes the results as the static props. `Number.vue` then gets a computed `max` for its `UInputNumber` without knowing about formulas. Because of this, Former does not need a `resolveProps` hook;
   - adds a `showIf` formula prop to every component, because the preset has none today.
   - `preset` formulas are passed to the existing `usePresetValue`, so they are applied once, like static presets.

3. **The app adds the editor component** to the components map, e.g. `formula: { component: FormulaEditor, internal: true, … }`. `internal: true` keeps it out of the "add field" list, because it is only meant for the props form. For now the app registers the **unstyled editor** itself (**decided**). Whether `@former-ui/preset-nuxt-ui` should ship a styled variant is decided after using it.

Apps that don't use the preset write their own `FormulaPropsMap`, or only use `showIf` and `useFormula`.

## 5. Editor: `@former-ui/formula-editor`

### 5.1 Language service (editor-agnostic, lives in `formula`)

```ts
interface FormulaLanguageService {
  analyze: (text, ctx) => Analysis;
  complete: (text, offset, ctx) => { from: number; to: number; items: CompletionItem[] };
  hover: (text, offset, ctx) => HoverInfo | undefined; // variable label/type/options/source, function docs
  signatureHelp: (text, offset, ctx) => SignatureInfo | undefined;
  format: (text) => string | undefined; // undefined = refused (talomat's canFormatFormula)
}
```

It lives in the core package and has no editor dependency, for three reasons:

- Talomat's document editor (Handlebars `{{ … }}` in tiptap) uses the same service for embedded formulas.
- It can be unit-tested without a DOM.
- Switching the editor (§5.4) does not touch it.

Context-dependent completion is computed from the caret using the lexical scanner, so it works on half-typed text:

| Caret situation                                                                                                            | Offered                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| after `$` / inside `$roof.`                                                                                                | variables in scope (filtered by `loopScopes` + enclosing `map` frames), path-segment completion |
| identifier without `$`                                                                                                     | functions (mathjs + custom), constants, keywords `and or not`                                   |
| inside a string literal that is an argument of `equalText`/`compareText` whose other argument is a variable with `options` | that variable's option values                                                                   |
| `map($rows, f(`                                                                                                            | suggests `$rows_item` as the parameter                                                          |
| ranking                                                                                                                    | `expect: 'boolean'` ranks comparison functions and boolean variables higher                     |

Function docs come from **mathjs' embedded docs** (`math.expression.embeddedDocs`: syntax, description, examples, seealso). The descriptions are English only. Custom functions provide the same shape. This also replaces talomat's separately maintained `MathjsDocumentation.vue` list.

### 5.2 tiptap editor

`<FormulaEditor v-model="text" :context :service />` is a component that can be used as a Former component (`type: 'formula'`) inside a `propsSchema`.

tiptap setup, deliberately minimal:

- **Schema**: `doc > paragraph+ > (text | variable)*`. No marks, paste as plain text, Enter inserts a new paragraph (= newline). Serialization: paragraphs joined with `\n`, and a `variable` node becomes `$name`. Parsing a string back into the doc is the inverse, so the **stored value stays a plain string**.
- **`FormulaHighlight`**: decorations from `analysis.tokens` (variables, functions, numbers, strings, comments, operators).
- **`FormulaDiagnostics`**: wavy-underline decorations from `analysis.diagnostics`, with a tooltip on hover. This is a port of `FormulaValidationExtension` without the Handlebars parts.
- **`FormulaCompletion`**: built on `@tiptap/suggestion`. Its `findSuggestionMatch` is replaced by `service.complete(...)`, so one popup serves every trigger (`$`, identifier characters, inside string literals), not only `$`.
- **`FormulaHover`** and **signature help** tooltips (floating-ui, as tiptap's BubbleMenu uses).
- **Variable chips (optional)**: an inline atom node that renders the label, e.g. "Roof › Width", instead of `$roof.width`, while the stored text keeps the technical name. Toggle with a prop, because some authors prefer seeing the raw text.
- **Format** command (`Alt+Shift+F`) as a single undoable transaction. talomat's caret-preserving logic carries over.
- **Referenced variables** panel (talomat's `<details>` list with `definitionHref` links), fed by `analysis.references`.
- Headless styling: data attributes and classes, plus a slot for the completion item, so `preset-nuxt-ui` can style it.

### 5.3 Per-formula configuration in the props schema

```ts
const propsSchema: SchemaNode[] = [
  {
    type: 'formula',
    name: 'showIf',
    props: { label: 'Show if', expect: 'boolean' }
  },
  {
    type: 'formula',
    name: 'maxFormula',
    props: { label: 'Maximum', expect: 'number' }
  },
];
```

The editor builds its `FormulaContext` from:

- the **edited schema**, through `schemaVariables`;
- the **selected node and its path**. Former already provides `selectedNode` and `selectedNodePath` since #113. The path yields `loopScopes` (the repeaters above the node) and `self`;
- the `expect` prop;
- the external sources provided by the app (`provideFormulaSources`, §4.6).

### 5.4 Why tiptap, and the alternative

tiptap fits the requirements here: inline variable chips as real nodes, the same stack as talomat's document editor (shared extensions for `{{ }}` formulas), and it is already a talomat dependency.

**CodeMirror 6** is the code-editor-native alternative. It has autocomplete, lint, hover tooltips, bracket matching and a Lezer grammar built in, and needs less custom code. Chips are possible as replace-widgets but are less natural. Because the language service is editor-agnostic, a CodeMirror adapter could be added later without touching the core. **Recommendation: tiptap first**, for the chips and the shared document-editor integration.

## 6. Mapping talomat → package

| talomat                                                                    | package                                                                                                                 |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `evaluateFormula`, `calculatePriceParameter`                               | `engine.evaluate` + a `formulaSource` for the price parameters                                                          |
| `getContext` / `prepareData` (`$` keys)                                    | the lazy scope reads raw form data; no key rewriting                                                                    |
| `getHouseContext`, `mergeContext`, `useHouse().showIfWithHouseDataContext` | `schemaSource` per house module + `valueSource` for date/today/price.*/vat/distanceToTalis, via `provideFormulaSources` |
| `buildAvailableVariables`, `useAvailableVariables`                         | the `variables` of those sources; no separate list to keep in sync                                                      |
| `isReservedWord`                                                           | `engine.reservedNames()`                                                                                                |
| `DOCUMENT_FUNCTION_NAMES` (`formatMoney`)                                  | `functions` of a source that is only provided in the document editor                                                    |
| `usePriceVariables().getSchemaElements`                                    | `schemaVariables`                                                                                                       |
| `PriceVariable`                                                            | `FormulaVariable` (`definitionHref` → `source.href`)                                                                    |
| `validateFormula`, `useFormulaValidation`                                  | `engine.analyze().diagnostics`, `formulaPropValidation`                                                                 |
| `describeFormulaValidationErrors` / i18n keys                              | app-side translation of diagnostic codes                                                                                |
| `repeaterItemScope.*`, `LOOP_REPEATERS_KEY`                                | lexical scanner in core; `loopScopes` from `DataScope[]`                                                                |
| `formatFormula`, `canFormatFormula`                                        | `service.format`                                                                                                        |
| `normalizeFormula`                                                         | internal to `engine.compile`                                                                                            |
| `ShowIfUtils.showIf`                                                       | `createShowIf(engine)`                                                                                                  |
| `useValidator` min/max part                                                | `withFormulaProps`                                                                                                      |
| `Formula.vue` (tribute)                                                    | `<FormulaEditor>`                                                                                                       |
| `FormulaValidationExtension` (document editor)                             | stays in talomat but uses `service.analyze` per `{{ }}` match                                                           |
| `[äöüÄÖÜß\w]` regexes                                                      | Unicode `\p{L}\p{N}_` everywhere (talomat already uses this in newer code)                                              |

## 7. Changes needed in `@former-ui/former`

1. **`ShowIfPredicate` needs the node's data scopes.** Today it is `(node, data, schema)`, so a field inside a repeater item cannot evaluate `$rows_item.x`. Proposal (non-breaking, appended argument):
   ```ts
   type ShowIfPredicate = (node, data, schema, context: { path: DataPath; scopes: DataScope[] }) => boolean;
   ```
   `useNode` already has `dataScopes` where it calls `showIf`. The internal predicate becomes `(node, scopes)`. The same applies to `useHasContent`.
2. **Validation already receives `ValidationContext.scopes`.** The root scope holds the full form data, so formula props can reference any field. No change needed, but add a test that validation re-runs when a referenced field elsewhere changes. `useMaybeAsync` tracks reactive reads, which should cover this.
3. **Export a composable for the node's data scopes.** `useFormula` and the component wrapper of `withFormulaProps` (§4.7) need the `dataScopes` of the node they render in. Today that is only available through Former's internal `inject('dataScopes')`. Proposal: export `useDataScopes()` (or a `useFormNode()` returning node, path and scopes).
4. **Expose the edited schema to nested props forms.** The playground currently works around this with `playgroundSchemaKey`. A `provide('schema')`, or including it in the slot, would let the formula editor in `FormNodeProps` see the whole form.
5. **Export the `FormulaPropsMap` type** (§4.7), so presets can declare their formula props without depending on the formula package.

A `resolveProps` hook on `<Former>` is **not** needed, because `withFormulaProps` wraps the components instead (§4.7).

## 8. Phases

1. **Core**: engine (lazy scope, compile cache, safe defaults, full mathjs bundle), sources (`valueSource`, `schemaSource`, `formulaSource`, implicit `form` source), `schemaVariables`, `analyze` with ranges, `showIf`, `useFormula`, `withFormulaProps`, the `formulaProps` metadata in preset-nuxt-ui, and the Former changes 7.1, 7.3, 7.4 and 7.5. Add a playground demo with a `showIf` formula, a `max` formula and an external source. Talomat then switches `evaluateFormula`, `validateFormula`, `ShowIfUtils` and the house context to the package, and keeps its tests as a regression suite. Talomat's formatter fuzz and property tests should move along with the formatter.
2. **Editor**: language service (completion, hover, signature help, format) and the tiptap `FormulaEditor`. In talomat, `Formula.vue` (tribute) is replaced.
3. **Extended**: talomat's document editor uses the language service for `{{ }}`, which removes tribute entirely. Then type inference and diagnostics such as `type-mismatch`.

## 9. Decisions

Decided:

- **Formula props** are stored as separate props (`minFormula`). The preset declares them as metadata, and `withFormulaProps` applies them (§4.7).
- **The `$` prefix is mandatory** for every variable. Only the character is configurable.
- **Named formulas** (talomat's price parameters) are a kind of external source (`formulaSource`, §4.6), not a separate feature.
- **mathjs**: the full bundle (`create(all)`), injected by the app.
- **Entry points**: `@former-ui/formula` without Vue, `@former-ui/formula/vue` for the Vue and Former integration.
- **Namespacing** of external sources is optional. Collisions are prevented by `reservedNames` and the `ambiguous-variable` diagnostic, not by namespaces (§4.6).
- **Editor styling**: the unstyled editor is registered by the app. A styled variant in `@former-ui/preset-nuxt-ui` is reconsidered once the unstyled one has been used.
