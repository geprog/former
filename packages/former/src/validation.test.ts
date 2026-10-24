import type { FormComponents, InternalSchemaNode, Validator } from '~/types';
import { array, number, object, refine, string } from 'superstruct';
import { describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import * as yup from 'yup';
import { z } from 'zod';
import {
  allValid,
  fromSuperstruct,
  isNodeValid,
  isStandardSchema,
  issueMessageAt,
  issuePath,
  type StandardSchemaV1,
  useMaybeAsync,
  validateNode,
  validateWithSchema,
} from './validation';

const node = { type: 'text', name: 'a' };

function asyncSchema(message?: string): StandardSchemaV1 {
  return {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate: async value => (message ? { issues: [{ message }] } : { value }),
    },
  };
}

describe('validation', () => {
  describe('isStandardSchema', () => {
    it('detects schemas of standard schema libraries', () => {
      expect(isStandardSchema(z.string())).toBe(true);
      expect(isStandardSchema(yup.string())).toBe(true);
      expect(isStandardSchema(fromSuperstruct(string()))).toBe(true);
    });

    it('detects callable schemas', () => {
      const schema = Object.assign(() => {}, { '~standard': { version: 1, vendor: 'x', validate: () => ({ value: 1 }) } });
      expect(isStandardSchema(schema)).toBe(true);
    });

    it('rejects validator functions and other values', () => {
      expect(isStandardSchema(() => true)).toBe(false);
      expect(isStandardSchema(undefined)).toBe(false);
      expect(isStandardSchema(null)).toBe(false);
      expect(isStandardSchema('text')).toBe(false);
      expect(isStandardSchema({ '~standard': {} })).toBe(false);
      // superstruct doesn't implement the spec itself
      expect(isStandardSchema(string())).toBe(false);
    });
  });

  describe('validateNode', () => {
    it('returns undefined for valid data of a legacy validator', () => {
      expect(validateNode(() => true, node, 'x')).toBeUndefined();
    });

    it('returns the message of a legacy validator', () => {
      expect(validateNode(() => 'bad', node, 'x')).toBe('bad');
    });

    it('passes the node and data to the validator', () => {
      const validator = vi.fn<Validator>(() => true);
      validateNode(validator, node, 'x');
      expect(validator).toHaveBeenCalledWith(node, 'x');
    });

    it('validates the data with a returned zod schema', () => {
      const validator: Validator = () => z.string().min(3, 'too short');
      expect(validateNode(validator, node, 'ab')).toBe('too short');
      expect(validateNode(validator, node, 'abc')).toBeUndefined();
    });

    it('validates the data with a returned superstruct struct', () => {
      const validator: Validator = () => fromSuperstruct(refine(string(), 'min', value => value.length >= 3 || 'too short'));
      expect(validateNode(validator, node, 'ab')).toBe('too short');
      expect(validateNode(validator, node, 'abc')).toBeUndefined();
    });

    it('validates the data with a returned yup schema asynchronously', async () => {
      const validator: Validator = () => yup.string().min(3, 'too short');
      await expect(validateNode(validator, node, 'ab')).resolves.toBe('too short');
      await expect(validateNode(validator, node, 'abc')).resolves.toBeUndefined();
    });

    it('supports async validator functions', async () => {
      await expect(validateNode(async () => 'bad', node, 'x')).resolves.toBe('bad');
      await expect(validateNode(async () => z.string(), node, 1)).resolves.toBeTypeOf('string');
    });

    it('ignores a schema of the whole form data', () => {
      expect(validateNode(z.string(), node, 1)).toBeUndefined();
    });
  });

  describe('validateWithSchema', () => {
    it('returns no issues for valid data', () => {
      expect(validateWithSchema(z.string(), 'x')).toEqual([]);
    });

    it('validates a clone of the data', () => {
      const data = { a: 'x' };
      const validate = vi.fn(() => ({ value: data }));
      validateWithSchema({ '~standard': { version: 1, vendor: 'x', validate } }, data);
      expect(validate.mock.calls[0]).toEqual([{ a: 'x' }]);
      expect((validate.mock.calls[0] as unknown[])[0]).not.toBe(data);
    });
  });

  describe('allValid', () => {
    it('is synchronous for synchronous results', () => {
      expect(allValid([undefined, undefined])).toBe(true);
      expect(allValid([undefined, 'bad'])).toBe(false);
    });

    it('resolves async results', async () => {
      await expect(allValid([undefined, Promise.resolve(undefined)])).resolves.toBe(true);
      await expect(allValid([undefined, Promise.resolve('bad')])).resolves.toBe(false);
    });
  });

  describe('isNodeValid', () => {
    const components: FormComponents = {
      text: { label: 'Text', component: {}, propsSchema: [{ type: 'text', name: '$name' }, { type: 'text', name: 'label' }] },
    };
    const internalNode: InternalSchemaNode = { _id: '1', type: 'text', name: 'a', props: { label: '' } };

    it('validates the props with schemas returned by the validator', () => {
      const validator: Validator = () => z.string().min(1);
      expect(isNodeValid(internalNode, validator, components)).toBe(false);
      expect(isNodeValid({ ...internalNode, props: { label: 'x' } }, validator, components)).toBe(true);
    });

    it('treats the props as valid for a schema of the whole form data', () => {
      expect(isNodeValid(internalNode, z.object({}), components)).toBe(true);
    });

    it('validates async', async () => {
      await expect(isNodeValid(internalNode, async () => 'bad', components)).resolves.toBe(false);
    });
  });

  describe('issuePath', () => {
    it('normalizes keys and path segments', () => {
      expect(issuePath({ message: '', path: ['a', { key: 0 }, { key: 'b' }, 1] })).toEqual(['a', 0, 'b', 1]);
    });

    it('is empty without a path', () => {
      expect(issuePath({ message: '' })).toEqual([]);
    });
  });

  describe('issueMessageAt', () => {
    const issues = [
      { message: 'nested', path: ['tags', 0] },
      { message: 'items', path: ['items', '1', 'title'] },
      { message: 'exact', path: ['tags'] },
    ];

    it('prefers the issue of the exact path', () => {
      expect(issueMessageAt(issues, ['tags'], true)).toBe('exact');
    });

    it('compares list indices as strings', () => {
      expect(issueMessageAt(issues, ['items', 1, 'title'], true)).toBe('items');
    });

    it('includes nested issues only if asked to', () => {
      expect(issueMessageAt(issues, ['items'], false)).toBeUndefined();
      expect(issueMessageAt(issues, ['items'], true)).toBe('items');
    });

    it('is undefined without matching issues', () => {
      expect(issueMessageAt(issues, ['other'], true)).toBeUndefined();
    });
  });

  describe('useMaybeAsync', () => {
    it('updates synchronously for synchronous results', () => {
      const source = ref(1);
      const result = useMaybeAsync(() => source.value * 2, 0);
      expect(result.value).toBe(2);
      source.value = 2;
      expect(result.value).toBe(4);
    });

    it('keeps the previous value while a promise is pending', async () => {
      const source = ref('a');
      const result = useMaybeAsync(() => validateWithSchema(asyncSchema(source.value || undefined), undefined), []);
      await nextTick();
      await Promise.resolve();
      expect(result.value).toEqual([{ message: 'a' }]);
      source.value = '';
      expect(result.value).toEqual([{ message: 'a' }]);
      await Promise.resolve();
      await Promise.resolve();
      expect(result.value).toEqual([]);
    });

    it('drops results of outdated promises', async () => {
      const resolvers: Array<(value: string) => void> = [];
      const source = ref(0);
      const result = useMaybeAsync(() => {
        void source.value;
        return new Promise<string>(resolve => resolvers.push(resolve));
      }, 'initial');
      source.value = 1;
      resolvers[1]('new');
      await Promise.resolve();
      resolvers[0]('old');
      await Promise.resolve();
      expect(result.value).toBe('new');
    });
  });

  describe('fromSuperstruct', () => {
    const struct = object({ name: string(), items: array(object({ count: number() })) });

    it('returns the value of valid data', () => {
      const data = { name: 'x', items: [{ count: 1 }] };
      expect(fromSuperstruct(struct)['~standard'].validate(data)).toEqual({ value: data });
    });

    it('returns all failures as issues with their path', () => {
      const result = fromSuperstruct(struct)['~standard'].validate({ name: 1, items: [{ count: 'x' }] }) as StandardSchemaV1.FailureResult;
      expect(result.issues.map(issue => issue.path)).toEqual([['name'], ['items', 0, 'count']]);
      expect(result.issues[0].message).toContain('Expected a string');
    });

    it('identifies as superstruct', () => {
      expect(fromSuperstruct(struct)['~standard']).toMatchObject({ version: 1, vendor: 'superstruct' });
    });
  });
});
