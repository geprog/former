export type SchemaNode<Props = { [key: string]: any }> = {
  type: string;
  name: string;
  props?: Props & {
    label?: string;
  };
  children?: SchemaNode<Props>[];
  if?: string;
};
