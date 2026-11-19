import type { FormComponents } from '@former-ui/former';
import { FormulaEditor } from '@former-ui/formula-editor';
import { useFormulaProps } from '@former-ui/formula/vue';
import { formulaProps, useFormComponents as useNuxtUiFormComponents } from '@former-ui/preset-nuxt-ui';
import { computed } from 'vue';
import { engine, playgroundSource } from './formula';
import { sampleFormComponents } from './sample';

export type PlaygroundPreset = {
  id: string;
  label: string;
  components: FormComponents;
};

// presets the user can choose from in the playground; add new presets here.
// Their components get a show if formula, and the props listed by the preset (e.g. `max`) a formula of their own
export function usePresets() {
  const nuxtUiFormComponents = useNuxtUiFormComponents();
  const formulaOptions = {
    engine,
    sources: [playgroundSource],
  };

  const sampleComponents = useFormulaProps(sampleFormComponents, {}, {
    ...formulaOptions,
    editor: { component: FormulaEditor },
  });
  const nuxtUiComponents = useFormulaProps(nuxtUiFormComponents, formulaProps, {
    ...formulaOptions,
    editor: { component: FormulaEditor },
  });

  return computed<[PlaygroundPreset, ...PlaygroundPreset[]]>(() => [
    {
      id: 'sample',
      label: 'Sample components',
      components: sampleComponents.value,
    },
    {
      id: 'nuxt-ui',
      label: 'Nuxt UI preset',
      components: nuxtUiComponents.value,
    },
  ]);
}
