import type { InternalSchemaNode, SchemaNode } from './types';
import {} from 'vue';

function addIdToNode(_node: InternalSchemaNode | SchemaNode): InternalSchemaNode {
  const node = { ..._node } as InternalSchemaNode;

  if (!node._id) {
    node._id = nanoid();
  }

  if (node.children) {
    node.children = node.children.map(addIdToNode);
  }

  return node;
}

export function toInternalSchema(schema: SchemaNode[]): InternalSchemaNode[] {
  return schema.map(addIdToNode);
}

function removeIdFromNode(_node: InternalSchemaNode | SchemaNode): SchemaNode {
  const node = { ..._node } as SchemaNode & { _id?: string };

  delete node._id;

  if (node.children) {
    node.children = node.children.map(removeIdFromNode);
  }

  return node;
}

export function toSchema(schema: InternalSchemaNode[]): SchemaNode[] {
  return schema.map(removeIdFromNode);
}

export function replaceNode(schema: InternalSchemaNode[], node: InternalSchemaNode): void {
  for (let i = 0; i < schema.length; i++) {
    if (schema[i]._id === node._id) {
      schema.splice(i, 1, node);
      return;
    }

    const children = schema[i].children;
    if (children) {
      replaceNode(children, node);
    }
  }
}

export function deleteNode(schema: InternalSchemaNode[], node: InternalSchemaNode): void {
  for (let i = 0; i < schema.length; i++) {
    if (schema[i]._id === node._id) {
      schema.splice(i, 1);
      return;
    }

    const children = schema[i].children;
    if (children) {
      deleteNode(children, node);
    }
  }
}

// port from nanoid
// https://github.com/ai/nanoid
const urlAlphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
function nanoid(size = 21) {
  let id = '';
  let i = size;
  while (i--) id += urlAlphabet[(Math.random() * 64) | 0];
  return id;
}
