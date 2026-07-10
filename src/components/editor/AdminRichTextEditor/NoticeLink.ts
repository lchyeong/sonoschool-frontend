import type { Editor } from '@tiptap/core';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const EXPLICIT_PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const HOST_WITH_PORT_PATTERN = /^[^/?#]+:\d+(?:[/?#]|$)/;
const RELATIVE_URL_PATTERN = /^(?:#|\.{1,2}\/|\/(?!\/))/;

const hasControlOrWhitespace = (value: string): boolean => {
  return Array.from(value).some((character) => {
    const characterCode = character.charCodeAt(0);
    return /\s/u.test(character) || characterCode <= 31 || characterCode === 127;
  });
};

export const normalizeNoticeLinkUrl = (value: string): string | null => {
  const trimmedValue = value.trim();

  if (!trimmedValue || hasControlOrWhitespace(trimmedValue)) {
    return null;
  }

  if (RELATIVE_URL_PATTERN.test(trimmedValue)) {
    return trimmedValue;
  }

  let candidate = trimmedValue;

  if (candidate.startsWith('//')) {
    candidate = `https:${candidate}`;
  } else if (!EXPLICIT_PROTOCOL_PATTERN.test(candidate) || HOST_WITH_PORT_PATTERN.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);

    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
      return null;
    }

    if ((url.protocol === 'http:' || url.protocol === 'https:') && !url.hostname) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
};

export const isAllowedNoticeLinkUrl = (value: string): boolean => {
  return normalizeNoticeLinkUrl(value) !== null;
};

export const applyNoticeLink = (editor: Editor, value: string): string | null => {
  const normalizedUrl = normalizeNoticeLinkUrl(value);
  if (!normalizedUrl) {
    return null;
  }

  let chain = editor.chain().focus();

  if (editor.isActive('link')) {
    chain = chain.extendMarkRange('link');
  }

  const didApply = chain
    .setLink({
      href: normalizedUrl,
      rel: 'noopener noreferrer nofollow',
      target: '_blank',
    })
    .run();

  return didApply ? normalizedUrl : null;
};

export const removeNoticeLink = (editor: Editor): boolean => {
  return editor.chain().focus().extendMarkRange('link').unsetLink().run();
};
