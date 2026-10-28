import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { DataScope, FieldData, FormComponents, FormData, InternalSchemaNode, SchemaNode, ValidationContext } from '~/types';
import { cloneDeepWith, isDate, isObject, isPlainObject } from 'lodash';
import { type Ref, shallowRef, toRaw, watch } from 'vue';
import { dataOfNode, dataPathOfNode, dataScopesOfChildren, dataScopesOfListItem, nodeChildren, propsOf } from '~/utils';

// the Standard Schema (https://standardschema.dev) implemented by e.g. Zod, Valibot, ArkType and Yup
export type { StandardSchemaV1 };

export type MaybePromise<T> = T | PromiseLike<T>;

// not only native promises, as schema libraries may return other thenables or promises of another realm
export function isPromiseLike<T>(value: MaybePromise<T>): value is PromiseLike<T> {
  return typeof (value as PromiseLike<T> | null)?.then === 'function';
}

function then<T, R>(value: MaybePromise<T>, fn: (value: T) => MaybePromise<R>): MaybePromise<R> {
  return isPromiseLike(value) ? Promise.resolve(value).then(fn) : fn(value);
}

// the data is cloned, so that a schema validating asynchronously still tracks all reactive dependencies
// and schema libraries don't get to see (or mutate) the reactive proxies,
// while other values which aren't plain (e.g. files) are kept, as lodash would turn the ones it can't clone into `{}`
function cloneData(data: unknown) {
  return cloneDeepWith(data, (value) => {
    if (isDate(value)) {
      return new Date(value.getTime());
    }
    return isObject(value) && !Array.isArray(value) && !isPlainObject(value) ? toRaw(value) : undefined;
  });
}

export function validateWithSchema(schema: StandardSchemaV1, data: unknown): MaybePromise<ReadonlyArray<StandardSchemaV1.Issue>> {
  // schemas mustn't be reactive, e.g. zod schemas break when they are proxied
  return then(toRaw(schema)['~standard'].validate(cloneData(data)), result => result.issues ?? []);
}

/**
 * Validates the data of a node with the `validation` of its component.
 * Returns the error message or `undefined` if the data is valid, or a promise of it for async validation.
 */
export function validateComponent(components: FormComponents, node: SchemaNode, data: FieldData | FormData, context: ValidationContext): MaybePromise<string | undefined> {
  const schema = components[node.type]?.validation?.(propsOf(node), context);
  return schema ? then(validateWithSchema(schema, data), issues => issues[0]?.message) : undefined;
}

// whether all results match the predicate, only asynchronous if one of the results is a promise
export function every<T>(results: MaybePromise<T>[], predicate: (result: T) => boolean): MaybePromise<boolean> {
  if (results.some(isPromiseLike)) {
    return Promise.all(results).then(resolved => resolved.every(predicate));
  }
  return (results as T[]).every(predicate);
}

// validates the nodes with their data like they are rendered (see `useNode` and `FormDataProvider`),
// returning whether all of them are valid
function areNodesValid(nodes: SchemaNode[], data: FieldData | FormData, scopes: DataScope[], components: FormComponents): MaybePromise<boolean> {
  return every(nodes.map((node) => {
    const nodeData = dataOfNode(node, data, components);
    const results: MaybePromise<string | boolean | undefined>[] = [
      validateComponent(components, node, nodeData, { node, path: dataPathOfNode(node, scopes, components), scopes }),
    ];
    // only the shown children are rendered, e.g. not the ones of removed columns
    const children = components[node.type]?.shownChildren?.(node) ?? nodeChildren(node);
    if (components[node.type]?.isList) {
      const items = Array.isArray(nodeData) ? nodeData : [];
      results.push(...items.map((item, index) =>
        areNodesValid(children, item, dataScopesOfListItem(node, item, index, scopes), components)));
    }
    else if (children.length) {
      results.push(areNodesValid(children, nodeData, dataScopesOfChildren(node, data, scopes, components), components));
    }
    return every(results, result => result === undefined || result === true);
  }), Boolean);
}

// whether the props of the node are valid (used to validate the schema in build mode)
export function isNodeValid(node: InternalSchemaNode, components: FormComponents): MaybePromise<boolean> {
  const component = components[node.type];
  // nodes of unknown components (e.g. after switching the components) can't be rendered or validated
  if (!component) {
    return false;
  }
  // the props are edited in a form of their own (see `FormNodeProps`), so they are the only scope of their validation
  const propsData: FormData = { $name: node.name, ...node.props };
  return areNodesValid(component.propsSchema, propsData, [{ data: propsData, path: [] }], components);
}

// the message of an error thrown by a validation, e.g. of an async schema failing to reach a server
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * A ref with the result of `getter`, which may be a promise (e.g. for async schemas).
 * While a promise is pending the previous result is kept and `isPending` is set, results of outdated promises are dropped.
 * A thrown error or rejected promise is turned into a result by `onError`.
 */
export function useMaybeAsync<T>(getter: () => MaybePromise<T>, initial: T, onError: (error: unknown) => T) {
  const result = shallowRef<T>(initial);
  const isPending = shallowRef(false);
  let latestRun = 0;
  // the result is wrapped, as vue would handle the rejection of a promise returned by the getter of the watcher itself
  watch(() => {
    try {
      return { value: getter() };
    }
    catch (error) {
      return { value: Promise.reject(error) as MaybePromise<T> };
    }
  }, ({ value }) => {
    const run = ++latestRun;
    if (isPromiseLike(value)) {
      isPending.value = true;
      Promise.resolve(value).then(resolved => resolved, onError).then((resolved) => {
        if (run === latestRun) {
          result.value = resolved;
          isPending.value = false;
        }
      });
    }
    else {
      result.value = value;
      isPending.value = false;
    }
  }, { immediate: true, flush: 'sync' });
  return { result: result as Ref<T>, isPending: isPending as Ref<boolean> };
}
