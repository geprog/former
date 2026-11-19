# 👩🏾‍🌾 Former

Former is a headless library for building and handling forms for Vue using an UI. The available components must be configured externally so that it is highly customizable per use case.

It includes further headless features like:

- conditional showing elements
- validation
- formulas, e.g. to show elements conditionally or to calculate values (see [`@former-ui/formula`](./packages/formula/README.md))

## Playground

Create and test your own form at the [playground](https://geprog.github.io/former).

## Documentation

For detailed documentation including installation, usage, Tailwind CSS configuration, and API reference, please see the [package README](./packages/former/README.md).

## Packages

- [`@former-ui/former`](./packages/former/README.md): the headless form builder
- [`@former-ui/preset-nuxt-ui`](./packages/preset-nuxt-ui/README.md): ready-to-use form components built with [Nuxt UI](https://ui.nuxt.com)
- [`@former-ui/formula`](./packages/formula/README.md): formulas based on [mathjs](https://mathjs.org) for show if conditions, props calculated from the data (e.g. a maximum) and calculated fields
- [`@former-ui/formula-editor`](./packages/formula-editor/README.md): an editor for the formulas with highlighting, completion and documentation, based on [tiptap](https://tiptap.dev)
