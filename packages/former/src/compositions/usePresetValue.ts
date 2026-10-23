import { type MaybeRefOrGetter, onMounted, type Ref, toValue, watch } from 'vue';
import { inject } from './injectProvide';

/**
 * Applies a preset value to the model value of a form field, but only as long as the
 * field's key does not exist in the form data yet. Once the key exists (even with
 * `null` / `undefined`, e.g. because the user cleared the field on purpose) the preset
 * is not applied again.
 *
 * Outside of a form node the key can't be checked, so the preset is applied as long as
 * the model value is `undefined`.
 */
export function usePresetValue<T>(modelValue: Ref<T | undefined>, preset: MaybeRefOrGetter<T | undefined>) {
  const hasDataKey = inject('hasDataKey', false);

  function applyPreset() {
    const presetValue = toValue(preset);
    if (presetValue === undefined) {
      return;
    }
    const isSet = hasDataKey ? hasDataKey.value : modelValue.value !== undefined;
    if (!isSet) {
      modelValue.value = presetValue;
    }
  }

  onMounted(applyPreset);
  watch(() => toValue(preset), applyPreset);
}
