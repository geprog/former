import type { FieldData, FormComponents, FormData, InternalSchemaNode, InternalShowIfPredicate, Mode, SchemaNode, Texts, Validator } from '~/types';
import type { DataPath, StandardSchemaV1 } from '~/validation';
import { getCurrentInstance, type InjectionKey, type Ref, inject as vueInject, provide as vueProvide } from 'vue';

export type InjectKeys = {
  mode: Ref<Mode>;
  formId: Ref<string>;
  formerIsUpdating: Ref<boolean>;
  schema: Ref<InternalSchemaNode[]>;
  data: Ref<FormData | FieldData>;
  components: Ref<FormComponents>;
  selectedNode: Ref<InternalSchemaNode | undefined>;
  validityMap: Ref<Record<string, boolean | undefined>>;
  showIf?: InternalShowIfPredicate;
  validator: Validator | StandardSchemaV1;
  // the issues of validating the whole form data with a Standard Schema passed as `validator`
  formIssues?: Ref<ReadonlyArray<StandardSchemaV1.Issue>>;
  // the path of the data in the form data, to find the issues of a node
  dataPath?: Ref<DataPath>;
  texts: Ref<Texts>;
  node: Ref<InternalSchemaNode>;
  hasDataKey?: Ref<boolean>;
  isShown?: Ref<boolean>;
  rootData: Ref<FormData>;
  rootSchema: Ref<SchemaNode[]>;
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
