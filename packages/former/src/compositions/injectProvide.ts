import type { InjectionKey, Ref } from 'vue';
import type { DataScope, FieldData, FormComponents, FormData, InternalSchemaNode, InternalShowIfPredicate, Mode, Texts } from '~/types';
import { getCurrentInstance, inject as vueInject, provide as vueProvide } from 'vue';

export type InjectKeys = {
  mode: Ref<Mode>;
  formId: Ref<string>;
  schema: Ref<InternalSchemaNode[]>;
  data: Ref<FormData | FieldData>;
  components: Ref<FormComponents>;
  selectedNode: Ref<InternalSchemaNode | undefined>;
  // the parents of the selected node from the top of the form down to it (see `getNodePath`)
  selectedNodePath: Ref<InternalSchemaNode[]>;
  validityMap: Ref<Record<string, boolean | undefined>>;
  // whether the props of each node are valid by its id, or the message of a failing validation (see `useSchema`)
  propsValidity: Ref<Record<string, boolean | string>>;
  showIf?: InternalShowIfPredicate;
  // the scopes of data the nodes are relative to (e.g. groups or repeater items), closest first,
  // to find the issues of nodes and passed to the validation of components
  dataScopes?: Ref<DataScope[]>;
  texts: Ref<Texts>;
  node: Ref<InternalSchemaNode>;
  hasDataKey?: Ref<boolean>;
  isShown?: Ref<boolean>;
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
