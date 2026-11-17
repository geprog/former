import type { StandardSchemaV1 } from './validation';
import type { FormComponents, FormFieldType } from '~/types';
import { flushPromises } from '@vue/test-utils';
import * as v from 'valibot';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import * as yup from 'yup';
import { z } from 'zod';
import {
  errorMessage,
  every,
  isPromiseLike,

  useMaybeAsync,
  validateComponent,
  validateWithSchema,
} from './validation';

const node = { type: 'text', name: 'a' };

function asyncSchema(message?: string): StandardSchemaV1 {
  return {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate: async value => (message
        ? {
            issues: [
              { message },
            ],
          }
        : { value }),
    },
  };
}

describe('validation', () => {
  describe('validateWithSchema', () => {
    it('returns no issues for valid data', () => {
      expect(validateWithSchema(z.string(), 'x')).toEqual([]);
    });

    it('validates a clone of the data', () => {
      const data = { a: 'x' };
      const validate = vi.fn(() => ({ value: data }));
      validateWithSchema({
        '~standard': { version: 1, vendor: 'x', validate },
      }, data);
      expect(validate.mock.calls[0]).toEqual([
        { a: 'x' },
      ]);
      expect((validate.mock.calls[0] as unknown[])[0]).not.toBe(data);
    });

    it('keeps values which can\'t be cloned, e.g. files', () => {
      const file = new Blob(['x']);
      const validate = vi.fn(() => ({ value: file }));
      validateWithSchema({
        '~standard': { version: 1, vendor: 'x', validate },
      }, file);
      validateWithSchema({
        '~standard': { version: 1, vendor: 'x', validate },
      }, { file });
      expect(validate.mock.calls).toEqual([
        [file],
        [
          { file },
        ],
      ]);
      expect((validate.mock.calls[0] as unknown[])[0]).toBe(file);
    });

    it('validates a copy of dates', () => {
      const date = new Date('2026-01-01');
      const validate = vi.fn(() => ({ value: date }));
      validateWithSchema({
        '~standard': { version: 1, vendor: 'x', validate },
      }, { date });
      const validated = (validate.mock.calls[0] as unknown[])[0] as { date: Date };
      expect(validated.date).toEqual(date);
      expect(validated.date).not.toBe(date);
    });
  });

  describe('validateComponent', () => {
    const context = {
      node,
      path: ['a'],
      scopes: [
        { data: {}, path: [] },
      ],
    };

    it('validates the data with the schema of the component', () => {
      const components: FormComponents = {
        text: {
          label: 'Text',
          component: {},
          propsSchema: [],
          validation: ({ min }) => z.string().min(min, 'too short'),
        },
      };
      expect(validateComponent(components, {
        ...node,
        props: { min: 3 },
      }, 'ab', context)).toBe('too short');
      expect(validateComponent(components, {
        ...node,
        props: { min: 3 },
      }, 'abc', context)).toBeUndefined();
    });

    it('passes the props and the context to the validation', () => {
      const validation = vi.fn(() => undefined);
      const components: FormComponents = {
        text: {
          label: 'Text',
          component: {},
          propsSchema: [],
          validation,
        },
      };
      validateComponent(components, {
        ...node,
        props: { min: 3 },
      }, 'x', context);
      expect(validation).toHaveBeenCalledWith({ min: 3 }, context);
    });

    function componentsWith(validation: FormFieldType['validation']): FormComponents {
      return {
        text: {
          label: 'Text',
          component: {},
          propsSchema: [],
          validation,
        },
      };
    }

    it('validates the data with a valibot schema', () => {
      const components = componentsWith(() => v.pipe(v.string(), v.minLength(3, 'too short')));
      expect(validateComponent(components, node, 'ab', context)).toBe('too short');
      expect(validateComponent(components, node, 'abc', context)).toBeUndefined();
    });

    it('validates the data with a yup schema asynchronously', async () => {
      const components = componentsWith(() => yup.string().min(3, 'too short'));
      await expect(validateComponent(components, node, 'ab', context)).resolves.toBe('too short');
      await expect(validateComponent(components, node, 'abc', context)).resolves.toBeUndefined();
    });

    it('is the message of the first issue', () => {
      const components = componentsWith(() => z.object({
        a: z.string('first'),
        b: z.string('second'),
      }));
      expect(validateComponent(components, node, {}, context)).toBe('first');
    });

    it('passes cleared props (`null`) as not set to the validation', () => {
      const validation = vi.fn(() => undefined);
      const components: FormComponents = {
        text: {
          label: 'Text',
          component: {},
          propsSchema: [],
          validation,
        },
      };
      validateComponent(components, {
        ...node,
        props: { min: null, max: 3 },
      }, 'x', context);
      expect(validation).toHaveBeenCalledWith({ max: 3 }, context);
    });

    it('is valid without a validation or an unknown component', () => {
      expect(validateComponent({
        text: { label: 'Text', component: {}, propsSchema: [] },
      }, node, 'x', context)).toBeUndefined();
      expect(validateComponent({}, node, 'x', context)).toBeUndefined();
    });
  });

  describe('every', () => {
    const isValid = (message: string | undefined) => message === undefined;

    it('is synchronous for synchronous results', () => {
      expect(every([undefined, undefined], isValid)).toBe(true);
      expect(every([undefined, 'bad'], isValid)).toBe(false);
    });

    it('resolves async results', async () => {
      await expect(every([
        undefined,
        Promise.resolve(undefined),
      ], isValid)).resolves.toBe(true);
      await expect(every([
        undefined,
        Promise.resolve('bad'),
      ], isValid)).resolves.toBe(false);
    });
  });

  describe('isPromiseLike', () => {
    it('detects promises and other thenables', () => {
      expect(isPromiseLike(Promise.resolve())).toBe(true);
      expect(isPromiseLike({
        then: () => {},
      })).toBe(true);
      expect(isPromiseLike(undefined)).toBe(false);
      expect(isPromiseLike(null)).toBe(false);
      expect(isPromiseLike('x')).toBe(false);
    });

    it('validates with a schema returning a thenable', async () => {
      const schema: StandardSchemaV1 = {
        '~standard': {
          version: 1,
          vendor: 'test',
          validate: () => ({
            then: (resolve: (result: StandardSchemaV1.Result<unknown>) => void) => resolve({
              issues: [
                { message: 'bad' },
              ],
            }),
          }) as any,
        },
      };
      await expect(validateWithSchema(schema, 'x')).resolves.toEqual([
        { message: 'bad' },
      ]);
    });
  });

  describe('useMaybeAsync', () => {
    it('updates synchronously for synchronous results', () => {
      const source = ref(1);
      const { result, isPending } = useMaybeAsync(() => source.value * 2, 0, () => -1);
      expect(result.value).toBe(2);
      source.value = 2;
      expect(result.value).toBe(4);
      expect(isPending.value).toBe(false);
    });

    it('keeps the previous value while a promise is pending', async () => {
      const source = ref('a');
      const { result, isPending } = useMaybeAsync(() => validateWithSchema(asyncSchema(source.value || undefined), undefined), [], () => []);
      expect(isPending.value).toBe(true);
      await flushPromises();
      expect(result.value).toEqual([
        { message: 'a' },
      ]);
      expect(isPending.value).toBe(false);
      source.value = '';
      expect(result.value).toEqual([
        { message: 'a' },
      ]);
      expect(isPending.value).toBe(true);
      await flushPromises();
      expect(result.value).toEqual([]);
      expect(isPending.value).toBe(false);
    });

    it('drops results of outdated promises', async () => {
      const resolvers: Array<(value: string) => void> = [];
      const source = ref(0);
      const { result, isPending } = useMaybeAsync(() => {
        void source.value;
        return new Promise<string>(resolve => resolvers.push(resolve));
      }, 'initial', () => 'error');
      source.value = 1;
      resolvers[1]('new');
      await flushPromises();
      resolvers[0]('old');
      await flushPromises();
      expect(result.value).toBe('new');
      expect(isPending.value).toBe(false);
    });

    it('turns rejected promises and thrown errors into results', async () => {
      const source = ref<'reject' | 'throw'>('reject');
      const { result, isPending } = useMaybeAsync(() => {
        if (source.value === 'throw') {
          throw new Error('thrown');
        }
        return Promise.reject(new Error('rejected'));
      }, 'initial', errorMessage);
      await flushPromises();
      expect(result.value).toBe('rejected');
      expect(isPending.value).toBe(false);
      source.value = 'throw';
      await flushPromises();
      expect(result.value).toBe('thrown');
    });
  });
});
