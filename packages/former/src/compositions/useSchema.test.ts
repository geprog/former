import type { FormComponents, InternalSchemaNode, Validator } from '~/types';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import useSchema, { isNodeValid } from './useSchema';

function createComponents(propsSchema: Array<{ name?: string }> = []): FormComponents {
  return {
    text: {
      label: 'Text',
      propsSchema: propsSchema.map(prop => ({ type: 'text', ...prop })),
      component: {} as any,
    },
  };
}

describe('useSchema', () => {
  describe('isNodeValid', () => {
    it('returns true when propsSchema is empty', () => {
      const validator = vi.fn<Validator>(() => true);
      const node = { _id: 'n1', type: 'text' } as InternalSchemaNode;

      expect(isNodeValid(node, validator, createComponents())).toBe(true);
      expect(validator).not.toHaveBeenCalled();
    });

    it('validates $name using node.name', () => {
      const validator = vi.fn<Validator>(() => true);
      const node = { _id: 'n1', type: 'text', name: 'fieldA' } as InternalSchemaNode;

      expect(isNodeValid(node, validator, createComponents([{ name: '$name' }]))).toBe(true);
      expect(validator).toHaveBeenCalledWith(expect.objectContaining({ name: '$name' }), 'fieldA');
    });

    it('validates other props from node.props[name]', () => {
      const validator = vi.fn<Validator>(() => true);
      const node = { _id: 'n1', type: 'text', props: { placeholder: 'abc' } } as InternalSchemaNode;

      expect(isNodeValid(node, validator, createComponents([{ name: 'placeholder' }]))).toBe(true);
      expect(validator).toHaveBeenCalledWith(expect.objectContaining({ name: 'placeholder' }), 'abc');
    });

    it('returns false when any prop validation returns a string', () => {
      const validator = vi.fn<Validator>((_prop, value) => (value === 'bad' ? 'invalid' : true));
      const node = { _id: 'n1', type: 'text', props: { first: 'ok', second: 'bad' } } as InternalSchemaNode;
      const components = createComponents([{ name: 'first' }, { name: 'second' }]);

      expect(isNodeValid(node, validator, components)).toBe(false);
    });

    it('treats missing node.props as undefined for non-$name props', () => {
      const validator = vi.fn<Validator>(() => true);
      const node = { _id: 'n1', type: 'text' } as InternalSchemaNode;

      expect(isNodeValid(node, validator, createComponents([{ name: 'placeholder' }]))).toBe(true);
      expect(validator).toHaveBeenCalledWith(expect.objectContaining({ name: 'placeholder' }), undefined);
    });

    it('throws when components[node.type] is undefined', () => {
      const validator = vi.fn<Validator>(() => true);
      const node = { _id: 'n1', type: 'missing' } as InternalSchemaNode;

      expect(() => isNodeValid(node, validator, {})).toThrow();
    });

    it('ignores props when components[node.type].propsSchema.name is missing', () => {
      const validator = vi.fn<Validator>(() => true);
      const node = { _id: 'n1', type: 'text', props: { placeholder: 'abc' } } as InternalSchemaNode;

      expect(isNodeValid(node, validator, createComponents([{ }]))).toBe(true);
      expect(validator).toHaveBeenCalledWith(expect.objectContaining({ }), undefined);
    });
  });

  describe('useSchema', () => {
    it('isValid is true for an empty schema ref', () => {
      const validator = vi.fn<Validator>(() => true);
      const schema = ref<InternalSchemaNode[]>([]);
      const { isValid } = useSchema(schema, validator, createComponents([{ name: 'x' }]));

      expect(isValid.value).toBe(true);
    });

    it('isValid is true when every node in the flattened tree passes isNodeValid', () => {
      const validator = vi.fn<Validator>(() => true);
      const schema = ref<InternalSchemaNode[]>([
        {
          _id: 'root',
          type: 'text',
          props: { foo: 'bar' },
          children: [{ _id: 'child', type: 'text', props: { foo: 'baz' } }],
        },
      ]);
      const { isValid } = useSchema(schema, validator, createComponents([{ name: 'foo' }]));

      expect(isValid.value).toBe(true);
    });

    it('isValid is false if any node fails', () => {
      const validator: Validator = vi.fn((_prop, value) => (value === 'bad' ? 'invalid' : true));
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'n1', type: 'text', props: { foo: 'ok' } },
        { _id: 'n2', type: 'text', props: { foo: 'bad' } },
      ]);
      const { isValid } = useSchema(schema, validator, createComponents([{ name: 'foo' }]));

      expect(isValid.value).toBe(false);
    });

    it('re-evaluates isValid when the schema ref changes', () => {
      const validator: Validator = vi.fn((_prop, value) => (value === 'bad' ? 'invalid' : true));
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'n1', type: 'text', props: { foo: 'ok' } },
      ]);
      const { isValid } = useSchema(schema, validator, createComponents([{ name: 'foo' }]));

      expect(isValid.value).toBe(true);

      schema.value = [{ _id: 'n1', type: 'text', props: { foo: 'bad' } }];
      expect(isValid.value).toBe(false);
    });
  });
});
