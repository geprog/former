import type { FieldData } from '@former-ui/former';
import type { PropType } from 'vue';
import { computed, defineComponent, h, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFormula } from './index';

// more updates than this in a row, without a pause, mean that calculations depend on each other in a loop
const MAX_UPDATES_IN_A_ROW = 20;

function display(value: unknown, locale: string): string {
  if (value === undefined || value === null || value === '') {
    return '–';
  }
  if (typeof value === 'number') {
    return value.toLocaleString(locale, { maximumFractionDigits: 6 });
  }
  return typeof value === 'object'
    ? JSON.stringify(value)
    : String(value);
}

/**
 * A field showing the result of a formula, which it stores as its data, so that other formulas can use it and it
 * is part of the form data. In read mode it shows the stored result.
 */
export const FormulaCalculation = defineComponent({
  name: 'FormulaCalculation',
  inheritAttrs: false,
  props: {
    modelValue: { type: null as unknown as PropType<FieldData>, default: undefined },
    formula: { type: String, default: undefined },
    label: { type: String, default: undefined },
    help: { type: String, default: undefined },
    mode: { type: String, default: undefined },
    id: { type: String, default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { t, locale } = useI18n();
    const { value } = useFormula(() => props.formula);
    const stored = computed(() => (typeof value.value === 'number' || typeof value.value === 'string' || typeof value.value === 'boolean'
      ? value.value
      : undefined));

    // calculations depending on each other in a loop would update each other forever
    const looping = ref(false);
    let updatesInARow = 0;
    let pause: ReturnType<typeof setTimeout> | undefined;
    watch([
      stored,
      () => props.mode,
    ], ([result, mode]) => {
      if (mode === 'read' || looping.value || result === props.modelValue || (result === undefined && props.modelValue == null)) {
        return;
      }
      updatesInARow++;
      clearTimeout(pause);
      pause = setTimeout(() => updatesInARow = 0);
      if (updatesInARow > MAX_UPDATES_IN_A_ROW) {
        looping.value = true;
        return;
      }
      emit('update:modelValue', result);
    }, { immediate: true });

    return () => h('div', { 'id': props.id, 'class': 'flex w-full flex-col gap-1', 'data-formula-calculation': '' }, [
      props.label
        ? h('span', { class: 'block text-sm font-medium' }, props.label)
        : null,
      props.help
        ? h('p', { class: 'text-sm text-zinc-500' }, props.help)
        : null,
      h('output', {
        class: 'block w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-800',
      }, display(props.mode === 'read'
        ? props.modelValue
        : stored.value, locale.value)),
      looping.value
        ? h('p', { class: 'text-sm text-red-600 dark:text-red-400', role: 'alert' }, t('formula_calculation_loop'))
        : null,
    ]);
  },
});
