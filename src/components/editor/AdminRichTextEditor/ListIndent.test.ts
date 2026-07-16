import { Editor } from '@tiptap/core';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';

import { indentListItem, outdentListItem } from './ListIndent';

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

const selectText = (text: string): void => {
  if (!editor) {
    throw new Error('Editor is not ready.');
  }

  const textPositions: number[] = [];
  editor.state.doc.descendants((node, position) => {
    if (textPositions.length === 0 && node.isText && node.text?.includes(text)) {
      textPositions.push(position + 1);
    }
  });
  const textPosition = textPositions.at(0);

  if (textPosition === undefined) {
    throw new Error(`Could not find text: ${text}`);
  }

  editor.commands.setTextSelection(textPosition);
};

const createEditor = (content: string): Editor => {
  return new Editor({
    content,
    extensions: [StarterKit, Table, TableRow, TableHeader, TableCell],
  });
};

describe('목록 들여쓰기', () => {
  it('일반 본문의 두 번째 목록 항목을 들여쓰고 다시 내어쓴다', () => {
    editor = createEditor('<ul><li><p>첫 항목</p></li><li><p>둘째 항목</p></li></ul>');
    selectText('둘째 항목');

    expect(indentListItem(editor)).toBe(true);
    expect(editor.getHTML()).toContain('<li><p>첫 항목</p><ul><li><p>둘째 항목</p></li></ul></li>');

    expect(outdentListItem(editor)).toBe(true);
    expect(editor.getHTML()).toContain('<ul><li><p>첫 항목</p></li><li><p>둘째 항목</p></li></ul>');
  });

  it('표 셀 안의 번호 목록도 들여쓰기와 내어쓰기를 지원한다', () => {
    editor = createEditor(
      '<table><tbody><tr><td><ol><li><p>첫 항목</p></li><li><p>둘째 항목</p></li></ol></td></tr></tbody></table>',
    );
    selectText('둘째 항목');

    expect(indentListItem(editor)).toBe(true);
    expect(editor.getHTML()).toContain(
      '<ol><li><p>첫 항목</p><ol><li><p>둘째 항목</p></li></ol></li></ol>',
    );

    expect(outdentListItem(editor)).toBe(true);
    expect(editor.getHTML()).toContain('<ol><li><p>첫 항목</p></li><li><p>둘째 항목</p></li></ol>');
  });
});
