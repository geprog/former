import type { FormComponents, FormData, Mode, SchemaNode } from '~/types';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { computed, defineComponent, h, markRaw, nextTick, provide, ref, type Ref } from 'vue';
import Former from '~/components/Former.vue';
import FormRenderer from '~/components/FormRenderer.vue';
import { usePresetValue } from './usePresetValue';

function mountUsePresetValue(options: {
  modelValue: Ref<string | null | undefined>;
  preset: Ref<string | null | undefined>;
  hasDataKey?: Ref<boolean>;
  mode?: Ref<Mode>;
}) {
  const Field = defineComponent({
    setup() {
      usePresetValue(options.modelValue, options.preset);
      return () => null;
    },
  });

  const Harness = defineComponent({
    setup() {
      if (options.hasDataKey) {
        provide('hasDataKey', options.hasDataKey);
      }
      if (options.mode) {
        provide('mode', options.mode);
      }
      return () => h(Field);
    },
  });

  return mount(Harness);
}

describe('usePresetValue', () => {
  it('applies the preset on mount if the key does not exist in the data', () => {
    const modelValue = ref<string | null | undefined>(undefined);
    mountUsePresetValue({ modelValue, preset: ref('preset'), hasDataKey: ref(false) });

    expect(modelValue.value).toBe('preset');
  });

  it.each([undefined, null, ''])('does not apply the preset if the key exists with value %j', (value) => {
    const modelValue = ref<string | null | undefined>(value);
    mountUsePresetValue({ modelValue, preset: ref('preset'), hasDataKey: ref(true) });

    expect(modelValue.value).toBe(value);
  });

  it('applies a changed preset only while the key does not exist', async () => {
    const modelValue = ref<string | null | undefined>(undefined);
    const preset = ref<string | undefined>(undefined);
    const hasDataKey = ref(false);
    mountUsePresetValue({ modelValue, preset, hasDataKey });

    preset.value = 'first';
    await nextTick();
    expect(modelValue.value).toBe('first');

    hasDataKey.value = true;
    modelValue.value = undefined;
    preset.value = 'second';
    await nextTick();
    expect(modelValue.value).toBeUndefined();
  });

  it('applies the preset again when the key gets removed while the field stays mounted', async () => {
    const modelValue = ref<string | null | undefined>(null);
    const hasDataKey = ref(true);
    mountUsePresetValue({ modelValue, preset: ref('preset'), hasDataKey });
    expect(modelValue.value).toBeNull();

    hasDataKey.value = false;
    modelValue.value = undefined;
    await nextTick();
    expect(modelValue.value).toBe('preset');
  });

  describe('in build mode, where hidden fields stay mounted', () => {
    const PresetField = defineComponent({
      props: { modelValue: { type: String, default: undefined } },
      emits: ['update:modelValue'],
      setup(props, { emit }) {
        const modelValue = computed({
          get: () => props.modelValue,
          set: value => emit('update:modelValue', value),
        });
        usePresetValue(modelValue, 'preset');
        return () => null;
      },
    });
    const Group = defineComponent({
      setup: () => () => h(FormRenderer),
    });
    const components: FormComponents = {
      field: { label: 'Field', propsSchema: [{ type: 'text', name: '$name' }], component: markRaw(PresetField) },
      layout: { label: 'Layout', propsSchema: [], component: markRaw(Group) },
      group: { label: 'Group', propsSchema: [{ type: 'text', name: '$name' }], component: markRaw(Group) },
    };

    // hides all nodes of the given type while `hidden` is true
    function mountFormer(schema: SchemaNode[], hiddenType: string) {
      const data = ref<FormData>({});
      const hidden = ref(false);
      mount(Former, {
        props: {
          'schema': schema,
          'data': data.value,
          'onUpdate:data': (value: FormData) => (data.value = value),
          components,
          'mode': 'build',
          'showIf': (node: SchemaNode) => !(hidden.value && node.type === hiddenType),
        },
      });
      return { data, hidden };
    }

    it('applies the preset again when a hidden field becomes visible', async () => {
      const { data, hidden } = mountFormer([{ type: 'field', name: 'presetField' }], 'field');
      await nextTick();
      expect(data.value).toStrictEqual({ presetField: 'preset' });

      hidden.value = true;
      await nextTick();
      expect(data.value).toStrictEqual({});

      hidden.value = false;
      await nextTick();
      expect(data.value).toStrictEqual({ presetField: 'preset' });
    });

    it('does not apply the preset while a parent layout is hidden', async () => {
      const { data, hidden } = mountFormer(
        [{ type: 'layout', children: [{ type: 'field', name: 'presetField' }] }],
        'layout',
      );
      await nextTick();
      expect(data.value).toStrictEqual({ presetField: 'preset' });

      hidden.value = true;
      await nextTick();
      expect(data.value).toStrictEqual({});

      hidden.value = false;
      await nextTick();
      expect(data.value).toStrictEqual({ presetField: 'preset' });
    });

    it('does not apply the preset while a parent group is hidden', async () => {
      const { data, hidden } = mountFormer(
        [{ type: 'group', name: 'group', children: [{ type: 'field', name: 'presetField' }] }],
        'group',
      );
      await nextTick();
      expect(data.value).toStrictEqual({ group: { presetField: 'preset' } });

      hidden.value = true;
      await nextTick();
      expect(data.value).toStrictEqual({});

      hidden.value = false;
      await nextTick();
      expect(data.value).toStrictEqual({ group: { presetField: 'preset' } });
    });
  });

  it('ignores a null preset', () => {
    const modelValue = ref<string | null | undefined>(undefined);
    mountUsePresetValue({ modelValue, preset: ref(null), hasDataKey: ref(false) });

    expect(modelValue.value).toBeUndefined();
  });

  it('does not apply the preset in read mode', () => {
    const modelValue = ref<string | null | undefined>(undefined);
    mountUsePresetValue({ modelValue, preset: ref('preset'), hasDataKey: ref(false), mode: ref('read') });

    expect(modelValue.value).toBeUndefined();
  });

  it('applies the preset when switching from read to edit mode while the key does not exist', async () => {
    const modelValue = ref<string | null | undefined>(undefined);
    const mode = ref<Mode>('read');
    mountUsePresetValue({ modelValue, preset: ref('preset'), hasDataKey: ref(false), mode });

    mode.value = 'edit';
    await nextTick();
    expect(modelValue.value).toBe('preset');
  });

  it('falls back to checking for an undefined model value outside of a form node', () => {
    const unset = ref<string | null | undefined>(undefined);
    mountUsePresetValue({ modelValue: unset, preset: ref('preset') });
    expect(unset.value).toBe('preset');

    const set = ref<string | null | undefined>(null);
    mountUsePresetValue({ modelValue: set, preset: ref('preset') });
    expect(set.value).toBeNull();
  });
});
