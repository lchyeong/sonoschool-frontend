import type { NoticeAttachmentPayload, NoticeItem } from '@/types/notice';

export type NoticeFilter = 'all' | 'published' | 'private' | 'pinned';

export interface NoticeFormState {
  attachments: NoticeAttachmentPayload[];
  content: string;
  pinned: boolean;
  published: boolean;
  title: string;
}

export interface NoticeSummary {
  privateCount: number;
  pinnedCount: number;
  publishedCount: number;
  totalCount: number;
}

export const EMPTY_NOTICE_FORM: NoticeFormState = {
  attachments: [],
  content: '',
  pinned: false,
  published: true,
  title: '',
};

export const formatNoticeDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    hour12: false,
    timeStyle: 'short',
  }).format(new Date(value));
};

export const getGlobalNotices = (notices: readonly NoticeItem[] | undefined): NoticeItem[] => {
  return (notices ?? []).filter((notice) => notice.scope === 'GLOBAL');
};

export const filterNotices = (
  notices: readonly NoticeItem[],
  noticeFilter: NoticeFilter,
): NoticeItem[] => {
  if (noticeFilter === 'published') {
    return notices.filter((notice) => notice.published);
  }

  if (noticeFilter === 'private') {
    return notices.filter((notice) => !notice.published);
  }

  if (noticeFilter === 'pinned') {
    return notices.filter((notice) => notice.pinned);
  }

  return [...notices];
};

export const summarizeNotices = (notices: readonly NoticeItem[]): NoticeSummary => {
  return {
    privateCount: notices.filter((notice) => !notice.published).length,
    pinnedCount: notices.filter((notice) => notice.pinned).length,
    publishedCount: notices.filter((notice) => notice.published).length,
    totalCount: notices.length,
  };
};

export const createNoticeFormState = (
  notice:
    | Pick<NoticeItem, 'attachments' | 'content' | 'pinned' | 'published' | 'title'>
    | null
    | undefined,
): NoticeFormState => {
  if (!notice) {
    return EMPTY_NOTICE_FORM;
  }

  return {
    attachments: (notice.attachments ?? []).map((attachment) => ({
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType,
    })),
    content: notice.content,
    pinned: notice.pinned,
    published: notice.published,
    title: notice.title,
  };
};
