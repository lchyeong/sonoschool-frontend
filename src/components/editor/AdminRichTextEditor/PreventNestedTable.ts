import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const TABLE_NODE_NAME = 'table';
const preventNestedTablePluginKey = new PluginKey('preventNestedTable');

export const countNestedTables = (document: ProseMirrorNode): number => {
  let nestedTableCount = 0;

  document.descendants((node, position) => {
    if (node.type.name !== TABLE_NODE_NAME) {
      return;
    }

    const $position = document.resolve(position);

    for (let depth = $position.depth; depth > 0; depth -= 1) {
      if ($position.node(depth).type.name === TABLE_NODE_NAME) {
        nestedTableCount += 1;
        break;
      }
    }
  });

  return nestedTableCount;
};

const PreventNestedTable = Extension.create({
  name: 'preventNestedTable',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        filterTransaction: (transaction, state) => {
          if (!transaction.docChanged) {
            return true;
          }

          return countNestedTables(transaction.doc) <= countNestedTables(state.doc);
        },
        key: preventNestedTablePluginKey,
      }),
    ];
  },
});

export default PreventNestedTable;
