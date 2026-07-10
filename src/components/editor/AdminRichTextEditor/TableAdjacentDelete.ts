import { Extension, type Editor } from '@tiptap/core';
import type { ResolvedPos } from '@tiptap/pm/model';

type DeleteDirection = 'backward' | 'forward';

interface TableRange {
  from: number;
  to: number;
}

const TABLE_NODE_NAME = 'table';

const isInsideTable = ($cursor: ResolvedPos): boolean => {
  for (let depth = $cursor.depth; depth > 0; depth -= 1) {
    if ($cursor.node(depth).type.name === TABLE_NODE_NAME) {
      return true;
    }
  }

  return false;
};

const resolveTableRangeAtBoundary = (
  $boundary: ResolvedPos,
  direction: DeleteDirection,
): TableRange | null => {
  const adjacentNode = direction === 'forward' ? $boundary.nodeAfter : $boundary.nodeBefore;

  if (!adjacentNode || adjacentNode.type.name !== TABLE_NODE_NAME) {
    return null;
  }

  return direction === 'forward'
    ? {
        from: $boundary.pos,
        to: $boundary.pos + adjacentNode.nodeSize,
      }
    : {
        from: $boundary.pos - adjacentNode.nodeSize,
        to: $boundary.pos,
      };
};

const resolveAdjacentTableRange = (
  $cursor: ResolvedPos,
  direction: DeleteDirection,
): TableRange | null => {
  if ($cursor.parent.type.spec.isolating) {
    return null;
  }

  for (let depth = $cursor.depth - 1; depth >= 0; depth -= 1) {
    const parent = $cursor.node(depth);
    const childIndex = $cursor.index(depth);
    const hasSibling =
      direction === 'forward' ? childIndex + 1 < parent.childCount : childIndex > 0;

    if (hasSibling) {
      const boundaryPosition =
        direction === 'forward' ? $cursor.after(depth + 1) : $cursor.before(depth + 1);
      const $boundary = $cursor.doc.resolve(boundaryPosition);

      return resolveTableRangeAtBoundary($boundary, direction);
    }

    if (parent.type.spec.isolating) {
      return null;
    }
  }

  return null;
};

const deleteAdjacentTable = (editor: Editor, direction: DeleteDirection): boolean => {
  const { $from, empty } = editor.state.selection;

  if (!editor.isEditable || !empty || isInsideTable($from)) {
    return false;
  }

  let tableRange: TableRange | null;

  if ($from.parent.isTextblock) {
    const isAtRequiredBoundary =
      direction === 'forward'
        ? $from.parentOffset === $from.parent.content.size
        : $from.parentOffset === 0;

    if (!isAtRequiredBoundary) {
      return false;
    }

    tableRange = resolveAdjacentTableRange($from, direction);
  } else {
    tableRange = resolveTableRangeAtBoundary($from, direction);
  }

  if (!tableRange) {
    return false;
  }

  return editor.chain().deleteRange(tableRange).scrollIntoView().run();
};

const TableAdjacentDelete = Extension.create({
  name: 'tableAdjacentDelete',
  priority: 110,

  addKeyboardShortcuts() {
    return {
      Backspace: () => deleteAdjacentTable(this.editor, 'backward'),
      Delete: () => deleteAdjacentTable(this.editor, 'forward'),
    };
  },
});

export default TableAdjacentDelete;
