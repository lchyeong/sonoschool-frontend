import { Editor } from '@tiptap/core';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import { GapCursor } from '@tiptap/pm/gapcursor';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';

import TableAdjacentDelete from './TableAdjacentDelete';

const TABLE_HTML = `
  <table>
    <tbody>
      <tr>
        <th><p>제목 셀</p></th>
      </tr>
      <tr>
        <td><p>본문 셀</p></td>
      </tr>
    </tbody>
  </table>
`;
const FIRST_TABLE_HTML = '<table><tbody><tr><td><p>첫 번째 표</p></td></tr></tbody></table>';
const SECOND_TABLE_HTML = '<table><tbody><tr><td><p>두 번째 표</p></td></tr></tbody></table>';

const editors: Editor[] = [];

const createEditor = (content: string): Editor => {
  const editor = new Editor({
    content,
    element: document.createElement('div'),
    extensions: [StarterKit, Table, TableRow, TableHeader, TableCell, TableAdjacentDelete],
  });

  editors.push(editor);
  return editor;
};

const findTextBoundary = (editor: Editor, text: string, edge: 'end' | 'start'): number => {
  const boundaryPositions: number[] = [];

  editor.state.doc.descendants((node, position) => {
    if (!node.isTextblock || node.textContent !== text) {
      return;
    }

    boundaryPositions.push(position + 1 + (edge === 'end' ? node.content.size : 0));
  });

  const boundaryPosition = boundaryPositions.at(0);

  if (boundaryPosition === undefined) {
    throw new Error(`텍스트 블록을 찾을 수 없습니다: ${text}`);
  }

  return boundaryPosition;
};

const getTopLevelNodeNames = (editor: Editor): string[] => {
  const nodeNames: string[] = [];

  editor.state.doc.forEach((node) => {
    nodeNames.push(node.type.name);
  });

  return nodeNames;
};

const findBoundaryAfterFirstTable = (editor: Editor): number => {
  const boundaryPositions: number[] = [];

  editor.state.doc.forEach((node, position) => {
    if (node.type.name === 'table') {
      boundaryPositions.push(position + node.nodeSize);
    }
  });

  const boundaryPosition = boundaryPositions.at(0);

  if (boundaryPosition === undefined) {
    throw new Error('표 경계를 찾을 수 없습니다.');
  }

  return boundaryPosition;
};

afterEach(() => {
  editors.splice(0).forEach((editor) => {
    editor.destroy();
  });
});

describe('TableAdjacentDelete', () => {
  it('표 위 문단 끝에서 Delete를 누르면 바로 아래 표 전체를 삭제한다', () => {
    const editor = createEditor(`<p>위 문단</p>${TABLE_HTML}<p>아래 문단</p>`);

    editor.commands.setTextSelection(findTextBoundary(editor, '위 문단', 'end'));
    editor.commands.keyboardShortcut('Delete');

    expect(getTopLevelNodeNames(editor)).toEqual(['paragraph', 'paragraph']);
    expect(editor.getText()).toContain('위 문단');
    expect(editor.getText()).toContain('아래 문단');

    editor.commands.undo();
    expect(getTopLevelNodeNames(editor)).toEqual(['paragraph', 'table', 'paragraph']);
  });

  it('표 아래 문단 시작에서 Backspace를 누르면 바로 위 표 전체를 삭제한다', () => {
    const editor = createEditor(`<p>위 문단</p>${TABLE_HTML}<p>아래 문단</p>`);

    editor.commands.setTextSelection(findTextBoundary(editor, '아래 문단', 'start'));
    editor.commands.keyboardShortcut('Backspace');

    expect(getTopLevelNodeNames(editor)).toEqual(['paragraph', 'paragraph']);
    expect(editor.getText()).toContain('위 문단');
    expect(editor.getText()).toContain('아래 문단');
  });

  it('문단 경계가 아닌 커서에서는 표를 삭제하지 않고 기본 Delete 동작으로 넘긴다', () => {
    const editor = createEditor(`<p>위 문단</p>${TABLE_HTML}<p>아래 문단</p>`);
    const paragraphStart = findTextBoundary(editor, '위 문단', 'start');

    editor.commands.setTextSelection(paragraphStart + 1);
    editor.commands.keyboardShortcut('Delete');

    expect(getTopLevelNodeNames(editor)).toEqual(['paragraph', 'table', 'paragraph']);
  });

  it('문단 경계가 아닌 커서에서는 표를 삭제하지 않고 기본 Backspace 동작으로 넘긴다', () => {
    const editor = createEditor(`<p>위 문단</p>${TABLE_HTML}<p>아래 문단</p>`);
    const paragraphStart = findTextBoundary(editor, '아래 문단', 'start');

    editor.commands.setTextSelection(paragraphStart + 1);
    editor.commands.keyboardShortcut('Backspace');

    expect(getTopLevelNodeNames(editor)).toEqual(['paragraph', 'table', 'paragraph']);
  });

  it('표 셀 내부에서 Delete를 눌러도 표 전체를 삭제하지 않는다', () => {
    const editor = createEditor(`<p>위 문단</p>${TABLE_HTML}<p>아래 문단</p>`);

    editor.commands.setTextSelection(findTextBoundary(editor, '본문 셀', 'end'));
    editor.commands.keyboardShortcut('Delete');

    expect(getTopLevelNodeNames(editor)).toEqual(['paragraph', 'table', 'paragraph']);
  });

  it('범위가 선택된 상태에서는 인접 표 전용 삭제를 실행하지 않는다', () => {
    const editor = createEditor(`<p>위 문단</p>${TABLE_HTML}<p>아래 문단</p>`);
    const selectionStart = findTextBoundary(editor, '위 문단', 'start');
    const selectionEnd = findTextBoundary(editor, '위 문단', 'end');

    editor.commands.setTextSelection({ from: selectionStart, to: selectionEnd });
    editor.commands.keyboardShortcut('Delete');

    expect(getTopLevelNodeNames(editor)).toEqual(['paragraph', 'table', 'paragraph']);
    expect(editor.getText()).not.toContain('위 문단');
  });

  it('연속된 표 사이 구조적 커서에서 Delete를 누르면 뒤쪽 표만 삭제한다', () => {
    const editor = createEditor(`${FIRST_TABLE_HTML}${SECOND_TABLE_HTML}<p>아래 문단</p>`);
    const gapPosition = findBoundaryAfterFirstTable(editor);

    editor.view.dispatch(
      editor.state.tr.setSelection(new GapCursor(editor.state.doc.resolve(gapPosition))),
    );
    editor.commands.keyboardShortcut('Delete');

    expect(getTopLevelNodeNames(editor)).toEqual(['table', 'paragraph']);
    expect(editor.getText()).toContain('첫 번째 표');
    expect(editor.getText()).not.toContain('두 번째 표');
  });

  it('연속된 표 사이 구조적 커서에서 Backspace를 누르면 앞쪽 표만 삭제한다', () => {
    const editor = createEditor(`${FIRST_TABLE_HTML}${SECOND_TABLE_HTML}<p>아래 문단</p>`);
    const gapPosition = findBoundaryAfterFirstTable(editor);

    editor.view.dispatch(
      editor.state.tr.setSelection(new GapCursor(editor.state.doc.resolve(gapPosition))),
    );
    editor.commands.keyboardShortcut('Backspace');

    expect(getTopLevelNodeNames(editor)).toEqual(['table', 'paragraph']);
    expect(editor.getText()).not.toContain('첫 번째 표');
    expect(editor.getText()).toContain('두 번째 표');
  });
});
