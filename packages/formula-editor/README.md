# ✏️ Former Formula Editor

An editor for the formulas of [`@former-ui/formula`](../formula/README.md), based on [tiptap](https://tiptap.dev):

- highlighting of variables, functions, numbers, texts and comments
- errors and warnings underlined, with their message when hovering them
- completion of variables (after `$`), functions, constants and keywords, and of the options of a variable compared with `equalText`, opened while typing or with Ctrl+Space
- the syntax of the function the cursor is in, with the current argument highlighted
- the description of variables and the documentation of functions when hovering them
- formatting with Alt+Shift+F or the button in the input, as one change that can be undone at once
- Ctrl+click (Cmd+click on macOS) on a variable goes to its definition: in the builder it selects the field, the `href` of other variables (e.g. of sources) is opened in a new tab, `onOpenVariable` replaces both

The formula is stored as plain text, a line of the text per paragraph.

## Installation

```bash
pnpm add @former-ui/formula-editor
```

Its components are styled with [Tailwind CSS](https://tailwindcss.com), add the package as a source to your CSS file:

```css
@source '../node_modules/@former-ui/formula-editor/dist';
```

## Usage

`FormulaEditor` is a complete form field: the editor with a label, a help text and an error (e.g. of the validation in the form). Use it as the editor of the formulas in the props form:

```ts
import { FormulaEditor } from '@former-ui/formula-editor';

const components = useFormulaProps(presetComponents, formulaProps, {
  engine,
  editor: { component: FormulaEditor },
});
```

There it knows the fields of the form, the sources and where the edited node is, so it completes exactly what the formula can use there. It can be used anywhere else below `useFormulaProps` too:

```vue
<FormulaEditor v-model="formula" label="Price" help="Calculated from the form" expect="number" />
```

Its props are `label`, `help`, `required`, `error`, `placeholder`, `expect` (the type the formula has to evaluate to) and `mode` (`read` makes it read-only).

The texts of the messages are the ones of `@former-ui/formula/en.json` (see [Texts](../formula/README.md#texts)).
