import { type MaybeRefOrGetter, onMounted, type Ref, toValue, watch } from 'vue';
import { inject } from './injectProvide';

/**
 * Applies a preset value to the model value of a form field whenever the field's key
 * does not exist in the form data. Once the key exists (even with `null`, e.g. because
 * the user cleared the field on purpose) the preset is not applied again. Fields that are
 * newly added to a schema, that become visible again (their key gets removed when hidden)
 * or whose key is removed from the data otherwise do get their preset.
 *
 * In read mode presets are never applied, so no values are shown that nobody entered.
 * Hidden fields (they stay mounted in build mode) get their preset once they are shown again.
 *
 * Outside of a form node the key can't be checked, so the preset is applied as long as
 * the model value is `undefined`.
 */
export function usePresetValue<T>(modelValue: Ref<T | null | undefined>, preset: MaybeRefOrGetter<T | null | undefined>) {
  const hasDataKey = inject('hasDataKey', false);
  const mode = inject('mode', false);
  const isShown = inject('isShown', false);

  function applyPreset() {
    const presetValue = toValue(preset);
    if (presetValue === undefined || presetValue === null || mode?.value === 'read' || isShown?.value === false) {
      return;
    }
    const isSet = hasDataKey ? hasDataKey.value : modelValue.value !== undefined;
    if (!isSet) {
      modelValue.value = presetValue;
    }
  }

  onMounted(applyPreset);
  // fields can stay mounted while their key gets removed, e.g. when they are hidden in build
  // mode (the preset is applied once they are shown again) or when the data is replaced
  watch([() => toValue(preset), () => mode?.value, () => hasDataKey?.value, () => isShown?.value], applyPreset);
}
