import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref, type Ref } from 'vue';
import { inject, provide } from './injectProvide';

describe('injectProvide', () => {
  describe('inject', () => {
    it('returns undefined when there is no current instance', () => {
      expect(inject('data')).toBeUndefined();
    });

    it('returns the injected value when the key is provided in the current instance', () => {
      const providedData = ref({ field: 'value' });
      let injectedData: Ref<unknown> | undefined;

      const Child = defineComponent({
        setup() {
          injectedData = inject('data');
          return () => null;
        },
      });

      const Parent = defineComponent({
        setup() {
          provide('data', providedData);
          return () => [h(Child)];
        },
      });

      mount(Parent);
      expect(injectedData).toBe(providedData);
    });

    it('throws with a message naming the key when the value is undefined and failIfNotProvided is true (default)', () => {
      const Child = defineComponent({
        setup() {
          inject('data');
          return () => null;
        },
      });

      expect(() => mount(Child)).toThrow('Please provide a value for data');
    });

    it('returns undefined when the value is undefined and failIfNotProvided is false', () => {
      let injectedData: Ref<unknown> | undefined;

      const Child = defineComponent({
        setup() {
          injectedData = inject('data', false);
          return () => null;
        },
      });

      mount(Child);
      expect(injectedData).toBeUndefined();
    });

    it('does not throw for missing optional keys when failIfNotProvided is false', () => {
      const Child = defineComponent({
        setup() {
          expect(() => inject('showIf', false)).not.toThrow();
          return () => null;
        },
      });

      expect(() => mount(Child)).not.toThrow();
    });
  });

  describe('provide', () => {
    it('makes a value available to inject in descendant setup (smoke / integration)', () => {
      const providedData = ref({ name: 'former' });
      let injectedData: Ref<unknown> | undefined;

      const Child = defineComponent({
        setup() {
          injectedData = inject('data');
          return () => null;
        },
      });

      const Parent = defineComponent({
        setup() {
          provide('data', providedData);
          return () => [h(Child)];
        },
      });

      mount(Parent);
      expect(injectedData).toBe(providedData);
    });
  });
});
