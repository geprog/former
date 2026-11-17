import type { FieldData, FormData, SchemaNode } from '@former-ui/former';
import { Former } from '@former-ui/former';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { nuxtUiStubs } from '../test/nuxtUiStubs';
import { createFormComponents } from './formComponents';

const components = createFormComponents((key, named) => (named ? `${key} ${JSON.stringify(named)}` : key));
type ValidatedType = { [Type in keyof typeof components]: 'validation' extends keyof typeof components[Type] ? Type : never }[keyof typeof components];

function errorOf(type: ValidatedType, props: { [key: string]: unknown }, value: FieldData | FormData) {
  return components[type].validation(props)?.safeParse(value).error?.issues[0]?.message;
}

describe('validation', () => {
  it.each([
    ['text', ''],
    ['text', null],
    ['textarea', undefined],
    ['number', null],
    ['select', null],
    ['combo_box', null],
    ['radio_group', null],
    ['checkbox', null],
    ['switch', null],
    ['date', null],
    ['file_upload', null],
    ['repeater', [] as FormData[]],
    ['checkbox_group', null],
    ['tags', null],
    ['time', null],
    ['slider', null],
    ['rating', null],
    ['color', null],
  ] as const)('%s requires a value with `required`', (type, empty) => {
    expect(errorOf(type, { required: true }, empty)).toBe('error_required');
    expect(errorOf(type, {}, empty)).toBeUndefined();
  });

  it('accepts a filled in required value', () => {
    expect(errorOf('text', { required: true }, 'x')).toBeUndefined();
    expect(errorOf('checkbox', { required: true }, true)).toBeUndefined();
    expect(errorOf('repeater', { required: true }, [{}])).toBeUndefined();
  });

  it('checks the range of a number', () => {
    expect(errorOf('number', { min: 2, max: 4 }, 1)).toBe('error_min_value {"min":2}');
    expect(errorOf('number', { min: 2, max: 4 }, 5)).toBe('error_max_value {"max":4}');
    expect(errorOf('number', { min: 2, max: 4 }, 2)).toBeUndefined();
    expect(errorOf('number', { min: 0 }, 0)).toBeUndefined();
    expect(errorOf('number', { min: 0 }, -1)).toBe('error_min_value {"min":0}');
  });

  it('checks the range of a date', () => {
    const props = { min: '2026-01-01', max: '2026-12-31' };
    expect(errorOf('date', props, '2025-12-31')).toBe('error_min_date {"min":"2026-01-01"}');
    expect(errorOf('date', props, '2027-01-01')).toBe('error_max_date {"max":"2026-12-31"}');
    expect(errorOf('date', props, '2026-06-15')).toBeUndefined();
  });

  it('checks the range of a time', () => {
    const props = { min: '08:00', max: '17:30' };
    expect(errorOf('time', props, '07:59')).toBe('error_min_time {"min":"08:00"}');
    expect(errorOf('time', props, '17:31')).toBe('error_max_time {"max":"17:30"}');
    expect(errorOf('time', props, '12:00')).toBeUndefined();
  });

  it('ignores cleared limits', () => {
    expect(errorOf('number', { min: null, max: null }, 5)).toBeUndefined();
    expect(errorOf('date', { min: null, max: '' }, '2026-06-15')).toBeUndefined();
  });

  it('checks the length of a text', () => {
    expect(errorOf('text', { minLength: 3 }, 'ab')).toBe('error_min_length {"min":3}');
    expect(errorOf('text', { maxLength: 3 }, 'abcd')).toBe('error_max_length {"max":3}');
    expect(errorOf('text', { minLength: 2, maxLength: 3 }, 'abc')).toBeUndefined();
  });

  it('checks the length of a free text', () => {
    expect(errorOf('textarea', { minLength: 3 }, 'ab')).toBe('error_min_length {"min":3}');
    expect(errorOf('textarea', { maxLength: 3 }, 'abc')).toBeUndefined();
  });

  it('checks the number of items of a repeater', () => {
    expect(errorOf('repeater', { minItems: 2 }, [{}])).toBe('error_min_items {"min":2}');
    expect(errorOf('repeater', { maxItems: 1 }, [{}, {}])).toBe('error_max_items {"max":1}');
    expect(errorOf('repeater', { minItems: 1, maxItems: 2 }, [{}, {}])).toBeUndefined();
    expect(errorOf('repeater', { minItems: 2 }, [])).toBeUndefined();
    expect(errorOf('repeater', { minItems: 2 }, null)).toBeUndefined();
  });

  it('checks the size of a file', () => {
    // a data URL with about the given number of bytes, base64 encodes 3 bytes in 4 characters
    const file = (bytes: number) => `data:text/plain;name=a.txt;base64,${'A'.repeat(Math.ceil(bytes / 3) * 4)}`;
    expect(errorOf('file_upload', { maxSize: 1 }, file(1024 * 1024 + 3))).toBe('error_max_size {"max":1}');
    expect(errorOf('file_upload', { maxSize: 1 }, file(1024 * 1024 - 2))).toBeUndefined();
    expect(errorOf('file_upload', { maxSize: 1 }, null)).toBeUndefined();
  });

  it('checks a list of values of a select with multiple choice', () => {
    expect(errorOf('select', { multiple: true, required: true }, [] as unknown as FormData[])).toBe('error_required');
    expect(errorOf('select', { multiple: true, required: true }, ['a'] as unknown as FormData[])).toBeUndefined();
  });

  it.each([
    [{ multiple: true, required: true }, 'a'],
    [{ required: true }, ['a'] as unknown as FormData[]],
  ])('accepts a value stored before `multiple` was toggled with %o', (props, value) => {
    expect(errorOf('select', props, value)).toBeUndefined();
  });

  it.each([
    ['#00c16a', undefined],
    ['#ABC', undefined],
    ['#00C16A80', undefined],
    ['', undefined],
    ['00C16A', 'error_color'],
    ['#00C16', 'error_color'],
    ['green', 'error_color'],
  ])('checks the color %o', (value, error) => {
    expect(errorOf('color', {}, value)).toBe(error);
  });

  it('checks the format of an email or URL', () => {
    expect(errorOf('text', { inputType: 'email' }, 'no-email')).toBe('error_email');
    expect(errorOf('text', { inputType: 'email' }, 'mail@example.com')).toBeUndefined();
    expect(errorOf('text', { inputType: 'url' }, 'no url')).toBe('error_url');
    expect(errorOf('text', { inputType: 'url' }, 'https://example.com')).toBeUndefined();
  });

  it.each([null, ''])('does not check the length or format of the empty text %o', (empty) => {
    expect(errorOf('text', { minLength: 3, inputType: 'email' }, empty)).toBeUndefined();
  });

  it('does not check the range of an empty value', () => {
    expect(errorOf('number', { min: 2 }, null)).toBeUndefined();
  });

  it('can be extended with zod', () => {
    const schema = components.text.validation({ required: true })!.refine(value => value !== 'x', 'not x');
    expect(schema.safeParse(null).error?.issues[0]?.message).toBe('error_required');
    expect(schema.safeParse('x').error?.issues[0]?.message).toBe('not x');
    expect(schema.safeParse('y').success).toBe(true);
  });

  it('has an english text for each error message', async () => {
    const { default: en } = await import('./locales/en.json');
    const keys = new Set<string>();
    const translated = createFormComponents((key) => {
      keys.add(key);
      return key;
    });
    translated.number.validation({ required: true }).safeParse(null);
    translated.number.validation({ min: 2 }).safeParse(1);
    translated.number.validation({ max: 2 }).safeParse(3);
    translated.date.validation({ min: '2026-01-02' }).safeParse('2026-01-01');
    translated.date.validation({ max: '2026-01-01' }).safeParse('2026-01-02');
    translated.text.validation({ minLength: 1, maxLength: 1, inputType: 'email' });
    translated.text.validation({ inputType: 'url' });
    translated.repeater.validation({ minItems: 1, maxItems: 1 });
    translated.file_upload.validation({ maxSize: 1 });
    translated.time.validation({ min: '08:00', max: '17:00' });
    translated.color.validation({});

    expect(Object.keys(en)).toEqual(expect.arrayContaining([...keys]));
  });

  it('passes the error to the field and emits the form as invalid', async () => {
    let valid: boolean | undefined;
    const wrapper = mount(Former, {
      props: {
        schema: [{ type: 'text', name: 'field', props: { label: 'Field', required: true } }],
        data: {} as FormData,
        components,
        mode: 'edit',
        onValid: (value: boolean) => (valid = value),
      },
      global: { components: nuxtUiStubs },
    });
    await nextTick();

    expect(wrapper.findComponent({ name: 'UFormField' }).props('error')).toBe('error_required');
    expect(valid).toBe(false);
  });

  it('validates the props of the nodes in build mode, e.g. the required technical name', async () => {
    let schemaValid: boolean | undefined;
    mount(Former, {
      props: {
        schema: [{ type: 'text' }] as SchemaNode[],
        data: {} as FormData,
        components,
        mode: 'build',
        onSchemaValid: (value: boolean) => (schemaValid = value),
      },
      global: { components: nuxtUiStubs },
    });
    await nextTick();

    expect(schemaValid).toBe(false);
  });
});
