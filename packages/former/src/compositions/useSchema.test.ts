import type { FormComponents, InternalSchemaNode, SchemaNode, ValidationContext } from '~/types';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { z } from 'zod';
import { isNodeValid, type StandardSchemaV1 } from '~/validation';
import useSchema from './useSchema';

// a schema recording the validated values, the values are invalid if they are 'bad'
function createSchema() {
  const validate = vi.fn((value: unknown) => (value === 'bad' ? { issues: [{ message: 'invalid' }] } : { value }));
  const schema: StandardSchemaV1 = { '~standard': { version: 1, vendor: 'test', validate } };
  return { schema, validate };
}

// the props of the component are fields (having a technical name), so they are validated with the validation of the fields
function createComponents(propsSchema: Array<{ name?: string }> = [], schema?: StandardSchemaV1): FormComponents {
  return {
    text: {
      label: 'Text',
      propsSchema: propsSchema.map(prop => ({ type: 'field', ...prop })),
      component: {} as any,
    },
    field: {
      label: 'Field',
      propsSchema: [{ type: 'field', name: '$name' }],
      component: {} as any,
      validation: schema ? () => schema : undefined,
    },
  };
}

describe('useSchema', () => {
  describe('isNodeValid', () => {
    it('returns true when propsSchema is empty', () => {
      const { schema, validate } = createSchema();
      const node = { _id: 'n1', type: 'text' } as InternalSchemaNode;

      expect(isNodeValid(node, createComponents([], schema))).toBe(true);
      expect(validate).not.toHaveBeenCalled();
    });

    it('validates $name using node.name', () => {
      const { schema, validate } = createSchema();
      const node = { _id: 'n1', type: 'text', name: 'fieldA' } as InternalSchemaNode;

      expect(isNodeValid(node, createComponents([{ name: '$name' }], schema))).toBe(true);
      expect(validate).toHaveBeenCalledWith('fieldA');
    });

    it('validates other props from node.props[name]', () => {
      const { schema, validate } = createSchema();
      const node = { _id: 'n1', type: 'text', props: { placeholder: 'abc' } } as InternalSchemaNode;

      expect(isNodeValid(node, createComponents([{ name: 'placeholder' }], schema))).toBe(true);
      expect(validate).toHaveBeenCalledWith('abc');
    });

    it('returns false when the validation of any prop fails', () => {
      const { schema } = createSchema();
      const node = { _id: 'n1', type: 'text', props: { first: 'ok', second: 'bad' } } as InternalSchemaNode;
      const components = createComponents([{ name: 'first' }, { name: 'second' }], schema);

      expect(isNodeValid(node, components)).toBe(false);
    });

    it('treats missing node.props as undefined for non-$name props', () => {
      const { schema, validate } = createSchema();
      const node = { _id: 'n1', type: 'text' } as InternalSchemaNode;

      expect(isNodeValid(node, createComponents([{ name: 'placeholder' }], schema))).toBe(true);
      expect(validate).toHaveBeenCalledWith(undefined);
    });

    it('returns true when the components of the props have no validation', () => {
      const node = { _id: 'n1', type: 'text', props: { placeholder: 'bad' } } as InternalSchemaNode;

      expect(isNodeValid(node, createComponents([{ name: 'placeholder' }]))).toBe(true);
    });

    it('returns false when components[node.type] is undefined', () => {
      const node = { _id: 'n1', type: 'missing' } as InternalSchemaNode;

      expect(isNodeValid(node, {})).toBe(false);
    });

    it('ignores props when components[node.type].propsSchema.name is missing', () => {
      const { schema, validate } = createSchema();
      const node = { _id: 'n1', type: 'text', props: { placeholder: 'abc' } } as InternalSchemaNode;

      expect(isNodeValid(node, createComponents([{ }], schema))).toBe(true);
      expect(validate).toHaveBeenCalledWith(undefined);
    });

    it('passes the props of the props node and the props as only scope to the validation', () => {
      const validation = vi.fn(() => undefined);
      const node = { _id: 'n1', type: 'text', name: 'fieldA', props: { placeholder: 'abc' } } as InternalSchemaNode;
      const components: FormComponents = {
        text: { label: 'Text', component: {} as any, propsSchema: [{ type: 'field', name: 'placeholder', props: { required: true } }] },
        field: { label: 'Field', component: {} as any, validation, propsSchema: [{ type: 'field', name: '$name' }] },
      };

      isNodeValid(node, components);
      expect(validation).toHaveBeenCalledWith({ required: true }, {
        node: components.text.propsSchema[0],
        path: ['placeholder'],
        scopes: [{ data: { $name: 'fieldA', placeholder: 'abc' }, path: [] }],
      });
    });

    it('validates the props nested in groups and the items of lists like they are rendered', () => {
      const validation = vi.fn(({ required }) => (required ? z.string('required') : undefined));
      const field = { label: 'Field', component: {} as any, validation, propsSchema: [{ type: 'field', name: '$name' }] };
      const components: FormComponents = {
        text: {
          label: 'Text',
          component: {} as any,
          propsSchema: [
            { type: 'group', name: 'group', children: [{ type: 'field', name: 'a', props: { required: true } }] },
            { type: 'list', name: 'options', children: [{ type: 'field', name: 'value', props: { required: true } }] },
          ],
        },
        field,
        group: { ...field, validation: undefined },
        list: { ...field, validation: undefined, isList: true },
      };
      const node = { _id: 'n1', type: 'text', props: { group: { a: 'x' }, options: [{ value: 'y' }, { value: null }] } } as InternalSchemaNode;

      expect(isNodeValid(node, components)).toBe(false);
      const contexts = validation.mock.calls.map(call => (call as unknown[])[1] as ValidationContext);
      expect(contexts.map(context => context.path)).toEqual([['group', 'a'], ['options', 0, 'value'], ['options', 1, 'value']]);
      expect(contexts[2].scopes.map(scope => scope.data)).toEqual([{ value: null }, node.props]);

      expect(isNodeValid({ ...node, props: { group: { a: 'x' }, options: [{ value: 'y' }] } }, components)).toBe(true);
      expect(isNodeValid({ ...node, props: { group: {}, options: [] } }, components)).toBe(false);
    });

    it('validates the items of props lists not marked as list (`isList`), e.g. the options of a select', () => {
      const validation = vi.fn(({ required }) => (required ? z.string('required') : undefined));
      const field = { label: 'Field', component: {} as any, validation, propsSchema: [{ type: 'field', name: '$name' }] };
      const components: FormComponents = {
        select: {
          label: 'Select',
          component: {} as any,
          propsSchema: [{ type: 'repeater', name: 'options', children: [{ type: 'field', name: 'value', props: { required: true } }] }],
        },
        field,
        repeater: { ...field, validation: undefined },
      };
      const select = (options: unknown[]) => ({ _id: 'n1', type: 'select', props: { options } }) as InternalSchemaNode;

      expect(isNodeValid(select([{ value: 'a' }, { value: 'b' }]), components)).toBe(true);
      expect(isNodeValid(select([{ value: 'a' }, { value: null }]), components)).toBe(false);
      const contexts = validation.mock.calls.map(call => (call as unknown[])[1] as ValidationContext);
      expect(contexts.map(context => context.path)).toContainEqual(['options', 1, 'value']);
    });

    it('validates only the shown children of the props', () => {
      const { schema } = createSchema();
      const components: FormComponents = {
        ...createComponents([], schema),
        text: {
          label: 'Text',
          component: {} as any,
          propsSchema: [{ type: 'columns', children: { shown: [{ type: 'field', name: 'a' }], removed: [{ type: 'field', name: 'b' }] } }],
        },
        columns: { label: 'Columns', component: {} as any, propsSchema: [], shownChildren: node => (node.children as { shown: SchemaNode[] }).shown },
      };

      expect(isNodeValid({ _id: 'n1', type: 'text', props: { a: 'ok', b: 'bad' } } as InternalSchemaNode, components)).toBe(true);
      expect(isNodeValid({ _id: 'n1', type: 'text', props: { a: 'bad', b: 'ok' } } as InternalSchemaNode, components)).toBe(false);
    });

    it('resolves async validation', async () => {
      const node = { _id: 'n1', type: 'text', props: { placeholder: 'bad' } } as InternalSchemaNode;
      const schema: StandardSchemaV1 = { '~standard': { version: 1, vendor: 'test', validate: async () => ({ issues: [{ message: 'invalid' }] }) } };

      await expect(isNodeValid(node, createComponents([{ name: 'placeholder' }], schema))).resolves.toBe(false);
    });
  });

  describe('useSchema', () => {
    it('isValid is true for an empty schema ref', () => {
      const { schema: validationSchema } = createSchema();
      const schema = ref<InternalSchemaNode[]>([]);
      const { isValid } = useSchema(schema, createComponents([{ name: 'x' }], validationSchema));

      expect(isValid.value).toBe(true);
    });

    it('isValid is true when every node in the flattened tree passes isNodeValid', () => {
      const { schema: validationSchema } = createSchema();
      const schema = ref<InternalSchemaNode[]>([
        {
          _id: 'root',
          type: 'text',
          props: { foo: 'bar' },
          children: [{ _id: 'child', type: 'text', props: { foo: 'baz' } }],
        },
      ]);
      const { isValid } = useSchema(schema, createComponents([{ name: 'foo' }], validationSchema));

      expect(isValid.value).toBe(true);
    });

    it('isValid is false if any node fails', () => {
      const { schema: validationSchema } = createSchema();
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'n1', type: 'text', props: { foo: 'ok' } },
        { _id: 'n2', type: 'text', props: { foo: 'bad' } },
      ]);
      const { isValid } = useSchema(schema, createComponents([{ name: 'foo' }], validationSchema));

      expect(isValid.value).toBe(false);
    });

    it('re-evaluates isValid when the schema ref changes', () => {
      const { schema: validationSchema } = createSchema();
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'n1', type: 'text', props: { foo: 'ok' } },
      ]);
      const { isValid } = useSchema(schema, createComponents([{ name: 'foo' }], validationSchema));

      expect(isValid.value).toBe(true);

      schema.value = [{ _id: 'n1', type: 'text', props: { foo: 'bad' } }];
      expect(isValid.value).toBe(false);
    });

    it('re-evaluates isValid when the components ref changes', () => {
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text' }]);
      const components = ref<FormComponents>(createComponents());
      const { isValid } = useSchema(schema, components);

      expect(isValid.value).toBe(true);

      components.value = {};
      expect(isValid.value).toBe(false);
    });

    it('is the validity of the props of each node by its id, validating each node once', () => {
      const { schema: validationSchema, validate } = createSchema();
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'n1', type: 'text', props: { foo: 'ok' } },
        { _id: 'n2', type: 'text', props: { foo: 'bad' } },
      ]);
      const { propsValidity } = useSchema(schema, createComponents([{ name: 'foo' }], validationSchema));

      expect(propsValidity.value).toEqual({ n1: true, n2: false });
      expect(validate).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['throws', () => {
        throw new Error('Server not reachable');
      }],
      ['rejects', () => Promise.reject(new Error('Server not reachable'))],
    ])('is the message of a validation which %s and invalid', async (_, validate) => {
      const failing: StandardSchemaV1 = { '~standard': { version: 1, vendor: 'test', validate: validate as StandardSchemaV1['~standard']['validate'] } };
      const { schema: validationSchema } = createSchema();
      const components: FormComponents = {
        ...createComponents([{ name: 'foo' }], validationSchema),
        failing: { label: 'Failing', component: {} as any, propsSchema: [{ type: 'field', name: '$name' }], validation: () => failing },
      };
      components.failing.propsSchema = [{ type: 'failing', name: 'foo' }];
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'n1', type: 'text', props: { foo: 'ok' } },
        { _id: 'n2', type: 'failing', props: { foo: 'x' } },
      ]);
      const { propsValidity, isValid } = useSchema(schema, components);
      await flushPromises();

      expect(propsValidity.value).toEqual({ n1: true, n2: 'Server not reachable' });
      expect(isValid.value).toBe(false);
    });

    it('isValid is false if validating the whole schema fails', async () => {
      // a malformed schema, which can't be iterated
      const schema = ref(null as unknown as InternalSchemaNode[]);
      const { propsValidity, isValid } = useSchema(schema, createComponents());
      await flushPromises();

      expect(propsValidity.value).toEqual({});
      expect(isValid.value).toBe(false);
    });
  });
});
