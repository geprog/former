import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { Component, Raw } from 'vue';

export type NodeChildren<NodeType> = NodeType[] | { [category: string]: NodeType[] };

export type SchemaNode<Props = { [key: string]: any }> = {
  type: string;
  name?: string;
  props?: Props;
  children?: NodeChildren<SchemaNode<Props>>;
  showIf?: string;
};

export type InternalSchemaNode<Props = { [key: string]: any }> = Omit<SchemaNode<Props>, 'children'> & {
  _id: string;
  children?: NodeChildren<InternalSchemaNode<Props>>;
};

export type ShowIfPredicate = (node: SchemaNode, data: FormData, schema: SchemaNode[]) => boolean;

export type InternalShowIfPredicate = (node: SchemaNode) => boolean;

// the path of data in the form data, e.g. `['items', 1, 'title']`
export type DataPath = ReadonlyArray<string | number>;

// data the nodes inside of it are relative to, e.g. the form data, the data of a group or of a repeater item
export type DataScope = {
  // the node providing the data, e.g. the group or the repeater (unset for the form data)
  node?: SchemaNode;
  data: FieldData | FormData;
  path: DataPath;
};

export type ValidationContext = {
  node: SchemaNode;
  // the path of the data of the node in the form data
  path: DataPath;
  // all scopes containing the node from the closest to the form data,
  // e.g. `[repeater item, group, form]` for a field in a repeater item inside of a group
  scopes: DataScope[];
};

export type Mode = 'edit' | 'read' | 'build';

export type FormData = { [field: string]: FieldData | FormData };

export type FieldData = string | number | boolean | null | undefined | FormData[];

export type FormerProps = { id: string; mode: Mode; error?: string; };

type FormFieldComponent = Component<any, any, any>;

export type FormFieldType = {
  label: string;
  propsSchema: SchemaNode[];
  component: FormFieldComponent | Raw<FormFieldComponent>;
  internal?: boolean;
  // a schema validating the data of the component, built from the props of its node (e.g. `required`, `min` or `max`)
  validation?: (props: { [key: string]: any }, context: ValidationContext) => StandardSchemaV1 | undefined;
  // whether the data of the component is a list whose items each render its children (e.g. a repeater)
  isList?: boolean;
  // the children the component renders, if it doesn't render all of them (e.g. columns only render the children of their columns)
  shownChildren?: (node: SchemaNode) => SchemaNode[];
};

export type FormComponents = { [key: string]: FormFieldType };

export type Texts = {
  dragHint: string;
};
