import type { AdminResourceVisibility } from '@/types/adminResources';

export type AdminProgramType = 'ONLINE' | 'OFFLINE' | 'HYBRID' | 'PROBLEM_SOLVING';
export type AdminProgramLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type AdminProgramCatalogStatus = 'OPEN' | 'STARTED' | 'CLOSED' | 'ENDED' | 'FULL';
export type AdminProgramAccessPolicy = 'FIXED_DURATION' | 'ROLLING_DAYS' | 'UNLIMITED';
export type AdminProgramTagType = 'FEATURE' | 'FORMAT' | 'LEVEL' | 'TARGET' | 'TOPIC';
export type AdminProgramOperationStatus = 'NORMAL' | 'CLOSURE_CONFIRMED';
export type AdminProgramListSortMode = 'ENROLLMENT_MANAGEMENT';

export interface AdminProgramCategoryTreeItem {
  id: number;
  name: string;
  slug: string;
  depth: number;
  sortOrder: number;
  active: boolean;
  children: AdminProgramCategoryTreeItem[];
}

export interface AdminProgramCategoryOption {
  id: number;
  name: string;
  depth: number;
  label: string;
  pathLabel: string;
  selectable: boolean;
}

export interface AdminProgramListItem {
  id: number;
  categoryId: number;
  categoryName: string;
  title: string;
  slug: string;
  publicPath?: string | null;
  thumbnailUrl: string | null;
  thumbnailPreviewUrl?: string | null;
  programType: AdminProgramType;
  level: AdminProgramLevel | null;
  price: number;
  salePrice: number | null;
  maxStudents: number | null;
  currentStudents: number;
  activeEnrollmentCount?: number | null;
  full: boolean;
  published: boolean;
  featured: boolean;
  operationStatus?: AdminProgramOperationStatus | null;
  closedAt?: string | null;
  closureCandidate?: boolean;
  closureCandidateReason?: string | null;
  catalogStatus: AdminProgramCatalogStatus;
  saleStartAt: string | null;
  saleEndAt: string | null;
  deletable?: boolean;
  deleteBlockedReason?: string | null;
}

export interface AdminProgramSummaryInfoItem {
  label: string;
  value: string;
}

export interface AdminProgramFaqItem {
  question: string;
  answer: string;
}

export interface AdminProgramTag {
  active: boolean;
  createdAt: string;
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  type: AdminProgramTagType;
  updatedAt: string;
}

export interface AdminProgramDocument {
  createdAt: string;
  description: string | null;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  id: number;
  lectureId: number | null;
  lectureTitle: string | null;
  mimeType: string | null;
  programId: number | null;
  programTitle: string | null;
  scope: 'GLOBAL' | 'PROGRAM';
  sortOrder: number;
  title: string;
  visibility: AdminResourceVisibility;
}

export interface AdminProgramDetail {
  id: number;
  categoryId: number;
  categoryName: string;
  title: string;
  slug: string;
  publicPath?: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  thumbnailPreviewUrl?: string | null;
  thumbnailCropOffsetX?: number | null;
  thumbnailCropOffsetY?: number | null;
  thumbnailCropZoom?: number | null;
  programType: AdminProgramType;
  level: AdminProgramLevel | null;
  price: number;
  salePrice: number | null;
  maxStudents: number | null;
  currentStudents: number;
  activeEnrollmentCount?: number | null;
  full: boolean;
  published: boolean;
  featured: boolean;
  operationStatus?: AdminProgramOperationStatus | null;
  closedAt?: string | null;
  closeReason?: string | null;
  closeMemo?: string | null;
  closureCandidate?: boolean;
  closureCandidateReason?: string | null;
  catalogStatus: AdminProgramCatalogStatus;
  saleStartAt: string | null;
  saleEndAt: string | null;
  accessDays: number | null;
  accessPolicy: AdminProgramAccessPolicy | null;
  learningStartAt: string | null;
  learningEndAt: string | null;
  learningPoints: string[];
  learningOutcomes: AdminProgramSummaryInfoItem[];
  recommendedFor: string[];
  checklists: string[];
  summaryItems: AdminProgramSummaryInfoItem[];
  faqs: AdminProgramFaqItem[];
  tags?: AdminProgramTag[] | undefined;
  documents: AdminProgramDocument[];
  deletable?: boolean;
  deleteBlockedReason?: string | null;
}

export interface AdminProgramUpsertPayload {
  categoryId: number;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  thumbnailCropOffsetX: number | null;
  thumbnailCropOffsetY: number | null;
  thumbnailCropZoom: number | null;
  programType: AdminProgramType;
  level: AdminProgramLevel | null;
  price: number;
  salePrice: number | null;
  maxStudents: number | null;
  saleStartAt: string | null;
  saleEndAt: string | null;
  accessDays: number | null;
  accessPolicy: AdminProgramAccessPolicy | null;
  learningStartAt: string | null;
  learningEndAt: string | null;
  learningPoints: string[];
  learningOutcomes: AdminProgramSummaryInfoItem[];
  recommendedFor: string[];
  checklists: string[];
  summaryItems: AdminProgramSummaryInfoItem[];
  faqs: AdminProgramFaqItem[];
}
