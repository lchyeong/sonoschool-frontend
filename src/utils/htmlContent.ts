import DOMPurify from 'dompurify';

const parseHtml = (html: string): Document | null => {
  if (typeof DOMParser === 'undefined') {
    return null;
  }

  return new DOMParser().parseFromString(html, 'text/html');
};

const escapeHtmlAttribute = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

export const extractTextFromHtml = (html: string): string => {
  const document = parseHtml(html);

  if (!document) {
    return html.replace(/<[^>]+>/g, ' ');
  }

  return document.body.textContent;
};

export const hasRichTextContent = (html: string): boolean => {
  const document = parseHtml(html);

  if (!document) {
    return extractTextFromHtml(html).trim().length > 0 || /<img\b/i.test(html);
  }

  return (
    document.body.textContent.trim().length > 0 ||
    document.body.querySelector('img, table, ul, ol, blockquote') !== null
  );
};

export const summarizeHtmlContent = (html: string, maxLength: number): string => {
  const normalized = extractTextFromHtml(html).replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '본문이 없습니다.';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
};

export const sanitizeRichTextHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['style', 'target', 'rel', 'colspan', 'rowspan', 'width', 'height'],
  });
};

export interface HtmlImageMeta {
  alt: string;
  src: string;
}

export const extractFirstImageFromHtml = (html: string): HtmlImageMeta | null => {
  const document = parseHtml(html);

  if (!document) {
    const srcMatch = html.match(/<img[^>]*src=["']([^"']+)["']/i);
    const altMatch = html.match(/<img[^>]*alt=["']([^"']*)["']/i);

    if (!srcMatch?.[1]) {
      return null;
    }

    return {
      alt: altMatch?.[1] ?? '',
      src: srcMatch[1],
    };
  }

  const image = document.body.querySelector('img');
  if (!image) {
    return null;
  }

  const src = image.getAttribute('src')?.trim() ?? '';
  if (!src) {
    return null;
  }

  return {
    alt: image.getAttribute('alt')?.trim() ?? '',
    src,
  };
};

export const buildSingleImageHtml = (src: string, alt: string): string => {
  const normalizedSrc = src.trim();
  if (!normalizedSrc) {
    return '';
  }

  const normalizedAlt = alt.trim();

  return `<p><img src="${escapeHtmlAttribute(normalizedSrc)}" alt="${escapeHtmlAttribute(normalizedAlt)}" /></p>`;
};
