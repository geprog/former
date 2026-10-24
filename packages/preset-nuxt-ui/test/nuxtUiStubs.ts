import { defineComponent, h } from 'vue';

// simple stand-ins for the Nuxt UI components, which are only available through the
// `@nuxt/ui/vite` plugin of the consuming app

const UFormField = defineComponent({
  name: 'UFormField',
  props: { label: { type: String, default: undefined }, error: { type: [String, Boolean], default: undefined } },
  setup: (props, { slots }) => () => h('div', { 'data-label': props.label }, slots.default?.()),
});

const UCard = defineComponent({
  name: 'UCard',
  setup: (_, { slots }) => () => h('div', [slots.header?.(), slots.default?.()]),
});

const UButton = defineComponent({
  name: 'UButton',
  props: { label: { type: String, default: undefined }, icon: { type: String, default: undefined } },
  emits: ['click'],
  setup: (props, { emit }) => () =>
    h('button', { 'data-label': props.label, 'data-icon': props.icon, 'onClick': (event: MouseEvent) => emit('click', event) }, props.label),
});

// declares no props, so everything passed to it is rendered as attribute and can be checked
function attributesStub(name: string) {
  return defineComponent({
    name,
    setup: (_, { slots }) => () => h('div', { 'data-stub': name }, slots.default?.()),
  });
}

export const nuxtUiStubs = {
  UFormField,
  UCard,
  UButton,
  ...Object.fromEntries(
    ['UInput', 'UInputNumber', 'USelect', 'UInputMenu', 'UTextarea', 'UCheckbox', 'USwitch', 'URadioGroup', 'UInputDate', 'UFileUpload', 'UModal']
      .map(name => [name, attributesStub(name)]),
  ),
};
