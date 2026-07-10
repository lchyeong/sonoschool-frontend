import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';

import NoticeImage, { insertNoticeImage } from './NoticeImage';

const editors: Editor[] = [];

const createEditor = (content = '<p></p>'): Editor => {
  const editor = new Editor({
    content,
    element: document.createElement('div'),
    extensions: [
      StarterKit.configure({
        trailingNode: {
          node: 'paragraph',
          notAfter: ['paragraph'],
        },
      }),
      NoticeImage.configure({
        resize: {
          alwaysPreserveAspectRatio: true,
          directions: ['bottom-left', 'bottom-right'],
          enabled: true,
          minHeight: 48,
          minWidth: 80,
        },
      }),
    ],
  });

  editors.push(editor);
  return editor;
};

const getTopLevelNodeNames = (editor: Editor): string[] => {
  const nodeNames: string[] = [];

  editor.state.doc.forEach((node) => {
    nodeNames.push(node.type.name);
  });

  return nodeNames;
};

const findTextEnd = (editor: Editor, text: string): number => {
  const positions: number[] = [];

  editor.state.doc.descendants((node, position) => {
    if (node.isTextblock && node.textContent === text) {
      positions.push(position + node.nodeSize - 1);
    }
  });

  const position = positions.at(0);

  if (position === undefined) {
    throw new Error(`텍스트 블록을 찾을 수 없습니다: ${text}`);
  }

  return position;
};

afterEach(() => {
  editors.splice(0).forEach((editor) => {
    editor.destroy();
  });
});

describe('NoticeImage', () => {
  it('빈 본문에 이미지를 먼저 넣어도 뒤 문단으로 커서를 이동한다', () => {
    const editor = createEditor();

    const didInsert = insertNoticeImage(editor, {
      alt: '공지 이미지',
      src: 'https://cdn.example.com/notice.png',
      storageUrl: 's3://notice/notice.png',
    });

    expect(didInsert).toBe(true);
    expect(getTopLevelNodeNames(editor)).toEqual(['image', 'paragraph']);
    expect(editor.state.selection.empty).toBe(true);
    expect(editor.state.selection.$from.parent.type.name).toBe('paragraph');
    expect(editor.state.selection.$from.parentOffset).toBe(0);
    expect(editor.getHTML()).toContain('data-storage-url="s3://notice/notice.png"');
  });

  it('리사이즈 손잡이와 draggable 속성을 이미지 노드에 제공한다', () => {
    const editor = createEditor(
      '<img src="https://cdn.example.com/notice.png" alt="공지 이미지" width="320" height="180">',
    );
    const image = editor.view.dom.querySelector('img');

    expect(image).not.toBeNull();
    image?.dispatchEvent(new Event('load'));

    const container = editor.view.dom.querySelector('[data-resize-container][data-node="image"]');
    const handles = editor.view.dom.querySelectorAll('[data-resize-handle]');

    expect(container).toHaveAttribute('draggable', 'true');
    expect(handles).toHaveLength(2);
    expect(editor.getHTML()).toContain('width="320"');
    expect(editor.getHTML()).toContain('height="180"');
  });

  it('오른쪽 아래 손잡이를 드래그하면 비율을 유지한 크기를 본문 HTML에 저장한다', () => {
    const editor = createEditor(
      '<img src="https://cdn.example.com/notice.png" alt="공지 이미지" width="320" height="180">',
    );
    const image = editor.view.dom.querySelector('img');
    const resizeHandle = editor.view.dom.querySelector('[data-resize-handle="bottom-right"]');

    if (!(image instanceof HTMLImageElement) || !(resizeHandle instanceof HTMLElement)) {
      throw new Error('이미지 리사이즈 요소를 찾을 수 없습니다.');
    }

    image.dispatchEvent(new Event('load'));
    Object.defineProperties(image, {
      offsetHeight: {
        configurable: true,
        get: () => Number.parseFloat(image.style.height) || 180,
      },
      offsetWidth: {
        configurable: true,
        get: () => Number.parseFloat(image.style.width) || 320,
      },
    });

    resizeHandle.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: 0, clientY: 0 }),
    );
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 80, clientY: 45 }));
    document.dispatchEvent(new MouseEvent('mouseup'));

    expect(editor.getHTML()).toContain('width="400"');
    expect(editor.getHTML()).toContain('height="225"');
  });

  it('이미지 다음 노드가 텍스트 블록이 아니면 입력용 문단을 사이에 만든다', () => {
    const editor = createEditor('<p>앞 문단</p><hr><p>뒤 문단</p>');
    editor.commands.setTextSelection(findTextEnd(editor, '앞 문단'));

    insertNoticeImage(editor, {
      alt: '중간 이미지',
      src: 'https://cdn.example.com/middle.png',
    });

    expect(getTopLevelNodeNames(editor)).toEqual([
      'paragraph',
      'image',
      'paragraph',
      'horizontalRule',
      'paragraph',
    ]);
    expect(editor.state.selection.$from.parent.type.name).toBe('paragraph');
    expect(editor.state.selection.$from.parentOffset).toBe(0);
  });
});
