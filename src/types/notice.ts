export type NoticeScope = 'GLOBAL' | 'PROGRAM';

export interface NoticeAttachmentItem {
  fileName: string;
  fileSize: number;
  fileUrl: string;
  id?: number;
  mimeType: string | null;
  url: string;
}

export interface NoticeItem {
  id: number;
  scope: NoticeScope;
  programId: number | null;
  programTitle: string | null;
  title: string;
  content: string;
  attachments?: NoticeAttachmentItem[];
  pinned: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoticeAttachmentPayload {
  fileName: string;
  fileSize: number;
  fileUrl: string;
  mimeType: string | null;
}

export interface AdminNoticeCreatePayload {
  scope: 'GLOBAL';
  programId: null;
  title: string;
  content: string;
  attachments?: NoticeAttachmentPayload[];
  pinned: boolean;
  published: boolean;
}

export interface AdminNoticeUpdatePayload {
  scope: 'GLOBAL';
  programId: null;
  title: string;
  content: string;
  attachments?: NoticeAttachmentPayload[];
  pinned: boolean;
}
