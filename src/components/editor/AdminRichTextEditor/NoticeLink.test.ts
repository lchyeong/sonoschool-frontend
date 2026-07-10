import { Editor } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';

import {
  applyNoticeLink,
  isAllowedNoticeLinkUrl,
  normalizeNoticeLinkUrl,
  removeNoticeLink,
} from './NoticeLink';

const editors: Editor[] = [];

const createEditor = (content: string): Editor => {
  const editor = new Editor({
    content,
    element: document.createElement('div'),
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({
        defaultProtocol: 'https',
        enableClickSelection: true,
        isAllowedUri: (url) => isAllowedNoticeLinkUrl(url),
        openOnClick: false,
      }),
    ],
  });

  editors.push(editor);
  return editor;
};

afterEach(() => {
  editors.splice(0).forEach((editor) => {
    editor.destroy();
  });
});

describe('NoticeLink', () => {
  it('프로토콜이 없는 일반 주소에는 https를 붙인다', () => {
    expect(normalizeNoticeLinkUrl('example.com/docs')).toBe('https://example.com/docs');
    expect(normalizeNoticeLinkUrl('localhost:5173/notice')).toBe('https://localhost:5173/notice');
  });

  it('안전한 외부·내부 링크만 허용한다', () => {
    expect(isAllowedNoticeLinkUrl('https://example.com')).toBe(true);
    expect(isAllowedNoticeLinkUrl('/notices/12')).toBe(true);
    expect(isAllowedNoticeLinkUrl('mailto:help@example.com')).toBe(true);
    expect(isAllowedNoticeLinkUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedNoticeLinkUrl('data:text/html,test')).toBe(false);
    expect(isAllowedNoticeLinkUrl('https://example.com/a b')).toBe(false);
  });

  it('드래그로 선택한 텍스트에 링크를 적용하고 해제한다', () => {
    const editor = createEditor('<p>공지 링크 테스트</p>');

    editor.commands.setTextSelection({ from: 4, to: 6 });
    const appliedUrl = applyNoticeLink(editor, 'example.com/notice');

    expect(appliedUrl).toBe('https://example.com/notice');
    expect(editor.getHTML()).toContain(
      '<a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com/notice">링크</a>',
    );

    editor.commands.setTextSelection(5);
    expect(removeNoticeLink(editor)).toBe(true);
    expect(editor.getHTML()).not.toContain('<a');
  });

  it('기존 링크 안의 커서에서 주소를 변경하면 링크 전체를 갱신한다', () => {
    const editor = createEditor('<p><a href="https://old.example.com">기존 링크</a></p>');

    editor.commands.setTextSelection(3);
    const appliedUrl = applyNoticeLink(editor, 'https://new.example.com/path');

    expect(appliedUrl).toBe('https://new.example.com/path');
    expect(editor.getText()).toBe('기존 링크');
    expect(editor.getHTML()).not.toContain('old.example.com');
    expect(editor.getHTML()).toContain('href="https://new.example.com/path"');
  });
});
