import { getCurrentInstance, type InjectionKey, type Ref, inject as vueInject, provide as vueProvide } from 'vue';
import type { FormData, FormFieldType, InternalSchemaNode, Mode, ShowIfPredicate, Validator } from '~/types';

export type InjectKeys = {
  mode: Ref<Mode>;
  formId: Ref<string>;
  schema: Ref<InternalSchemaNode[]>;
  data: Ref<FormData>;
  components: { [key: string]: FormFieldType };
  selectedNode: Ref<InternalSchemaNode | undefined>;
  validityMap: Ref<Record<string, boolean | undefined>>;
  showIf?: ShowIfPredicate;
  validator: Validator;
};

export function inject<T extends keyof InjectKeys>(key: T): InjectKeys[T];
export function inject<T extends keyof InjectKeys>(key: T, failIfNotProvided: true): InjectKeys[T];
export function inject<T extends keyof InjectKeys>(key: T, failIfNotProvided: false): InjectKeys[T] | undefined;
export function inject<T extends keyof InjectKeys>(key: T, failIfNotProvided = true): InjectKeys[T] | undefined {
  if (!getCurrentInstance()) {
    return undefined;
  }

  const value = vueInject<InjectKeys[T] | undefined>(key, undefined);
  if (failIfNotProvided && value === undefined) {
    throw new Error(`Please provide a value for ${key}`);
  }
  return value;
}

export function provide<T extends keyof InjectKeys>(
  key: T,
  value: T extends InjectionKey<infer V> ? V : InjectKeys[T],
): void {
  return vueProvide(key, value);
}
