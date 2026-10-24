import type { FormComponents, FormData, SchemaNode, Validator } from '~/types';
import type { StandardSchemaV1 } from '~/validation';
import { flushPromises, mount } from '@vue/test-utils';
import * as superstruct from 'superstruct';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, markRaw, type PropType } from 'vue';
import * as yup from 'yup';
import { z } from 'zod';
import { fromSuperstruct } from '~/validation';
import FormDataProvider from './FormDataProvider.vue';
import Former from './Former.vue';
import FormRenderer from './FormRenderer.vue';

const TextField = defineComponent({
  props: { label: String, modelValue: null, error: String, mode: String, id: String },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('input', {
      'data-label': props.label,
      'data-error': props.error ?? '',
      'value': props.modelValue ?? '',
      'onInput': (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
    });
  },
});

const Group = defineComponent({
  props: { label: String, error: String },
  setup(props) {
    return () => h('fieldset', { 'data-label': props.label, 'data-error': props.error ?? '' }, [h(FormRenderer)]);
  },
});

const Repeater = defineComponent({
  props: { label: String, error: String, modelValue: Array as PropType<FormData[]> },
  setup(props) {
    return () => h('div', { 'data-label': props.label, 'data-error': props.error ?? '' }, (props.modelValue ?? []).map(item =>
      h(FormDataProvider, { data: item }, () => h(FormRenderer))));
  },
});

const components: FormComponents = {
  text: { label: 'Text', component: markRaw(TextField), propsSchema: [{ type: 'text', name: '$name' }, { type: 'text', name: 'required' }] },
  group: { label: 'Group', component: markRaw(Group), propsSchema: [{ type: 'text', name: '$name' }] },
  section: { label: 'Section', component: markRaw(Group), propsSchema: [] },
  repeater: { label: 'Repeater', component: markRaw(Repeater), propsSchema: [{ type: 'text', name: '$name' }], isList: true },
};

const schema: SchemaNode[] = [
  { type: 'text', name: 'name', props: { label: 'Name', required: true } },
  { type: 'section', props: { label: 'Section' }, children: [{ type: 'text', name: 'email', props: { label: 'Email' } }] },
  { type: 'group', name: 'address', props: { label: 'Address' }, children: [{ type: 'text', name: 'street', props: { label: 'Street', required: true } }] },
  { type: 'repeater', name: 'items', props: { label: 'Items' }, children: [{ type: 'text', name: 'title', props: { label: 'Title', required: true } }] },
];

const invalidData = (): FormData => ({ name: '', email: 'no-mail', address: { street: '' }, items: [{ title: 'first' }, { title: '' }] });
const validData = (): FormData => ({ name: 'Jane', email: 'jane@example.com', address: { street: 'Main' }, items: [{ title: 'first' }, { title: 'second' }] });

// the same form data schema in every library, with the same messages
const formSchemas: Record<string, () => StandardSchemaV1> = {
  zod: () => z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.email('Invalid email').nullish(),
    address: z.object({ street: z.string().min(1, 'Street is required') }),
    items: z.array(z.object({ title: z.string().min(1, 'Title is required') })),
  }),
  superstruct: () => {
    const { array, nullable, object, optional, refine, string } = superstruct;
    const required = (message: string) => refine(string(), 'required', value => value.length > 0 || message);
    return fromSuperstruct(object({
      name: required('Name is required'),
      email: optional(nullable(refine(string(), 'email', value => value.includes('@') || 'Invalid email'))),
      address: object({ street: required('Street is required') }),
      items: array(object({ title: required('Title is required') })),
    }));
  },
  yup: () => yup.object({
    name: yup.string().required('Name is required'),
    email: yup.string().email('Invalid email').nullable(),
    address: yup.object({ street: yup.string().required('Street is required') }),
    items: yup.array(yup.object({ title: yup.string().required('Title is required') })),
  }),
  valibot: () => v.object({
    name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
    email: v.nullish(v.pipe(v.string(), v.email('Invalid email'))),
    address: v.object({ street: v.pipe(v.string(), v.minLength(1, 'Street is required')) }),
    items: v.array(v.object({ title: v.pipe(v.string(), v.minLength(1, 'Title is required')) })),
  }),
};

// a validator returning a schema per node, depending on its props
const nodeValidators: Record<string, Validator> = {
  zod: node => (node.props?.required ? z.string('Value is required').min(1, 'Value is required') : true),
  superstruct: node => (node.props?.required
    ? fromSuperstruct(superstruct.define('required', value => (typeof value === 'string' && value.length > 0) || 'Value is required'))
    : true),
  yup: node => (node.props?.required ? yup.string().required('Value is required') : true),
  valibot: node => (node.props?.required ? v.pipe(v.string('Value is required'), v.minLength(1, 'Value is required')) : true),
};

function last<T>(values: T[] | undefined) {
  return values?.[values.length - 1];
}

async function settle() {
  // async schemas (e.g. yup) resolve after a few microtasks
  for (let i = 0; i < 5; i++) {
    await flushPromises();
  }
}

function mountFormer(props: Record<string, unknown>) {
  const valid: boolean[] = [];
  const wrapper = mount(Former, {
    props: { schema, components, mode: 'edit', onValid: (value: boolean) => valid.push(value), ...props },
  });
  return { wrapper, valid };
}

function errorOf(wrapper: ReturnType<typeof mount>, label: string, index = 0) {
  return wrapper.findAll(`[data-label="${label}"]`)[index]?.attributes('data-error');
}

describe.each(Object.keys(formSchemas))('validation with %s', (library) => {
  describe('schema of the whole form data', () => {
    it('shows the issues at the nodes of their path', async () => {
      const { wrapper, valid } = mountFormer({ data: invalidData(), validator: formSchemas[library]() });
      await settle();

      expect(errorOf(wrapper, 'Name')).toBe('Name is required');
      expect(errorOf(wrapper, 'Email')).toBe('Invalid email');
      expect(errorOf(wrapper, 'Street')).toBe('Street is required');
      expect(errorOf(wrapper, 'Title', 0)).toBe('');
      expect(errorOf(wrapper, 'Title', 1)).toBe('Title is required');
      // containers don't repeat the issues of their children
      expect(errorOf(wrapper, 'Address')).toBe('');
      expect(errorOf(wrapper, 'Items')).toBe('');
      expect(errorOf(wrapper, 'Section')).toBe('');
      expect(last(valid)).toBe(false);
    });

    it('becomes valid when the data is fixed by the user', async () => {
      const { wrapper, valid } = mountFormer({ data: invalidData(), validator: formSchemas[library]() });
      await settle();

      await wrapper.find('[data-label="Name"]').setValue('Jane');
      await wrapper.find('[data-label="Email"]').setValue('jane@example.com');
      await wrapper.find('[data-label="Street"]').setValue('Main');
      await wrapper.findAll('[data-label="Title"]')[1].setValue('second');
      await settle();

      expect(errorOf(wrapper, 'Name')).toBe('');
      expect(errorOf(wrapper, 'Title', 1)).toBe('');
      expect(last(valid)).toBe(true);
      expect(last(wrapper.emitted('update:data'))?.[0]).toEqual(validData());
    });

    it('is valid for valid data', async () => {
      const { wrapper, valid } = mountFormer({ data: validData(), validator: formSchemas[library]() });
      await settle();

      expect(wrapper.findAll('[data-error]').every(field => field.attributes('data-error') === '')).toBe(true);
      expect(last(valid)).toBe(true);
    });

    it('ignores the issues of hidden nodes', async () => {
      const { wrapper, valid } = mountFormer({
        data: { ...validData(), name: '' },
        validator: formSchemas[library](),
        showIf: (node: SchemaNode) => node.name !== 'name',
      });
      await settle();

      expect(wrapper.find('[data-label="Name"]').exists()).toBe(false);
      expect(last(valid)).toBe(true);
    });
  });

  describe('validator returning a schema per node', () => {
    it('validates each node with its schema', async () => {
      const { wrapper, valid } = mountFormer({ data: invalidData(), validator: nodeValidators[library] });
      await settle();

      expect(errorOf(wrapper, 'Name')).toBe('Value is required');
      expect(errorOf(wrapper, 'Email')).toBe('');
      expect(errorOf(wrapper, 'Street')).toBe('Value is required');
      expect(errorOf(wrapper, 'Title', 0)).toBe('');
      expect(errorOf(wrapper, 'Title', 1)).toBe('Value is required');
      expect(last(valid)).toBe(false);

      await wrapper.find('[data-label="Name"]').setValue('Jane');
      await wrapper.find('[data-label="Street"]').setValue('Main');
      await wrapper.findAll('[data-label="Title"]')[1].setValue('second');
      await settle();

      expect(errorOf(wrapper, 'Name')).toBe('');
      expect(last(valid)).toBe(true);
    });

    it('treats a never filled in field as invalid', async () => {
      const { wrapper, valid } = mountFormer({ data: {}, validator: nodeValidators[library] });
      await settle();

      expect(errorOf(wrapper, 'Name')).toBe('Value is required');
      expect(last(valid)).toBe(false);
    });

    it('validates the props of the nodes in build mode', async () => {
      const schemaValid: boolean[] = [];
      mount(Former, {
        props: {
          schema: [{ type: 'text', name: '', props: { label: 'Name' } }],
          components: {
            text: { ...components.text, propsSchema: [{ type: 'text', name: '$name', props: { required: true } }] },
          },
          mode: 'build',
          validator: nodeValidators[library],
          onSchemaValid: (value: boolean) => schemaValid.push(value),
        },
      });
      await settle();

      expect(last(schemaValid)).toBe(false);
    });
  });
});

describe('validation with a schema of the whole form data', () => {
  it('is invalid for issues of the whole form data', async () => {
    const validator = z.object({ name: z.string(), email: z.string() })
      .refine(data => data.name !== data.email, 'Name and email must differ');
    const { valid } = mountFormer({ data: { ...validData(), email: 'Jane' }, validator });
    await settle();

    expect(last(valid)).toBe(false);
  });

  it('attributes refinements with a path to their node', async () => {
    const validator = z.object({ name: z.string(), email: z.string() })
      .refine(data => data.name !== data.email, { message: 'Must differ from the name', path: ['email'] });
    const { wrapper, valid } = mountFormer({ data: { ...validData(), email: 'Jane' }, validator });
    await settle();

    expect(errorOf(wrapper, 'Email')).toBe('Must differ from the name');
    expect(last(valid)).toBe(false);
  });

  it('shows nested issues at leaf nodes', async () => {
    const validator = z.object({ name: z.array(z.string()) });
    const { wrapper } = mountFormer({ schema: [schema[0]], data: { name: [1] }, validator });
    await settle();

    expect(errorOf(wrapper, 'Name')).toContain('expected string');
  });

  it('is not applied to the props of the nodes in build mode', async () => {
    const schemaValid: boolean[] = [];
    mount(Former, {
      props: {
        schema,
        components,
        mode: 'build',
        validator: z.never(),
        onSchemaValid: (value: boolean) => schemaValid.push(value),
      },
    });
    await settle();

    expect(last(schemaValid)).toBe(true);
  });

  it('uses the latest result of async validation', async () => {
    let calls = 0;
    const validator: StandardSchemaV1 = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: async (value) => {
          // the first validation resolves last
          const delay = calls++ === 0 ? 20 : 0;
          await new Promise(resolve => setTimeout(resolve, delay));
          const name = (value as FormData).name;
          return name ? { value } : { issues: [{ message: 'Name is required', path: ['name'] }] };
        },
      },
    };
    const { wrapper } = mountFormer({ schema: [schema[0]], data: { name: '' }, validator });
    await wrapper.find('[data-label="Name"]').setValue('Jane');
    await new Promise(resolve => setTimeout(resolve, 40));
    await flushPromises();

    expect(errorOf(wrapper, 'Name')).toBe('');
  });
});
