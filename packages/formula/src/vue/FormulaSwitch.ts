import type { FormData } from '@former-ui/former';
import type { PropType } from 'vue';
import { FormRenderer } from '@former-ui/former';
import { defineComponent, h, ref, watch } from 'vue';

function isSet(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

/**
 * Shows either the field of a prop (its child in the category `value`) or the field of its formula (in `formula`),
 * with a button to switch between them, which clears the other one, so that only one of them is set.
 * It is a layout component, so its model value is the props of the node.
 */
export const FormulaSwitch = defineComponent({
  name: 'FormulaSwitch',
  inheritAttrs: false,
  props: {
    modelValue: { type: Object as PropType<FormData | null>, default: undefined },
    // the names of the prop and of its formula, e.g. `max` and `maxFormula`
    prop: { type: String, required: true },
    formulaProp: { type: String, required: true },
    // the texts of the button
    useFormula: { type: String, default: 'Use formula' },
    useValue: { type: String, default: 'Use fixed value' },
    mode: { type: String, default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const data = () => (props.modelValue ?? {}) as Record<string, unknown>;
    const isFormula = ref(isSet(data()[props.formulaProp]));

    // follows the data, e.g. when another node is selected, while a cleared field keeps its mode
    watch(() => [data()[props.formulaProp], data()[props.prop]], ([formula, value]) => {
      if (isSet(formula)) {
        isFormula.value = true;
      }
      else if (isSet(value)) {
        isFormula.value = false;
      }
    });

    function toggle() {
      const next = {
        ...data(),
      };
      delete next[isFormula.value
        ? props.formulaProp
        : props.prop];
      isFormula.value = !isFormula.value;
      emit('update:modelValue', next);
    }

    // a glyph as icon, so that no icon library is needed: `fx` to switch to the formula, `123` back to the fixed value
    const icon = (text: string) => h('svg', {
      'viewBox': '0 0 24 24',
      'aria-hidden': 'true',
      'class': 'size-[18px]',
    }, [
      h('text', {
        'x': 12,
        'y': text.length > 2
          ? 16
          : 17.5,
        'text-anchor': 'middle',
        'font-size': text.length > 2
          ? 11
          : 17,
        'font-family': 'ui-serif, Georgia, serif',
        'font-style': text === 'fx'
          ? 'italic'
          : 'normal',
        'fill': 'currentColor',
      }, text),
    ]);

    const toggleButton = () => {
      const label = isFormula.value
        ? props.useValue
        : props.useFormula;
      return h('button', {
        'type': 'button',
        'title': label,
        'aria-label': label,
        'aria-pressed': isFormula.value,
        'data-formula-switch-toggle': '',
        'onClick': toggle,
        // in the label row of the field, at its right end, so that the label and the input stay aligned with other fields,
        // bordered with the `primary` color of the Tailwind theme of the app (e.g. the one of nuxt ui)
        'class': 'absolute top-0 right-0 flex h-5 w-7 cursor-pointer items-center justify-center rounded border border-primary bg-transparent p-0 text-inherit',
      }, [
        icon(isFormula.value
          ? '123'
          : 'fx'),
      ]);
    };

    return () => h('div', {
      'class': 'relative w-full',
      'data-formula-switch': isFormula.value
        ? 'formula'
        : 'value',
    }, [
      h(FormRenderer, {
        category: isFormula.value
          ? 'formula'
          : 'value',
      }),
      props.mode === 'read'
        ? null
        : toggleButton(),
    ]);
  },
});
