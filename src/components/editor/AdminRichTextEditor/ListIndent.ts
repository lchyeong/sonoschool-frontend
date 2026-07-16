import type { Editor } from '@tiptap/core';

export const canIndentListItem = (editor: Editor | null): boolean => {
  return editor?.can().sinkListItem('listItem') ?? false;
};

export const canOutdentListItem = (editor: Editor | null): boolean => {
  return editor?.can().liftListItem('listItem') ?? false;
};

export const indentListItem = (editor: Editor | null): boolean => {
  return editor?.chain().sinkListItem('listItem').run() ?? false;
};

export const outdentListItem = (editor: Editor | null): boolean => {
  return editor?.chain().liftListItem('listItem').run() ?? false;
};
