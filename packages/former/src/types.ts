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

// `data` is `null` for a cleared field and `undefined` for a field that was never filled in
export type Validator = (node: SchemaNode, data: FieldData | FormData) => true | string;

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
  // whether the data of the component is a list whose items each render its children (e.g. a repeater)
  isList?: boolean;
  // the children the component renders, if it doesn't render all of them (e.g. columns only render the children of their columns)
  shownChildren?: (node: SchemaNode) => SchemaNode[];
};

export type FormComponents = { [key: string]: FormFieldType };

export type Texts = {
  dragHint: string;
};
