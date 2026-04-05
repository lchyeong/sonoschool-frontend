import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Extension } from '@tiptap/core';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { classNames } from '@/utils/classNames';
import { extractTextFromHtml } from '@/utils/htmlContent';

import styles from './AdminRichTextEditor.module.scss';

interface UploadedImage {
  alt?: string;
  url: string;
}

interface AdminRichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<UploadedImage>;
  placeholder?: string;
  hint?: string;
  errorMessage?: string;
}

const FONT_SIZE_VALUES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'] as const;
const FONT_FAMILY_OPTIONS = [
  { label: '기본', value: '' },
  { label: 'Wanted Sans', value: 'Wanted Sans' },
  { label: 'Pretendard', value: 'Pretendard' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Monospace', value: 'monospace' },
] as const;
const DEFAULT_TEXT_COLOR = '#1f2937';
const DEFAULT_HIGHLIGHT_COLOR = '#fff3bf';

const FontSize = Extension.create({
  addGlobalAttributes() {
    return [
      {
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) {
                return {};
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
        types: ['textStyle'],
      },
    ];
  },
  name: 'fontSize',
});

const resolveColorValue = (value: string | null | undefined, fallback: string): string => {
  if (!value || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    return fallback;
  }

  return value;
};

const resolveEditorAttribute = (
  attributes: Record<string, unknown> | undefined,
  name: string,
): string => {
  const value = attributes?.[name];
  return typeof value === 'string' ? value : '';
};

const AdminRichTextEditor = ({
  label,
  value,
  onChange,
  onImageUpload,
  placeholder = '내용을 입력해 주세요.',
  hint,
  errorMessage,
}: AdminRichTextEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);

  const editor = useEditor({
    content: value,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
        underline: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      TextStyle,
      FontSize,
      FontFamily,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        autolink: true,
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.configure({
        allowBase64: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.getHTML() === value) {
      return;
    }

    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  const plainTextLength = useMemo(() => extractTextFromHtml(value).trim().length, [value]);
  const textStyleAttributes = editor
    ? (editor.getAttributes('textStyle') as Record<string, unknown>)
    : undefined;
  const highlightAttributes = editor
    ? (editor.getAttributes('highlight') as Record<string, unknown>)
    : undefined;
  const linkAttributes = editor
    ? (editor.getAttributes('link') as Record<string, unknown>)
    : undefined;

  const currentFontFamily = resolveEditorAttribute(textStyleAttributes, 'fontFamily');
  const currentFontSize = resolveEditorAttribute(textStyleAttributes, 'fontSize');
  const currentTextColor = resolveColorValue(
    resolveEditorAttribute(textStyleAttributes, 'color'),
    DEFAULT_TEXT_COLOR,
  );
  const currentHighlightColor = resolveColorValue(
    resolveEditorAttribute(highlightAttributes, 'color'),
    DEFAULT_HIGHLIGHT_COLOR,
  );

  const handleLinkClick = () => {
    if (!editor) {
      return;
    }

    const previousUrl = resolveEditorAttribute(linkAttributes, 'href');
    const nextUrl = window.prompt('링크 주소를 입력해 주세요.', previousUrl);

    if (nextUrl === null) {
      return;
    }

    if (!nextUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({
        href: nextUrl.trim(),
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      })
      .run();
  };

  const handleImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !editor || !onImageUpload) {
      return;
    }

    setIsUploadingImage(true);
    setUploadErrorMessage(null);

    try {
      const uploadedImage = await onImageUpload(file);
      editor
        .chain()
        .focus()
        .setImage({
          alt: uploadedImage.alt ?? file.name,
          src: uploadedImage.url,
        })
        .run();
    } catch (error: unknown) {
      setUploadErrorMessage(
        error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.',
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className={styles['field']}>
      <div className={styles['labelRow']}>
        <label className={styles['label']}>{label}</label>
        {hint ? <span className={styles['hint']}>{hint}</span> : null}
      </div>

      <div className={styles['shell']}>
        <div className={styles['toolbar']}>
          <div className={styles['toolbarGroup']}>
            <button
              className={classNames(
                styles['toolbarButton'],
                editor?.isActive('bold') && styles['toolbarButtonActive'],
              )}
              onClick={() => {
                editor?.chain().focus().toggleBold().run();
              }}
              type='button'
            >
              B
            </button>
            <button
              className={classNames(
                styles['toolbarButton'],
                editor?.isActive('italic') && styles['toolbarButtonActive'],
              )}
              onClick={() => {
                editor?.chain().focus().toggleItalic().run();
              }}
              type='button'
            >
              I
            </button>
            <button
              className={classNames(
                styles['toolbarButton'],
                editor?.isActive('underline') && styles['toolbarButtonActive'],
              )}
              onClick={() => {
                editor?.chain().focus().toggleUnderline().run();
              }}
              type='button'
            >
              U
            </button>
            <button
              className={classNames(
                styles['toolbarButton'],
                editor?.isActive('strike') && styles['toolbarButtonActive'],
              )}
              onClick={() => {
                editor?.chain().focus().toggleStrike().run();
              }}
              type='button'
            >
              S
            </button>
          </div>

          <div className={styles['toolbarGroup']}>
            <select
              className={styles['toolbarSelect']}
              onChange={(event) => {
                const nextFontFamily = event.target.value;

                if (!editor) {
                  return;
                }

                if (!nextFontFamily) {
                  editor.chain().focus().unsetFontFamily().run();
                  return;
                }

                editor.chain().focus().setFontFamily(nextFontFamily).run();
              }}
              value={currentFontFamily}
            >
              {FONT_FAMILY_OPTIONS.map((option) => {
                return (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                );
              })}
            </select>

            <select
              className={styles['toolbarSelect']}
              onChange={(event) => {
                const nextFontSize = event.target.value;

                if (!editor) {
                  return;
                }

                if (!nextFontSize) {
                  editor.chain().focus().setMark('textStyle', { fontSize: null }).run();
                  return;
                }

                editor.chain().focus().setMark('textStyle', { fontSize: nextFontSize }).run();
              }}
              value={currentFontSize}
            >
              <option value=''>기본 크기</option>
              {FONT_SIZE_VALUES.map((fontSize) => {
                return (
                  <option key={fontSize} value={fontSize}>
                    {fontSize}
                  </option>
                );
              })}
            </select>

            <input
              aria-label='글자색'
              className={styles['colorInput']}
              onChange={(event) => {
                editor?.chain().focus().setColor(event.target.value).run();
              }}
              title='글자색'
              type='color'
              value={currentTextColor}
            />
            <input
              aria-label='형광펜'
              className={styles['colorInput']}
              onChange={(event) => {
                editor?.chain().focus().setHighlight({ color: event.target.value }).run();
              }}
              title='형광펜'
              type='color'
              value={currentHighlightColor}
            />
          </div>

          <div className={styles['toolbarGroup']}>
            <button
              className={classNames(
                styles['toolbarButton'],
                editor?.isActive('heading', { level: 1 }) && styles['toolbarButtonActive'],
              )}
              onClick={() => {
                editor?.chain().focus().toggleHeading({ level: 1 }).run();
              }}
              type='button'
            >
              H1
            </button>
            <button
              className={classNames(
                styles['toolbarButton'],
                editor?.isActive('heading', { level: 2 }) && styles['toolbarButtonActive'],
              )}
              onClick={() => {
                editor?.chain().focus().toggleHeading({ level: 2 }).run();
              }}
              type='button'
            >
              H2
            </button>
            <button
              className={classNames(
                styles['toolbarButton'],
                editor?.isActive('bulletList') && styles['toolbarButtonActive'],
              )}
              onClick={() => {
                editor?.chain().focus().toggleBulletList().run();
              }}
              type='button'
            >
              UL
            </button>
            <button
              className={classNames(
                styles['toolbarButton'],
                editor?.isActive('orderedList') && styles['toolbarButtonActive'],
              )}
              onClick={() => {
                editor?.chain().focus().toggleOrderedList().run();
              }}
              type='button'
            >
              OL
            </button>
            <button
              className={classNames(
                styles['toolbarButton'],
                editor?.isActive('blockquote') && styles['toolbarButtonActive'],
              )}
              onClick={() => {
                editor?.chain().focus().toggleBlockquote().run();
              }}
              type='button'
            >
              인용
            </button>
            <button
              className={classNames(
                styles['toolbarButton'],
                editor?.isActive({ textAlign: 'left' }) && styles['toolbarButtonActive'],
              )}
              onClick={() => {
                editor?.chain().focus().setTextAlign('left').run();
              }}
              type='button'
            >
              좌
            </button>
            <button
              className={classNames(
                styles['toolbarButton'],
                editor?.isActive({ textAlign: 'center' }) && styles['toolbarButtonActive'],
              )}
              onClick={() => {
                editor?.chain().focus().setTextAlign('center').run();
              }}
              type='button'
            >
              중
            </button>
            <button
              className={classNames(
                styles['toolbarButton'],
                editor?.isActive({ textAlign: 'right' }) && styles['toolbarButtonActive'],
              )}
              onClick={() => {
                editor?.chain().focus().setTextAlign('right').run();
              }}
              type='button'
            >
              우
            </button>
          </div>

          <div className={styles['toolbarGroup']}>
            <button
              className={classNames(
                styles['toolbarButton'],
                editor?.isActive('link') && styles['toolbarButtonActive'],
              )}
              onClick={handleLinkClick}
              type='button'
            >
              링크
            </button>
            <button
              className={styles['toolbarButton']}
              disabled={isUploadingImage || !onImageUpload}
              onClick={() => {
                fileInputRef.current?.click();
              }}
              type='button'
            >
              {isUploadingImage ? '업로드 중' : '이미지'}
            </button>
            <button
              className={styles['toolbarButton']}
              onClick={() => {
                editor
                  ?.chain()
                  .focus()
                  .insertTable({ cols: 3, rows: 3, withHeaderRow: true })
                  .run();
              }}
              type='button'
            >
              표
            </button>
            <button
              className={styles['toolbarButton']}
              onClick={() => {
                editor?.chain().focus().addRowAfter().run();
              }}
              type='button'
            >
              행+
            </button>
            <button
              className={styles['toolbarButton']}
              onClick={() => {
                editor?.chain().focus().addColumnAfter().run();
              }}
              type='button'
            >
              열+
            </button>
            <button
              className={classNames(styles['toolbarButton'], styles['toolbarButtonDanger'])}
              onClick={() => {
                editor?.chain().focus().deleteTable().run();
              }}
              type='button'
            >
              표삭제
            </button>
          </div>
        </div>

        <div className={styles['editor']}>
          <EditorContent editor={editor} />
        </div>

        <div className={styles['footer']}>
          <span className={styles['status']}>텍스트 {String(plainTextLength)}자</span>
          {uploadErrorMessage ? (
            <span className={styles['error']}>{uploadErrorMessage}</span>
          ) : null}
        </div>
      </div>

      <input
        accept='image/*'
        hidden
        onChange={(event) => {
          void handleImageSelection(event);
        }}
        ref={fileInputRef}
        type='file'
      />

      {errorMessage ? <div className={styles['error']}>{errorMessage}</div> : null}
    </div>
  );
};

export default AdminRichTextEditor;
