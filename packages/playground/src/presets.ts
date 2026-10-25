import type { FieldData, FormComponents, FormData, SchemaNode } from '@former-ui/former';
import { hasValue } from '@former-ui/former';
import { useFormComponents as useNuxtUiFormComponents } from '@former-ui/preset-nuxt-ui';
import { computed, markRaw } from 'vue';
import { useI18n } from 'vue-i18n';
import { z } from 'zod';
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

// validates the `required` prop of the nodes of all components, including their props in build mode
// (the nuxt ui preset brings its own validation)
function withRequiredValidation(components: FormComponents, t: (key: string) => string): FormComponents {
  return Object.fromEntries(
    Object.entries(components).map(([type, component]) => [
      type,
      {
        ...component,
        validation: (props, context) => (props.required
          ? z.custom(value => hasValue(value as FieldData | FormData), t('value_is_required'))
          : component.validation?.(props, context)),
      },
    ]),
  );
}

// presets the user can choose from in the playground; add new presets here
export function usePresets() {
  const { t } = useI18n();
  const nuxtUiFormComponents = useNuxtUiFormComponents();

  return computed<[PlaygroundPreset, ...PlaygroundPreset[]]>(() => [
    { id: 'sample', label: 'Sample components', components: withRequiredValidation(withShowIf(sampleFormComponents), t) },
    { id: 'nuxt-ui', label: 'Nuxt UI preset', components: withShowIf(nuxtUiFormComponents.value) },
  ]);
}
