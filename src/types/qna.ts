export type QuestionScope = 'GLOBAL' | 'PROGRAM';
export type QuestionAuthorType = 'ADMIN' | 'ENROLLED' | 'MEMBER';

export interface QuestionReplyItem {
  id: number;
  authorName: string;
  authorType: QuestionAuthorType;
  content: string;
  mine: boolean;
  adminReply: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionItem {
  id: number;
  scope: QuestionScope;
  programId: number | null;
  programTitle: string | null;
  authorName: string;
  authorType: QuestionAuthorType;
  title: string;
  content: string;
  mine: boolean;
  notice: boolean;
  noticeSortOrder?: number;
  answered: boolean;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  replies: QuestionReplyItem[];
}

export interface QuestionCreatePayload {
  title: string;
  content: string;
}

export interface AdminQuestionNoticeCreatePayload {
  title: string;
  content: string;
}

export interface AdminQuestionNoticeReorderItem {
  id: number;
  sortOrder: number;
}

export interface QuestionReplyCreatePayload {
  content: string;
}
