import { getCurrentInstance, inject as vueInject, type InjectionKey, provide as vueProvide, type Ref } from 'vue';
import type { FormData, FormFieldType, InternalSchemaNode, SchemaNode } from '~/types';

export type InjectKeys = {
  edit: Ref<boolean>;
  schema: Ref<InternalSchemaNode[]>;
  data: Ref<FormData>;
  components: { [key: string]: FormFieldType };
  selectedNode: Ref<InternalSchemaNode | undefined>;
  showIf?: (node: SchemaNode, nodePath: string[], data: FormData) => boolean;
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
