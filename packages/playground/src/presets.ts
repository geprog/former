import type { FormComponents } from '@former-ui/former';
import { formComponents as nuxtUiFormComponents } from '@former-ui/preset-nuxt-ui';
import { i18n } from './i18n';
import { sampleFormComponents, showIfProp } from './sample';

export type PlaygroundPreset = {
  id: string;
  label: string;
  components: () => FormComponents;
};

// adds the playground's show if setting to the components of a preset
function withShowIf(components: FormComponents): FormComponents {
  return Object.fromEntries(
    Object.entries(components).map(([type, component]) => [
      type,
      { ...component, propsSchema: [...(component.propsSchema ?? []), showIfProp] },
    ]),
  );
}

// presets the user can choose from in the playground; add new presets here
export const presets: [PlaygroundPreset, ...PlaygroundPreset[]] = [
  { id: 'sample', label: 'Sample components', components: () => sampleFormComponents },
  { id: 'nuxt-ui', label: 'Nuxt UI preset', components: () => withShowIf(nuxtUiFormComponents({ t: key => i18n.global.t(key) })) },
];
