export type ProgramCommunityScope = 'GLOBAL' | 'PROGRAM';
export type ProgramCommunityAuthorType = 'ADMIN' | 'ENROLLED' | 'MEMBER';
export type ProgramCommunityLectureType =
  | 'VIDEO'
  | 'OFFLINE'
  | 'PRACTICUM'
  | 'PROBLEM'
  | 'RESOURCE';

export interface ProgramCommunityReplyItem {
  id: number;
  authorName: string;
  authorType: ProgramCommunityAuthorType;
  content: string;
  mine: boolean;
  adminReply: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramCommunityThreadItem {
  id: number;
  scope: ProgramCommunityScope;
  programId: number | null;
  programTitle: string | null;
  lectureId: number | null;
  lectureTitle: string | null;
  lectureType: ProgramCommunityLectureType | null;
  authorName: string;
  authorType: ProgramCommunityAuthorType;
  title: string;
  content: string;
  mine: boolean;
  answered: boolean;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  replies: ProgramCommunityReplyItem[];
}

export interface ProgramCommunitySummary {
  totalThreadCount: number;
  answeredThreadCount: number;
  latestThreadCreatedAt: string | null;
}

export interface ProgramCommunityContext {
  programId: number;
  currentLectureId: number | null;
  programThreadCount: number;
  currentLectureThreadCount: number;
}

export interface ProgramCommunityPageResponse {
  content: ProgramCommunityThreadItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface ProgramCommunityThreadCreatePayload {
  lectureId?: number | null;
  title: string;
  content: string;
}

export interface ProgramCommunityReplyCreatePayload {
  content: string;
}
