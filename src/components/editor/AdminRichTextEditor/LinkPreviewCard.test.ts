import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';

import { sanitizeRichTextHtml } from '@/utils/htmlContent';

import LinkPreviewCard, { insertLinkPreviewCard } from './LinkPreviewCard';

const editors: Editor[] = [];

const createEditor = (content = '<p></p>'): Editor => {
  const editor = new Editor({
    content,
    element: document.createElement('div'),
    extensions: [StarterKit, LinkPreviewCard],
  });

  editors.push(editor);
  return editor;
};

afterEach(() => {
  editors.splice(0).forEach((editor) => {
    editor.destroy();
  });
});

describe('LinkPreviewCard', () => {
  it('카드 메타데이터를 저장 가능한 HTML로 직렬화하고 입력 문단을 뒤에 만든다', () => {
    const editor = createEditor();

    const didInsert = insertLinkPreviewCard(editor, {
      description: '초음파 교육과 학습 정보를 제공합니다.',
      domain: 'sonoschool.kr',
      imageUrl: 'https://sonoschool.kr/SRDMS_OG.png',
      siteName: 'SONO SCHOOL',
      title: 'SONO SCHOOL',
      url: 'https://sonoschool.kr/',
    });
    const html = editor.getHTML();

    expect(didInsert).toBe(true);
    expect(html).toContain('data-link-preview-card=""');
    expect(html).toContain('data-title="SONO SCHOOL"');
    expect(html).toContain('src="https://sonoschool.kr/SRDMS_OG.png"');
    expect(html).toContain('href="https://sonoschool.kr/"');
    expect(editor.state.selection.$from.parent.type.name).toBe('paragraph');

    const sanitizedHtml = sanitizeRichTextHtml(html);
    expect(sanitizedHtml).toContain('data-link-preview-card=""');
    expect(sanitizedHtml).toContain('target="_blank"');
    expect(sanitizedHtml).toContain('rel="noopener noreferrer nofollow"');
  });

  it('저장된 카드 HTML을 다시 불러와도 카드 노드와 메타데이터를 복원한다', () => {
    const editor = createEditor(`
      <article
        data-link-preview-card
        data-url="https://example.com/notice"
        data-title="예시 공지"
        data-description="설명"
        data-domain="example.com"
        data-site-name="예시"
      >
        <a href="https://example.com/notice">예시 공지</a>
      </article>
    `);
    const card = editor.state.doc.firstChild;

    expect(card?.type.name).toBe('linkPreviewCard');
    expect(card?.attrs).toMatchObject({
      description: '설명',
      domain: 'example.com',
      title: '예시 공지',
      url: 'https://example.com/notice',
    });
  });

  it('저장 HTML을 조작해도 위험한 카드 링크와 이미지 프로토콜은 다시 출력하지 않는다', () => {
    const editor = createEditor(`
      <article
        data-link-preview-card
        data-url="javascript:alert(1)"
        data-image-url="data:text/html,attack"
        data-title="위험한 링크"
        data-domain="example.com"
      ></article>
    `);
    const html = editor.getHTML();

    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('data:text/html');
  });
});
