import type {
  ChangeEvent,
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Extension } from '@tiptap/core';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { Selection } from '@tiptap/pm/state';
import { findTable } from '@tiptap/pm/tables';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { classNames } from '@/utils/classNames';
import { extractTextFromHtml } from '@/utils/htmlContent';

import styles from './AdminRichTextEditor.module.scss';
import NoticeImage, { insertNoticeImage } from './NoticeImage';
import PreventNestedTable from './PreventNestedTable';
import TableAdjacentDelete from './TableAdjacentDelete';

interface UploadedImage {
  alt?: string;
  storageUrl?: string;
  url: string;
}

interface AdminRichTextEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<UploadedImage>;
  placeholder?: string;
  hint?: string;
  errorMessage?: string;
}

interface TableInlineControlsState {
  addColumnLeft: number;
  addColumnHeight: number;
  addColumnTop: number;
  addRowLeft: number;
  addRowTop: number;
  addRowWidth: number;
  columnDeleteLeft: number;
  columnDeleteTop: number;
  moveLeft: number;
  moveTop: number;
  rowDeleteLeft: number;
  rowDeleteTop: number;
  resizeLeft: number;
  resizeTop: number;
  targetCellPosition: number | null;
  visible: boolean;
}

interface TableResizeDragState {
  startWidth: number;
  startWidths: number[];
  startX: number;
}

interface TableMoveDragState {
  startX: number;
  startY: number;
  tablePosition: number;
}

interface TableAddPreviewState {
  column: boolean;
  row: boolean;
}

const FONT_SIZE_OPTIONS = [
  { label: '아주 작게', value: '12px' },
  { label: '작게', value: '14px' },
  { label: '본문', value: '16px' },
  { label: '조금 크게', value: '18px' },
  { label: '크게', value: '20px' },
  { label: '소제목 크기', value: '24px' },
  { label: '제목 크기', value: '28px' },
  { label: '큰 제목 크기', value: '32px' },
] as const;
const FONT_FAMILY_OPTIONS = [
  { label: '기본 글꼴', value: '' },
  { label: '고딕체', value: 'Wanted Sans' },
  { label: '깔끔한 고딕체', value: 'Pretendard' },
  { label: '명조체', value: 'Georgia' },
  { label: '고정폭 글꼴', value: 'monospace' },
] as const;
const DEFAULT_TEXT_COLOR = '#1f2937';
const DEFAULT_HIGHLIGHT_COLOR = '#fff3bf';
const TABLE_COLUMN_MIN_WIDTH = 96;
const TABLE_EDGE_PREVIEW_SIZE = 96;
const TABLE_MOVE_DRAG_THRESHOLD = 6;
const HIDDEN_TABLE_CONTROLS: TableInlineControlsState = {
  addColumnHeight: 0,
  addColumnLeft: 0,
  addColumnTop: 0,
  addRowLeft: 0,
  addRowTop: 0,
  addRowWidth: 0,
  columnDeleteLeft: 0,
  columnDeleteTop: 0,
  moveLeft: 0,
  moveTop: 0,
  rowDeleteLeft: 0,
  rowDeleteTop: 0,
  resizeLeft: 0,
  resizeTop: 0,
  targetCellPosition: null,
  visible: false,
};
const HIDDEN_TABLE_ADD_PREVIEW: TableAddPreviewState = {
  column: false,
  row: false,
};

const isImageFile = (file: File): boolean => {
  if (file.type.trim().toLowerCase().startsWith('image/')) {
    return true;
  }

  return /\.(avif|gif|jpe?g|png|webp)$/i.test(file.name);
};

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

const ToolbarButton = ({
  active = false,
  children,
  danger = false,
  disabled = false,
  label,
  onClick,
  wide = false,
}: {
  active?: boolean;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  wide?: boolean;
}) => {
  return (
    <button
      aria-label={label}
      className={classNames(
        styles['toolbarButton'],
        active && styles['toolbarButtonActive'],
        danger && styles['toolbarButtonDanger'],
        wide && styles['toolbarButtonWide'],
      )}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={onClick}
      title={label}
      type='button'
    >
      {children}
    </button>
  );
};

const TextAlignIcon = ({ align }: { align: 'center' | 'left' | 'right' }) => {
  return (
    <span aria-hidden='true' className={styles['alignIcon']} data-align={align}>
      <span />
      <span />
      <span />
    </span>
  );
};

const ListIcon = ({ ordered = false }: { ordered?: boolean }) => {
  return (
    <span aria-hidden='true' className={styles['listIcon']} data-ordered={ordered}>
      <span />
      <span />
      <span />
    </span>
  );
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
  const editorFrameRef = useRef<HTMLDivElement | null>(null);
  const internalImageDragRef = useRef(false);
  const tableAddPreviewHideTimerRef = useRef<number | null>(null);
  const tableMoveDragRef = useRef<TableMoveDragState | null>(null);
  const tableResizeDragRef = useRef<TableResizeDragState | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [tableInlineControls, setTableInlineControls] =
    useState<TableInlineControlsState>(HIDDEN_TABLE_CONTROLS);
  const [tableAddPreview, setTableAddPreview] =
    useState<TableAddPreviewState>(HIDDEN_TABLE_ADD_PREVIEW);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);

  const editor = useEditor({
    content: value,
    extensions: [
      StarterKit.configure({
        dropcursor: {
          color: '#34b29f',
          width: 3,
        },
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
        trailingNode: {
          node: 'paragraph',
          notAfter: ['paragraph'],
        },
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
      NoticeImage.configure({
        allowBase64: false,
        resize: {
          alwaysPreserveAspectRatio: true,
          directions: ['bottom-left', 'bottom-right'],
          enabled: true,
          minHeight: 48,
          minWidth: 80,
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TableAdjacentDelete,
      PreventNestedTable,
    ],
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });
  const isSelectionInsideTable =
    useEditorState({
      editor,
      selector: ({ editor: currentEditor }) => currentEditor?.isActive('table') ?? false,
    }) ?? false;

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.getHTML() === value) {
      return;
    }

    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  const hideTableControls = useCallback(() => {
    setTableInlineControls((current) => {
      return current.visible ? HIDDEN_TABLE_CONTROLS : current;
    });
  }, []);

  const resolveTableCellPosition = useCallback(
    (cell: Element) => {
      if (!editor) {
        return null;
      }

      try {
        return editor.view.posAtDOM(cell, 0);
      } catch {
        return null;
      }
    },
    [editor],
  );

  const updateTableInlineControlsFromCell = useCallback(
    (baseElement: Element | null) => {
      const editorFrame = editorFrameRef.current;

      if (!editor || !editorFrame) {
        hideTableControls();
        return;
      }

      const cell = baseElement?.closest('td, th');
      const table = cell?.closest('table');
      const row = cell?.parentElement;

      if (!cell || !table || !row || !editorFrame.contains(table)) {
        hideTableControls();
        return;
      }

      const targetCellPosition = resolveTableCellPosition(cell);
      if (targetCellPosition === null) {
        hideTableControls();
        return;
      }

      const editorRect = editorFrame.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const nextControls = {
        addColumnHeight: tableRect.height + 16,
        addColumnLeft: tableRect.right - editorRect.left + editorFrame.scrollLeft + 12,
        addColumnTop: tableRect.top - editorRect.top + editorFrame.scrollTop - 8,
        addRowLeft: tableRect.left - editorRect.left + editorFrame.scrollLeft - 8,
        addRowTop: tableRect.bottom - editorRect.top + editorFrame.scrollTop + 12,
        addRowWidth: tableRect.width + 16,
        columnDeleteLeft:
          cellRect.left - editorRect.left + editorFrame.scrollLeft + cellRect.width / 2 - 32,
        columnDeleteTop: tableRect.top - editorRect.top + editorFrame.scrollTop - 34,
        moveLeft: tableRect.left - editorRect.left + editorFrame.scrollLeft - 14,
        moveTop: tableRect.top - editorRect.top + editorFrame.scrollTop - 14,
        rowDeleteLeft: tableRect.left - editorRect.left + editorFrame.scrollLeft - 34,
        rowDeleteTop:
          rowRect.top - editorRect.top + editorFrame.scrollTop + rowRect.height / 2 - 22,
        resizeLeft: tableRect.right - editorRect.left + editorFrame.scrollLeft - 12,
        resizeTop: tableRect.bottom - editorRect.top + editorFrame.scrollTop - 12,
        targetCellPosition,
        visible: true,
      };

      setTableInlineControls((current) => {
        if (
          current.visible === nextControls.visible &&
          current.targetCellPosition === nextControls.targetCellPosition &&
          Math.round(current.addColumnLeft) === Math.round(nextControls.addColumnLeft) &&
          Math.round(current.addColumnHeight) === Math.round(nextControls.addColumnHeight) &&
          Math.round(current.addColumnTop) === Math.round(nextControls.addColumnTop) &&
          Math.round(current.addRowLeft) === Math.round(nextControls.addRowLeft) &&
          Math.round(current.addRowTop) === Math.round(nextControls.addRowTop) &&
          Math.round(current.addRowWidth) === Math.round(nextControls.addRowWidth) &&
          Math.round(current.columnDeleteLeft) === Math.round(nextControls.columnDeleteLeft) &&
          Math.round(current.columnDeleteTop) === Math.round(nextControls.columnDeleteTop) &&
          Math.round(current.moveLeft) === Math.round(nextControls.moveLeft) &&
          Math.round(current.moveTop) === Math.round(nextControls.moveTop) &&
          Math.round(current.rowDeleteLeft) === Math.round(nextControls.rowDeleteLeft) &&
          Math.round(current.rowDeleteTop) === Math.round(nextControls.rowDeleteTop) &&
          Math.round(current.resizeLeft) === Math.round(nextControls.resizeLeft) &&
          Math.round(current.resizeTop) === Math.round(nextControls.resizeTop)
        ) {
          return current;
        }

        return nextControls;
      });
    },
    [editor, hideTableControls, resolveTableCellPosition],
  );

  const selectTableCellAtPosition = useCallback(
    (cellPosition: number | null) => {
      if (!editor || cellPosition === null) {
        return false;
      }

      const targetPosition = Math.min(cellPosition + 1, editor.state.doc.content.size);
      if (targetPosition < 0) {
        return false;
      }

      const transaction = editor.state.tr.setSelection(
        Selection.near(editor.state.doc.resolve(targetPosition)),
      );
      editor.view.dispatch(transaction);
      return true;
    },
    [editor],
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    let animationFrameId = 0;

    const updateTableControls = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(() => {
        const domAtPosition = editor.view.domAtPos(editor.state.selection.from);
        const baseElement =
          domAtPosition.node.nodeType === Node.ELEMENT_NODE
            ? (domAtPosition.node as Element)
            : domAtPosition.node.parentElement;
        updateTableInlineControlsFromCell(baseElement);
      });
    };

    const editorFrame = editorFrameRef.current;

    editor.on('selectionUpdate', updateTableControls);
    editor.on('transaction', updateTableControls);
    window.addEventListener('resize', updateTableControls);
    editorFrame?.addEventListener('scroll', updateTableControls, true);
    updateTableControls();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      editor.off('selectionUpdate', updateTableControls);
      editor.off('transaction', updateTableControls);
      window.removeEventListener('resize', updateTableControls);
      editorFrame?.removeEventListener('scroll', updateTableControls, true);
    };
  }, [editor, updateTableInlineControlsFromCell]);

  const getSelectedTableElement = (): HTMLTableElement | null => {
    if (!editor) {
      return null;
    }

    const domAtPosition = editor.view.domAtPos(editor.state.selection.from);
    const baseElement =
      domAtPosition.node.nodeType === Node.ELEMENT_NODE
        ? (domAtPosition.node as Element)
        : domAtPosition.node.parentElement;

    return baseElement?.closest('table') ?? null;
  };

  const resolveTableMoveTargetPosition = (clientY: number, tablePosition: number) => {
    if (!editor) {
      return null;
    }

    const blockEntries: Array<{
      from: number;
      rect: DOMRect;
    }> = [];

    editor.state.doc.forEach((_node, offset) => {
      const domNode = editor.view.nodeDOM(offset);
      const element =
        domNode instanceof HTMLElement
          ? domNode
          : domNode?.parentElement instanceof HTMLElement
            ? domNode.parentElement
            : null;

      if (!element) {
        return;
      }

      blockEntries.push({
        from: offset,
        rect: element.getBoundingClientRect(),
      });
    });

    if (!blockEntries.length) {
      return null;
    }

    const tableEntry = blockEntries.find((entry) => entry.from === tablePosition);
    const movableEntries = blockEntries.filter((entry) => entry.from !== tablePosition);

    if (!movableEntries.length) {
      return null;
    }

    for (const entry of movableEntries) {
      const midpointY = entry.rect.top + entry.rect.height / 2;
      if (clientY < midpointY) {
        return entry.from;
      }
    }

    if (tableEntry && clientY < tableEntry.rect.bottom) {
      return tablePosition;
    }

    return editor.state.doc.content.size;
  };

  const moveSelectedTableToPosition = (targetPosition: number) => {
    if (!editor) {
      return;
    }

    if (!selectTableCellAtPosition(tableInlineControls.targetCellPosition)) {
      return;
    }

    const tableInfo = findTable(editor.state.selection.$from);
    if (!tableInfo) {
      return;
    }

    const tableFrom = tableInfo.pos;
    const tableTo = tableFrom + tableInfo.node.nodeSize;
    if (targetPosition >= tableFrom && targetPosition <= tableTo) {
      return;
    }

    const transaction = editor.state.tr.delete(tableFrom, tableTo);
    const insertPosition =
      targetPosition > tableFrom ? targetPosition - tableInfo.node.nodeSize : targetPosition;

    if (insertPosition < 0 || insertPosition > transaction.doc.content.size) {
      return;
    }

    transaction.insert(insertPosition, tableInfo.node);
    transaction.setSelection(Selection.near(transaction.doc.resolve(insertPosition + 1)));
    editor.view.dispatch(transaction.scrollIntoView());
    editor.commands.focus();
  };

  const resolveTableColumnWidths = (tableElement: HTMLTableElement): number[] => {
    const colElements = Array.from(tableElement.querySelectorAll('colgroup col'));
    if (colElements.length) {
      return colElements.map((colElement) => {
        const tableColumn = colElement as HTMLTableColElement;
        const rectWidth = colElement.getBoundingClientRect().width;
        const styleWidth = Number.parseFloat(tableColumn.style.width || '');
        const styleMinWidth = Number.parseFloat(tableColumn.style.minWidth || '');
        const nextWidth = rectWidth || styleWidth || styleMinWidth || TABLE_COLUMN_MIN_WIDTH;
        return Math.max(TABLE_COLUMN_MIN_WIDTH, Math.round(nextWidth));
      });
    }

    const firstRowCells = Array.from(
      tableElement.querySelectorAll('tr:first-child > th, tr:first-child > td'),
    );
    return firstRowCells.map((cell) => {
      return Math.max(TABLE_COLUMN_MIN_WIDTH, Math.round(cell.getBoundingClientRect().width));
    });
  };

  const applyTableColumnWidths = (widths: number[]) => {
    if (!editor || !widths.length) {
      return;
    }

    const tableInfo = findTable(editor.state.selection.$from);
    const firstRow = tableInfo?.node.firstChild;
    if (!tableInfo || !firstRow) {
      return;
    }

    let transaction = editor.state.tr;
    let cellPosition = tableInfo.start + 1;
    let columnIndex = 0;

    for (let cellIndex = 0; cellIndex < firstRow.childCount; cellIndex += 1) {
      const cellNode = firstRow.child(cellIndex);
      const colspan = Number(cellNode.attrs['colspan'] ?? 1);
      const colwidth = widths
        .slice(columnIndex, columnIndex + colspan)
        .map((width) => Math.max(TABLE_COLUMN_MIN_WIDTH, Math.round(width)));

      transaction = transaction.setNodeMarkup(cellPosition, undefined, {
        ...cellNode.attrs,
        colwidth,
      });

      cellPosition += cellNode.nodeSize;
      columnIndex += colspan;
    }

    editor.view.dispatch(transaction);
  };

  const handleTableMovePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!editor) {
      return;
    }

    const tableInfo = findTable(editor.state.selection.$from);
    if (!tableInfo) {
      return;
    }

    tableMoveDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      tablePosition: tableInfo.pos,
    };

    const previousBodyCursor = document.body.style.cursor;
    document.body.style.cursor = 'grabbing';

    const resetTableMoveDrag = () => {
      tableMoveDragRef.current = null;
      document.body.style.cursor = previousBodyCursor;
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };

    const handlePointerCancel = () => {
      resetTableMoveDrag();
    };

    const handlePointerUp = (pointerEvent: PointerEvent) => {
      const dragState = tableMoveDragRef.current;
      resetTableMoveDrag();

      if (!dragState) {
        return;
      }

      const dragDistance = Math.hypot(
        pointerEvent.clientX - dragState.startX,
        pointerEvent.clientY - dragState.startY,
      );

      if (dragDistance < TABLE_MOVE_DRAG_THRESHOLD) {
        return;
      }

      const targetPosition = resolveTableMoveTargetPosition(
        pointerEvent.clientY,
        dragState.tablePosition,
      );

      if (targetPosition !== null) {
        moveSelectedTableToPosition(targetPosition);
      }
    };

    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
  };

  const handleTableResizePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!selectTableCellAtPosition(tableInlineControls.targetCellPosition)) {
      return;
    }

    const tableElement = getSelectedTableElement();
    if (!tableElement) {
      return;
    }

    const startWidths = resolveTableColumnWidths(tableElement);
    const startWidth = startWidths.reduce((sum, width) => sum + width, 0);

    if (!startWidths.length || startWidth <= 0) {
      return;
    }

    tableResizeDragRef.current = {
      startWidth,
      startWidths,
      startX: event.clientX,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dragState = tableResizeDragRef.current;
      if (!dragState) {
        return;
      }

      const minimumWidth = dragState.startWidths.length * TABLE_COLUMN_MIN_WIDTH;
      const nextWidth = Math.max(
        minimumWidth,
        dragState.startWidth + moveEvent.clientX - dragState.startX,
      );
      const widthRatio = nextWidth / dragState.startWidth;
      const nextWidths = dragState.startWidths.map((width) => {
        return Math.max(TABLE_COLUMN_MIN_WIDTH, Math.round(width * widthRatio));
      });

      applyTableColumnWidths(nextWidths);
    };

    const handlePointerUp = () => {
      tableResizeDragRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  const clearTableAddPreviewHideTimer = () => {
    if (tableAddPreviewHideTimerRef.current === null) {
      return;
    }

    window.clearTimeout(tableAddPreviewHideTimerRef.current);
    tableAddPreviewHideTimerRef.current = null;
  };

  const updateTableAddPreview = (nextPreview: TableAddPreviewState) => {
    if (nextPreview.column || nextPreview.row) {
      clearTableAddPreviewHideTimer();
    }

    setTableAddPreview((currentPreview) => {
      if (currentPreview.column === nextPreview.column && currentPreview.row === nextPreview.row) {
        return currentPreview;
      }

      return nextPreview;
    });
  };

  const scheduleTableAddPreviewHide = () => {
    if (tableAddPreviewHideTimerRef.current !== null) {
      return;
    }

    tableAddPreviewHideTimerRef.current = window.setTimeout(() => {
      tableAddPreviewHideTimerRef.current = null;
      updateTableAddPreview(HIDDEN_TABLE_ADD_PREVIEW);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (tableAddPreviewHideTimerRef.current !== null) {
        window.clearTimeout(tableAddPreviewHideTimerRef.current);
      }
    };
  }, []);

  const handleEditorMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    const addZone = target?.closest('[data-table-add-zone="true"]');

    if (addZone) {
      clearTableAddPreviewHideTimer();
      return;
    }

    const cell = target?.closest('td, th');
    const table = cell?.closest('table');
    const row = cell?.parentElement;

    if (!cell || !table || !row || !editorFrameRef.current?.contains(table)) {
      scheduleTableAddPreviewHide();
      return;
    }

    updateTableInlineControlsFromCell(cell);

    const tableRect = table.getBoundingClientRect();
    const rowCells = Array.from(row.children).filter((child) => {
      return child.matches('td, th');
    });
    const tableRows = Array.from(table.querySelectorAll('tr'));
    const isLastColumnCell = rowCells[rowCells.length - 1] === cell;
    const isLastRowCell = tableRows[tableRows.length - 1] === row;
    const isNearRightEdge = event.clientX >= tableRect.right - TABLE_EDGE_PREVIEW_SIZE;
    const isNearBottomEdge = event.clientY >= tableRect.bottom - TABLE_EDGE_PREVIEW_SIZE;

    updateTableAddPreview({
      column: isLastColumnCell || isNearRightEdge,
      row: isLastRowCell || isNearBottomEdge,
    });
  };

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
  // OG 링크 미리보기와 새 링크 입력 패널은 보류하고 기존 prompt 방식을 유지합니다.
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

  const insertImageFiles = async (files: File[]) => {
    if (files.length === 0 || !editor || !onImageUpload) {
      return;
    }

    const invalidFile = files.find((file) => !isImageFile(file));
    if (invalidFile) {
      setUploadErrorMessage(`${invalidFile.name} 파일은 이미지 형식이 아닙니다.`);
      return;
    }

    setIsUploadingImage(true);
    setUploadErrorMessage(null);

    try {
      for (const file of files) {
        const uploadedImage = await onImageUpload(file);
        insertNoticeImage(editor, {
          alt: uploadedImage.alt ?? file.name,
          src: uploadedImage.url,
          storageUrl: uploadedImage.storageUrl ?? null,
        });
      }
    } catch (error: unknown) {
      setUploadErrorMessage(
        error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.',
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    await insertImageFiles(files);
  };

  const handleEditorDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (internalImageDragRef.current) {
      return;
    }

    const hasFile = Array.from(event.dataTransfer.items).some((item) => item.kind === 'file');

    if (!hasFile || !onImageUpload || isUploadingImage) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleEditorDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    const isInternalImageMove = internalImageDragRef.current;
    internalImageDragRef.current = false;

    if (isInternalImageMove) {
      return;
    }

    const files = Array.from(event.dataTransfer.files);

    if (files.length === 0 || !onImageUpload || isUploadingImage) {
      return;
    }

    event.preventDefault();
    void insertImageFiles(files);
  };

  return (
    <div className={styles['field']}>
      {label || hint ? (
        <div className={styles['labelRow']}>
          {label ? <label className={styles['label']}>{label}</label> : null}
          {hint ? <span className={styles['hint']}>{hint}</span> : null}
        </div>
      ) : null}

      <div className={styles['shell']}>
        <div className={styles['toolbar']}>
          <div className={styles['toolbarGroup']}>
            <span className={styles['toolbarGroupLabel']}>글자</span>
            <ToolbarButton
              active={editor?.isActive('bold') ?? false}
              label='굵게'
              onClick={() => {
                editor?.chain().focus().toggleBold().run();
              }}
            >
              <span className={styles['formatGlyph']}>B</span>
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('italic') ?? false}
              label='기울임'
              onClick={() => {
                editor?.chain().focus().toggleItalic().run();
              }}
            >
              <span className={`${styles['formatGlyph']} ${styles['formatGlyphItalic']}`}>I</span>
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('underline') ?? false}
              label='밑줄'
              onClick={() => {
                editor?.chain().focus().toggleUnderline().run();
              }}
            >
              <span className={`${styles['formatGlyph']} ${styles['formatGlyphUnderline']}`}>
                U
              </span>
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('strike') ?? false}
              label='취소선'
              onClick={() => {
                editor?.chain().focus().toggleStrike().run();
              }}
            >
              <span className={`${styles['formatGlyph']} ${styles['formatGlyphStrike']}`}>S</span>
            </ToolbarButton>
          </div>

          <div className={styles['toolbarGroup']}>
            <span className={styles['toolbarGroupLabel']}>모양</span>
            <select
              className={styles['toolbarSelect']}
              title='글꼴'
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
              title='글자 크기'
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
              {FONT_SIZE_OPTIONS.map((option) => {
                return (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                );
              })}
            </select>

            <label className={styles['colorPicker']} title='글자색'>
              <span>글자색</span>
              <input
                aria-label='글자색'
                className={styles['colorInput']}
                onChange={(event) => {
                  editor?.chain().focus().setColor(event.target.value).run();
                }}
                type='color'
                value={currentTextColor}
              />
            </label>
            <label className={styles['colorPicker']} title='배경색'>
              <span>배경색</span>
              <input
                aria-label='배경색'
                className={styles['colorInput']}
                onChange={(event) => {
                  editor?.chain().focus().setHighlight({ color: event.target.value }).run();
                }}
                type='color'
                value={currentHighlightColor}
              />
            </label>
          </div>

          <div className={styles['toolbarGroup']}>
            <span className={styles['toolbarGroupLabel']}>문단</span>
            <ToolbarButton
              active={editor?.isActive('heading', { level: 1 }) ?? false}
              label='큰 제목'
              onClick={() => {
                editor?.chain().focus().toggleHeading({ level: 1 }).run();
              }}
              wide
            >
              큰 제목
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('heading', { level: 2 }) ?? false}
              label='중간 제목'
              onClick={() => {
                editor?.chain().focus().toggleHeading({ level: 2 }).run();
              }}
              wide
            >
              중간 제목
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('bulletList') ?? false}
              label='글머리 목록'
              onClick={() => {
                editor?.chain().focus().toggleBulletList().run();
              }}
            >
              <ListIcon />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('orderedList') ?? false}
              label='번호 목록'
              onClick={() => {
                editor?.chain().focus().toggleOrderedList().run();
              }}
            >
              <ListIcon ordered />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('blockquote') ?? false}
              label='인용 문단'
              onClick={() => {
                editor?.chain().focus().toggleBlockquote().run();
              }}
            >
              인용
            </ToolbarButton>
          </div>

          <div className={styles['toolbarGroup']}>
            <span className={styles['toolbarGroupLabel']}>정렬</span>
            <ToolbarButton
              active={editor?.isActive({ textAlign: 'left' }) ?? false}
              label='왼쪽 정렬'
              onClick={() => {
                editor?.chain().focus().setTextAlign('left').run();
              }}
            >
              <TextAlignIcon align='left' />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive({ textAlign: 'center' }) ?? false}
              label='가운데 정렬'
              onClick={() => {
                editor?.chain().focus().setTextAlign('center').run();
              }}
            >
              <TextAlignIcon align='center' />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive({ textAlign: 'right' }) ?? false}
              label='오른쪽 정렬'
              onClick={() => {
                editor?.chain().focus().setTextAlign('right').run();
              }}
            >
              <TextAlignIcon align='right' />
            </ToolbarButton>
          </div>

          <div className={styles['toolbarGroup']}>
            <span className={styles['toolbarGroupLabel']}>삽입</span>
            <ToolbarButton
              active={editor?.isActive('link') ?? false}
              label='링크 넣기'
              onClick={handleLinkClick}
              wide
            >
              링크
            </ToolbarButton>
            <ToolbarButton
              disabled={isUploadingImage || !onImageUpload}
              label='이미지 넣기'
              onClick={() => {
                fileInputRef.current?.click();
              }}
              wide
            >
              {isUploadingImage ? '업로드 중' : '이미지'}
            </ToolbarButton>
            <ToolbarButton
              disabled={isSelectionInsideTable}
              label={isSelectionInsideTable ? '표 안에는 표를 넣을 수 없습니다' : '표 넣기'}
              onClick={() => {
                if (!editor || editor.isActive('table')) {
                  return;
                }

                editor.chain().focus().insertTable({ cols: 3, rows: 3, withHeaderRow: true }).run();
              }}
              wide
            >
              표
            </ToolbarButton>
          </div>
        </div>

        <div
          className={styles['editor']}
          onDragEnd={() => {
            internalImageDragRef.current = false;
          }}
          onDragOver={handleEditorDragOver}
          onDragStart={(event) => {
            const target = event.target instanceof Element ? event.target : null;
            internalImageDragRef.current = Boolean(
              target?.closest('[data-resize-container][data-node="image"], img'),
            );
          }}
          onDrop={handleEditorDrop}
          onMouseLeave={() => {
            clearTableAddPreviewHideTimer();
            updateTableAddPreview(HIDDEN_TABLE_ADD_PREVIEW);
            hideTableControls();
          }}
          onMouseMove={handleEditorMouseMove}
          ref={editorFrameRef}
        >
          {tableInlineControls.visible ? (
            <>
              <button
                aria-label='표 이동'
                className={styles['tableMoveHandleButton']}
                onClick={(event) => {
                  event.preventDefault();
                }}
                onPointerDown={handleTableMovePointerDown}
                style={{
                  left: tableInlineControls.moveLeft,
                  top: tableInlineControls.moveTop,
                }}
                title='표 이동: 드래그해서 위치 변경'
                type='button'
              >
                <span aria-hidden='true' className={styles['tableMoveHandleIcon']} />
              </button>
              <button
                aria-label='선택한 열 삭제'
                className={styles['tableColumnDeleteButton']}
                onClick={(event) => {
                  event.preventDefault();
                  if (!window.confirm('선택한 열을 삭제할까요?')) {
                    return;
                  }
                  if (!selectTableCellAtPosition(tableInlineControls.targetCellPosition)) {
                    return;
                  }
                  editor?.chain().focus().deleteColumn().run();
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                style={{
                  left: tableInlineControls.columnDeleteLeft,
                  top: tableInlineControls.columnDeleteTop,
                }}
                title='선택한 열 삭제'
                type='button'
              >
                -
              </button>
              <button
                aria-label='선택한 행 삭제'
                className={styles['tableRowDeleteButton']}
                onClick={(event) => {
                  event.preventDefault();
                  if (!window.confirm('선택한 행을 삭제할까요?')) {
                    return;
                  }
                  if (!selectTableCellAtPosition(tableInlineControls.targetCellPosition)) {
                    return;
                  }
                  editor?.chain().focus().deleteRow().run();
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                style={{
                  left: tableInlineControls.rowDeleteLeft,
                  top: tableInlineControls.rowDeleteTop,
                }}
                title='선택한 행 삭제'
                type='button'
              >
                -
              </button>
              <div
                className={classNames(
                  styles['tableColumnAddZone'],
                  tableAddPreview.column && styles['tableAddZoneVisible'],
                )}
                data-table-add-zone='true'
                style={{
                  height: tableInlineControls.addColumnHeight,
                  left: tableInlineControls.addColumnLeft,
                  top: tableInlineControls.addColumnTop,
                }}
              >
                <button
                  aria-label='오른쪽에 열 추가'
                  className={styles['tableEdgeAddButton']}
                  onClick={(event) => {
                    event.preventDefault();
                    if (!selectTableCellAtPosition(tableInlineControls.targetCellPosition)) {
                      return;
                    }
                    editor?.chain().focus().addColumnAfter().run();
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  title='오른쪽에 열 추가'
                  type='button'
                >
                  +
                </button>
                <span className={styles['tableEdgeTooltip']}>오른쪽에 열 추가</span>
              </div>
              <div
                className={classNames(
                  styles['tableRowAddZone'],
                  tableAddPreview.row && styles['tableAddZoneVisible'],
                )}
                data-table-add-zone='true'
                style={{
                  left: tableInlineControls.addRowLeft,
                  top: tableInlineControls.addRowTop,
                  width: tableInlineControls.addRowWidth,
                }}
              >
                <button
                  aria-label='아래에 행 추가'
                  className={styles['tableEdgeAddButton']}
                  onClick={(event) => {
                    event.preventDefault();
                    if (!selectTableCellAtPosition(tableInlineControls.targetCellPosition)) {
                      return;
                    }
                    editor?.chain().focus().addRowAfter().run();
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  title='아래에 행 추가'
                  type='button'
                >
                  +
                </button>
                <span className={styles['tableEdgeTooltip']}>아래에 행 추가</span>
              </div>
              <button
                aria-label='표 전체 크기 조절'
                className={styles['tableCornerResizeZone']}
                onPointerDown={handleTableResizePointerDown}
                style={{
                  left: tableInlineControls.resizeLeft,
                  top: tableInlineControls.resizeTop,
                }}
                tabIndex={-1}
                title='표 전체 크기 조절'
                type='button'
              />
            </>
          ) : null}
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
        multiple
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
