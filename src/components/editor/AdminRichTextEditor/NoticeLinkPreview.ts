import { normalizeNoticeLinkUrl } from './NoticeLink';

export interface NoticeLinkPreviewMetadata {
  description: string;
  domain: string;
  imageUrl: string | null;
  siteName: string;
  title: string;
  url: string;
}

interface ResolveNoticeLinkPreviewOptions {
  fetcher?: typeof fetch;
  locationOrigin?: string;
}

const SONO_SCHOOL_HOSTS = new Set(['sonoschool.kr', 'www.sonoschool.kr']);
const SONO_SCHOOL_DESCRIPTION =
  'SONO SCHOOL은 초음파 교육과 학습 정보를 제공하는 교육 사이트입니다.';
const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_SITE_NAME_LENGTH = 100;

const normalizeText = (value: string | null | undefined, maxLength: number): string => {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const resolveWebUrl = (value: string, baseUrl?: string): string | null => {
  try {
    const url = baseUrl ? new URL(value, baseUrl) : new URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
};

const readMetaContent = (document: Document, selectors: string[]): string => {
  for (const selector of selectors) {
    const content = document.querySelector<HTMLMetaElement>(selector)?.content;

    if (content?.trim()) {
      return content;
    }
  }

  return '';
};

const createFallbackMetadata = (url: URL): NoticeLinkPreviewMetadata => {
  const isSonoSchool = SONO_SCHOOL_HOSTS.has(url.hostname.toLowerCase());

  if (isSonoSchool) {
    return {
      description: SONO_SCHOOL_DESCRIPTION,
      domain: url.hostname.replace(/^www\./i, ''),
      imageUrl: `${url.origin}/SRDMS_OG.png`,
      siteName: 'SONO SCHOOL',
      title: 'SONO SCHOOL',
      url: url.href,
    };
  }

  return {
    description: '',
    domain: url.hostname.replace(/^www\./i, ''),
    imageUrl: null,
    siteName: url.hostname.replace(/^www\./i, ''),
    title: url.hostname.replace(/^www\./i, ''),
    url: url.href,
  };
};

export const parseNoticeLinkPreviewHtml = (
  html: string,
  pageUrl: string,
): NoticeLinkPreviewMetadata | null => {
  if (typeof DOMParser === 'undefined') {
    return null;
  }

  const normalizedPageUrl = resolveWebUrl(pageUrl);
  if (!normalizedPageUrl) {
    return null;
  }

  const inputUrl = new URL(normalizedPageUrl);
  const document = new DOMParser().parseFromString(html, 'text/html');
  const canonicalUrlValue = readMetaContent(document, ['meta[property="og:url"]']);
  const canonicalUrl = resolveWebUrl(canonicalUrlValue, inputUrl.href) ?? inputUrl.href;
  const canonical = new URL(canonicalUrl);
  const imageValue = readMetaContent(document, [
    'meta[property="og:image:secure_url"]',
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
  ]);
  const imageUrl = imageValue ? resolveWebUrl(imageValue, canonical.href) : null;
  const siteName = normalizeText(
    readMetaContent(document, ['meta[property="og:site_name"]']) || canonical.hostname,
    MAX_SITE_NAME_LENGTH,
  );
  const title = normalizeText(
    readMetaContent(document, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
      document.title ||
      siteName,
    MAX_TITLE_LENGTH,
  );
  const description = normalizeText(
    readMetaContent(document, [
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]',
    ]),
    MAX_DESCRIPTION_LENGTH,
  );

  return {
    description,
    domain: canonical.hostname.replace(/^www\./i, ''),
    imageUrl,
    siteName,
    title: title || canonical.hostname.replace(/^www\./i, ''),
    url: canonical.href,
  };
};

export const resolveNoticeLinkPreview = async (
  value: string,
  options: ResolveNoticeLinkPreviewOptions = {},
): Promise<NoticeLinkPreviewMetadata | null> => {
  const normalizedUrl = normalizeNoticeLinkUrl(value);
  if (!normalizedUrl) {
    return null;
  }

  const locationOrigin =
    options.locationOrigin ??
    (typeof window === 'undefined' ? 'https://sonoschool.kr' : window.location.origin);
  const absoluteUrl = resolveWebUrl(normalizedUrl, locationOrigin);
  if (!absoluteUrl) {
    return null;
  }

  const url = new URL(absoluteUrl);
  const fallback = createFallbackMetadata(url);

  if (url.origin !== locationOrigin) {
    return fallback;
  }

  const fetcher = options.fetcher ?? globalThis.fetch;

  try {
    const response = await fetcher(url.href, {
      credentials: 'same-origin',
      headers: {
        Accept: 'text/html',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return fallback;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.toLowerCase().includes('text/html')) {
      return fallback;
    }

    return parseNoticeLinkPreviewHtml(await response.text(), url.href) ?? fallback;
  } catch {
    return fallback;
  }
};
