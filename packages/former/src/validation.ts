import type { FieldData, FormComponents, FormData, InternalSchemaNode, SchemaNode, Validator } from '~/types';
import { cloneDeep } from 'lodash';
import { type Ref, shallowRef, toRaw, watch } from 'vue';

// The Standard Schema interface (https://standardschema.dev), copied as recommended by the spec
// so that former works with any compliant library (e.g. Zod, Valibot, ArkType, Yup) without depending on one
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

// eslint-disable-next-line ts/no-namespace
export declare namespace StandardSchemaV1 {
  export interface Props<Input = unknown, Output = Input> {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown, options?: Options | undefined) => Result<Output> | Promise<Result<Output>>;
    readonly types?: Types<Input, Output> | undefined;
  }

  export type Result<Output> = SuccessResult<Output> | FailureResult;

  export interface SuccessResult<Output> {
    readonly value: Output;
    readonly issues?: undefined;
  }

  export interface Options {
    readonly libraryOptions?: Record<string, unknown> | undefined;
  }

  export interface FailureResult {
    readonly issues: ReadonlyArray<Issue>;
  }

  export interface Issue {
    readonly message: string;
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }

  export interface PathSegment {
    readonly key: PropertyKey;
  }

  export interface Types<Input = unknown, Output = Input> {
    readonly input: Input;
    readonly output: Output;
  }

  export type InferInput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['input'];

  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['output'];
}

export type MaybePromise<T> = T | Promise<T>;

export type DataPath = ReadonlyArray<string | number>;

export function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  // schemas can be functions as well (e.g. ArkType types)
  return (typeof value === 'object' || typeof value === 'function')
    && value !== null
    && '~standard' in value
    && typeof (value as StandardSchemaV1)['~standard']?.validate === 'function';
}

function then<T, R>(value: MaybePromise<T>, fn: (value: T) => MaybePromise<R>): MaybePromise<R> {
  return value instanceof Promise ? value.then(fn) : fn(value);
}

// the data is cloned, so that a schema validating asynchronously still tracks all reactive dependencies
// and schema libraries don't get to see (or mutate) the reactive proxies
export function validateWithSchema(schema: StandardSchemaV1, data: unknown): MaybePromise<ReadonlyArray<StandardSchemaV1.Issue>> {
  // schemas mustn't be reactive, e.g. zod schemas break when they are proxied
  return then(toRaw(schema)['~standard'].validate(cloneDeep(data)), result => result.issues ?? []);
}

/**
 * Validates the data of a node with a `Validator` function.
 * Returns the error message or `undefined` if the data is valid, or a promise of it for async validation.
 */
export function validateNode(validator: Validator | StandardSchemaV1, node: SchemaNode, data: FieldData | FormData): MaybePromise<string | undefined> {
  // a schema for the whole form data is validated once by `Former` instead of per node
  if (isStandardSchema(validator)) {
    return undefined;
  }
  return then(validator(node, data), (result) => {
    if (isStandardSchema(result)) {
      return then(validateWithSchema(result, data), issues => issues[0]?.message);
    }
    return result === true || result === undefined ? undefined : result;
  });
}

export function allValid(results: MaybePromise<string | undefined>[]): MaybePromise<boolean> {
  if (results.some(result => result instanceof Promise)) {
    return Promise.all(results).then(messages => messages.every(message => message === undefined));
  }
  return results.every(result => result === undefined);
}

// whether the props of the node are valid (used to validate the schema in build mode)
export function isNodeValid(node: InternalSchemaNode, validator: Validator | StandardSchemaV1, components: FormComponents): MaybePromise<boolean> {
  const component = components[node.type];
  // nodes of unknown components (e.g. after switching the components) can't be rendered or validated
  if (!component) {
    return false;
  }
  return allValid(component.propsSchema.map(propsNode =>
    validateNode(validator, propsNode, propsNode.name === '$name' ? node.name : (node.props || {})[propsNode.name || ''])));
}

export function issuePath(issue: StandardSchemaV1.Issue): DataPath {
  return (issue.path ?? []).map((segment) => {
    const key = typeof segment === 'object' && segment !== null ? segment.key : segment;
    return typeof key === 'number' ? key : String(key);
  });
}

function startsWith(path: DataPath, prefix: DataPath) {
  // indices of lists may be numbers or strings depending on the schema library
  return prefix.length <= path.length && prefix.every((key, index) => String(key) === String(path[index]));
}

/**
 * The error message of the issues for the data at `path`.
 * Issues for nested data (e.g. an item of a multi select) are only attributed to leaf nodes,
 * as nodes with children (e.g. groups or repeaters) render nodes that show these issues themselves.
 */
export function issueMessageAt(issues: ReadonlyArray<StandardSchemaV1.Issue>, path: DataPath, includeNested: boolean): string | undefined {
  const paths = issues.map(issuePath);
  const exactIndex = paths.findIndex(issuePath => issuePath.length === path.length && startsWith(issuePath, path));
  if (exactIndex !== -1) {
    return issues[exactIndex].message;
  }
  if (includeNested) {
    return issues[paths.findIndex(issuePath => startsWith(issuePath, path))]?.message;
  }
  return undefined;
}

/**
 * A ref with the result of `getter`, which may be a promise (e.g. for async schemas).
 * While a promise is pending the previous result is kept, results of outdated promises are dropped.
 */
export function useMaybeAsync<T>(getter: () => MaybePromise<T>, initial: T): Ref<T> {
  const result = shallowRef<T>(initial);
  let latestRun = 0;
  watch(getter, (value) => {
    const run = ++latestRun;
    if (value instanceof Promise) {
      value.then((resolved) => {
        if (run === latestRun) {
          result.value = resolved;
        }
      });
    }
    else {
      result.value = value;
    }
  }, { immediate: true, flush: 'sync' });
  return result;
}

type SuperstructFailure = { message: string; path: ReadonlyArray<PropertyKey> };
type SuperstructStruct<T> = {
  validate: (value: unknown, options?: { coerce?: boolean }) => [{ failures: () => SuperstructFailure[] } | undefined, T | undefined];
};

/**
 * Wraps a Superstruct struct as a Standard Schema, as Superstruct doesn't implement the spec itself.
 * Coercions (e.g. `defaulted`) are applied to the output, like `create` does.
 */
export function fromSuperstruct<T>(struct: SuperstructStruct<T>): StandardSchemaV1<unknown, T> {
  return {
    '~standard': {
      version: 1,
      vendor: 'superstruct',
      validate(value) {
        const [error, output] = struct.validate(value, { coerce: true });
        if (error) {
          return { issues: error.failures().map(failure => ({ message: failure.message, path: failure.path })) };
        }
        return { value: output as T };
      },
    },
  };
}
