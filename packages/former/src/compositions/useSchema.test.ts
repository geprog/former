import type { FormComponents, InternalSchemaNode } from '~/types';
import type { StandardSchemaV1 } from '~/validation';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import useSchema, { isNodeValid } from './useSchema';

// a schema recording the validated values, the values are invalid if they are 'bad'
function createSchema() {
  const validate = vi.fn((value: unknown) => (value === 'bad' ? { issues: [{ message: 'invalid' }] } : { value }));
  const schema: StandardSchemaV1 = { '~standard': { version: 1, vendor: 'test', validate } };
  return { schema, validate };
}

// the props of the component are text nodes as well, so they are validated with its validation
function createComponents(propsSchema: Array<{ name?: string }> = [], schema?: StandardSchemaV1): FormComponents {
  return {
    text: {
      label: 'Text',
      propsSchema: propsSchema.map(prop => ({ type: 'text', ...prop })),
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
        text: { label: 'Text', component: {} as any, validation, propsSchema: [{ type: 'text', name: 'placeholder', props: { required: true } }] },
      };

      isNodeValid(node, components);
      expect(validation).toHaveBeenCalledWith({ required: true }, {
        node: components.text.propsSchema[0],
        path: ['placeholder'],
        scopes: [{ data: { $name: 'fieldA', placeholder: 'abc' }, path: [] }],
      });
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
  });
});
