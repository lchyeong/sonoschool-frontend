export type ProgramQnaScope = 'GLOBAL' | 'PROGRAM';
export type ProgramQnaAuthorType = 'ADMIN' | 'ENROLLED' | 'MEMBER';

export interface ProgramQnaReplyItem {
  id: number;
  authorName: string;
  authorType: ProgramQnaAuthorType;
  content: string;
  mine: boolean;
  adminReply: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramQnaThreadItem {
  id: number;
  scope: ProgramQnaScope;
  programId: number | null;
  programTitle: string | null;
  authorName: string;
  authorType: ProgramQnaAuthorType;
  title: string;
  content: string;
  mine: boolean;
  answered: boolean;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  replies: ProgramQnaReplyItem[];
}

export interface ProgramQnaSummary {
  totalThreadCount: number;
  answeredThreadCount: number;
  latestThreadCreatedAt: string | null;
}

export interface ProgramQnaPageResponse {
  content: ProgramQnaThreadItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface ProgramQnaThreadCreatePayload {
  title: string;
  content: string;
}

export interface ProgramQnaReplyCreatePayload {
  content: string;
}
