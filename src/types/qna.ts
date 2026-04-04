export type QuestionScope = 'GLOBAL';

export interface QuestionReplyItem {
  id: number;
  authorName: string;
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
  title: string;
  content: string;
  mine: boolean;
  answered: boolean;
  createdAt: string;
  updatedAt: string;
  replies: QuestionReplyItem[];
}

export interface QuestionCreatePayload {
  title: string;
  content: string;
}

export interface QuestionReplyCreatePayload {
  content: string;
}
