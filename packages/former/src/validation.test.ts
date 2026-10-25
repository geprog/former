import type { FormComponents, FormFieldType } from '~/types';
import * as v from 'valibot';
import { describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import * as yup from 'yup';
import { z } from 'zod';
import {
  allValid,
  type StandardSchemaV1,
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
      validate: async value => (message ? { issues: [{ message }] } : { value }),
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
      validateWithSchema({ '~standard': { version: 1, vendor: 'x', validate } }, data);
      expect(validate.mock.calls[0]).toEqual([{ a: 'x' }]);
      expect((validate.mock.calls[0] as unknown[])[0]).not.toBe(data);
    });
  });

  describe('validateComponent', () => {
    const context = { node, path: ['a'], scopes: [{ data: {}, path: [] }] };

    it('validates the data with the schema of the component', () => {
      const components: FormComponents = {
        text: { label: 'Text', component: {}, propsSchema: [], validation: ({ min }) => z.string().min(min, 'too short') },
      };
      expect(validateComponent(components, { ...node, props: { min: 3 } }, 'ab', context)).toBe('too short');
      expect(validateComponent(components, { ...node, props: { min: 3 } }, 'abc', context)).toBeUndefined();
    });

    it('passes the props and the context to the validation', () => {
      const validation = vi.fn(() => undefined);
      const components: FormComponents = { text: { label: 'Text', component: {}, propsSchema: [], validation } };
      validateComponent(components, { ...node, props: { min: 3 } }, 'x', context);
      expect(validation).toHaveBeenCalledWith({ min: 3 }, context);
    });

    function componentsWith(validation: FormFieldType['validation']): FormComponents {
      return { text: { label: 'Text', component: {}, propsSchema: [], validation } };
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
      const components = componentsWith(() => z.object({ a: z.string('first'), b: z.string('second') }));
      expect(validateComponent(components, node, {}, context)).toBe('first');
    });

    it('is valid without a validation or an unknown component', () => {
      expect(validateComponent({ text: { label: 'Text', component: {}, propsSchema: [] } }, node, 'x', context)).toBeUndefined();
      expect(validateComponent({}, node, 'x', context)).toBeUndefined();
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
});
