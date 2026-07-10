import { Editor } from '@tiptap/core';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';

import PreventNestedTable, { countNestedTables } from './PreventNestedTable';

const TABLE_HTML = '<table><tbody><tr><td><p>표 셀</p></td></tr></tbody></table>';
const editors: Editor[] = [];

const createEditor = (content: string): Editor => {
  const editor = new Editor({
    content,
    element: document.createElement('div'),
    extensions: [StarterKit, Table, TableRow, TableHeader, TableCell, PreventNestedTable],
  });

  editors.push(editor);
  return editor;
};

const findTextPosition = (editor: Editor, text: string): number => {
  const textPositions: number[] = [];

  editor.state.doc.descendants((node, position) => {
    if (node.isTextblock && node.textContent === text) {
      textPositions.push(position + 1);
    }
  });

  const textPosition = textPositions.at(0);

  if (textPosition === undefined) {
    throw new Error(`텍스트 위치를 찾을 수 없습니다: ${text}`);
  }

  return textPosition;
};

const countAllTables = (editor: Editor): number => {
  let tableCount = 0;

  editor.state.doc.descendants((node) => {
    if (node.type.name === 'table') {
      tableCount += 1;
    }
  });

  return tableCount;
};

afterEach(() => {
  editors.splice(0).forEach((editor) => {
    editor.destroy();
  });
});

describe('PreventNestedTable', () => {
  it('표 셀 안에서 새 표를 넣는 문서 변경을 차단한다', () => {
    const editor = createEditor(TABLE_HTML);
    editor.commands.setTextSelection(findTextPosition(editor, '표 셀'));

    editor.commands.insertTable({ cols: 2, rows: 2, withHeaderRow: true });

    expect(countAllTables(editor)).toBe(1);
    expect(countNestedTables(editor.state.doc)).toBe(0);
  });

  it('표 바깥의 일반 문단에서는 새 표를 정상적으로 만든다', () => {
    const editor = createEditor('<p>일반 문단</p>');
    editor.commands.setTextSelection(findTextPosition(editor, '일반 문단'));

    editor.commands.insertTable({ cols: 2, rows: 2, withHeaderRow: true });

    expect(countAllTables(editor)).toBe(1);
    expect(countNestedTables(editor.state.doc)).toBe(0);
  });

  it('기존 문서에 들어 있던 중첩 표는 삭제해서 정리할 수 있다', () => {
    const editor = createEditor(`
      <table>
        <tbody>
          <tr>
            <td>
              <p>바깥 표</p>
              <table><tbody><tr><td><p>중첩 표</p></td></tr></tbody></table>
            </td>
          </tr>
        </tbody>
      </table>
    `);
    const nestedTableRanges: Array<{ from: number; to: number }> = [];

    editor.state.doc.descendants((node, position) => {
      if (node.type.name !== 'table') {
        return;
      }

      const $position = editor.state.doc.resolve(position);
      const hasTableAncestor = Array.from(
        { length: $position.depth },
        (_, index) => index + 1,
      ).some((depth) => $position.node(depth).type.name === 'table');

      if (hasTableAncestor) {
        nestedTableRanges.push({
          from: position,
          to: position + node.nodeSize,
        });
      }
    });

    const nestedTableRange = nestedTableRanges.at(0);

    expect(countNestedTables(editor.state.doc)).toBe(1);

    if (!nestedTableRange) {
      throw new Error('중첩 표 범위를 찾을 수 없습니다.');
    }

    editor.view.dispatch(editor.state.tr.delete(nestedTableRange.from, nestedTableRange.to));

    expect(countAllTables(editor)).toBe(1);
    expect(countNestedTables(editor.state.doc)).toBe(0);
  });
});
