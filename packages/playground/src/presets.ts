import type { FormComponents } from '@former-ui/former';
import { formComponents as nuxtUiFormComponents } from '@former-ui/preset-nuxt-ui';
import { sampleFormComponents } from './sample';

export type PlaygroundPreset = {
  id: string;
  label: string;
  components: () => FormComponents;
};

// presets the user can choose from in the playground; add new presets here
export const presets: [PlaygroundPreset, ...PlaygroundPreset[]] = [
  { id: 'sample', label: 'Sample components', components: () => sampleFormComponents },
  { id: 'nuxt-ui', label: 'Nuxt UI preset', components: () => nuxtUiFormComponents() },
];
