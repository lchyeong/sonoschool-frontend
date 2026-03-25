export type NoticeScope = 'GLOBAL' | 'PROGRAM';

export interface NoticeItem {
  id: number;
  scope: NoticeScope;
  programId: number | null;
  programTitle: string | null;
  title: string;
  content: string;
  pinned: boolean;
  popup: boolean;
  published: boolean;
  visibleStartAt: string | null;
  visibleEndAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNoticeCreatePayload {
  scope: 'GLOBAL';
  programId: null;
  title: string;
  content: string;
  pinned: boolean;
  popup: boolean;
  published: boolean;
  visibleStartAt: string | null;
  visibleEndAt: string | null;
}

export interface AdminNoticeUpdatePayload {
  scope: 'GLOBAL';
  programId: null;
  title: string;
  content: string;
  pinned: boolean;
  popup: boolean;
  visibleStartAt: string | null;
  visibleEndAt: string | null;
}
