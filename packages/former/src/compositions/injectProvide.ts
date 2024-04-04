import type { FormKitSchemaNode } from '@formkit/core';
import {
  getCurrentInstance,
  inject as vueInject,
  type InjectionKey,
  provide as vueProvide,
  type Ref,
  type DefineComponent,
} from 'vue';

export type InjectKeys = {
  mode: Ref<'edit' | 'preview'>;
  schema: Ref<FormKitSchemaNode[]>;
  // library: {
  //   [key: string]: {
  //     form: DefineComponent;
  //     options: DefineComponent;
  //   };
  // };
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
