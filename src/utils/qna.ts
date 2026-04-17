import {
  QNA_CONTENT_MAX_LENGTH,
  QNA_LIST_CONTENT_PREVIEW_LENGTH,
  QNA_TITLE_MAX_LENGTH,
} from '@/constants/qna';

export const buildQnaPreview = (
  value: string,
  maxLength = QNA_LIST_CONTENT_PREVIEW_LENGTH,
): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
};

export const maskQnaAuthorName = (value: string): string => {
  if (value.includes('관리자') || value.includes('운영팀')) {
    return value;
  }

  const characters = Array.from(value.trim());

  if (characters.length <= 1) {
    return value;
  }

  if (characters.length === 2) {
    return `${characters[0]}*`;
  }

  return `${characters[0]}${'*'.repeat(characters.length - 2)}${characters.at(-1) ?? ''}`;
};

export const resolveQnaAuthorName = (
  authorName: string,
  isMine: boolean,
  currentDisplayName: string,
): string => {
  if (!isMine) {
    return authorName;
  }

  const normalizedDisplayName = currentDisplayName.trim();
  return normalizedDisplayName || authorName;
};

export const validateQnaQuestionDraft = (title: string, content: string): string | null => {
  if (!title || !content) {
    return '질문 제목과 내용을 모두 입력해 주세요.';
  }

  if (title.length > QNA_TITLE_MAX_LENGTH) {
    return `질문 제목은 ${String(QNA_TITLE_MAX_LENGTH)}자 이하로 입력해 주세요.`;
  }

  if (content.length > QNA_CONTENT_MAX_LENGTH) {
    return `질문 내용은 ${String(QNA_CONTENT_MAX_LENGTH)}자 이하로 입력해 주세요.`;
  }

  return null;
};
