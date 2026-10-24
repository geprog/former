import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { createFormComponents } from './formComponents';

/**
 * Returns the form components of the preset. The labels of the components and their settings in the
 * form builder are translated with the i18n instance of the app and follow its locale.
 * The english texts are in `en.json`. Must be called in the `setup` of a component.
 */
export function useFormComponents() {
  const { t } = useI18n();
  return computed(() => createFormComponents(key => t(key)));
}
