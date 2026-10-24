import type { FormComponents, SchemaNode } from '@former-ui/former';
import { useFormComponents as useNuxtUiFormComponents } from '@former-ui/preset-nuxt-ui';
import { computed, markRaw } from 'vue';
import { sampleFormComponents } from './sample';
import ShowIfSelect from './ShowIfSelect.vue';

export type PlaygroundPreset = {
  id: string;
  label: string;
  components: FormComponents;
};

const showIfProp: SchemaNode = { type: 'showIf', name: 'showIf', props: { label: 'Show if the field has a value' } };

// selects the field the visibility of an element depends on, only used in the props form
const showIfComponent: FormComponents[string] = {
  label: 'Show if',
  component: markRaw(ShowIfSelect),
  propsSchema: [{ type: 'text', name: '$name' }],
  internal: true,
};

// adds the playground's show if setting to the components of a preset
function withShowIf(components: FormComponents): FormComponents {
  return {
    ...Object.fromEntries(
      Object.entries(components).map(([type, component]) => [
        type,
        { ...component, propsSchema: [...(component.propsSchema ?? []), showIfProp] },
      ]),
    ),
    showIf: showIfComponent,
  };
}

// presets the user can choose from in the playground; add new presets here
export function usePresets() {
  const nuxtUiFormComponents = useNuxtUiFormComponents();

  return computed<[PlaygroundPreset, ...PlaygroundPreset[]]>(() => [
    { id: 'sample', label: 'Sample components', components: withShowIf(sampleFormComponents) },
    { id: 'nuxt-ui', label: 'Nuxt UI preset', components: withShowIf(nuxtUiFormComponents.value) },
  ]);
}
