import type {
  ProgramCurriculumTrack,
  ProgramFaqItem,
  ProgramInfoItem,
} from '@/types/programCatalog';

export type AdminSummaryTone = 'brand' | 'accent' | 'neutral' | 'danger';
export type AdminNoticeCategory = '운영' | '학사' | '이벤트';
export type AdminQnaStatus = 'waiting' | 'answered';
export type AdminResourceVisibility = 'public' | 'students-only';
export type AdminProgramFormat = 'online' | 'offline' | 'hybrid';
export type AdminProgramStatus = 'draft' | 'published' | 'hidden';
export type AdminProgramOrigin = 'managed' | 'site';
export type AdminProgramAccessPolicy = 'cohort' | 'limited-window' | 'unlimited';
export type AdminProgramMenuStatus = 'published' | 'hidden';
export type AdminReviewStatus = 'published' | 'draft';

export interface AdminSummaryCard {
  id: string;
  label: string;
  value: string;
  description: string;
  tone: AdminSummaryTone;
}

export interface AdminNoticeItem {
  id: string;
  category: AdminNoticeCategory;
  title: string;
  isPinned: boolean;
  publishedAt: string;
  status: 'published' | 'scheduled';
}

export interface AdminQnaReply {
  authorName: string;
  content: string;
  repliedAt: string;
}

export interface AdminQnaThread {
  id: string;
  category: string;
  authorName: string;
  question: string;
  submittedAt: string;
  status: AdminQnaStatus;
  reply?: AdminQnaReply | undefined;
}

export interface AdminResourceItem {
  id: string;
  title: string;
  description: string;
  attachmentName: string;
  attachmentSizeLabel: string;
  publishedAt: string;
  visibility: AdminResourceVisibility;
}

export interface AdminReviewItem {
  id: string;
  title: string;
  summary: string;
  educatorName: string;
  publishedAt: string;
  status: AdminReviewStatus;
}

export interface AdminProgramItem {
  id: string;
  title: string;
  slug: string;
  format: AdminProgramFormat;
  status: AdminProgramStatus;
  price: number;
  priceLabel: string;
  soldCount: number;
  monthlySoldCount: number;
  capacity: number | null;
  remainingSeats: number | null;
  remainingSeatsLabel: string;
  updatedAt: string;
}

export interface AdminProgramCollectionOption {
  id: string;
  label: string;
  labelPath: string;
  path: string;
  description: string;
  depth: number;
  lectureCount: number;
}

export interface AdminProgramDetailItem {
  accessPolicy: AdminProgramAccessPolicy;
  canDelete: boolean;
  canDuplicate: boolean;
  canEdit: boolean;
  id: string;
  origin: AdminProgramOrigin;
  title: string;
  slug: string;
  parentCollectionPath: string;
  parentCollectionLabel: string;
  publicPath: string;
  description: string;
  heroImageSrc: string;
  heroImageAlt: string;
  format: AdminProgramFormat;
  formatLabel: string;
  registrationEndDate: string | null;
  registrationStartDate: string | null;
  learningEndDate: string | null;
  learningStartDate: string | null;
  difficultyLabel: string;
  durationLabel: string;
  tuitionLabel: string;
  scheduleLabel: string;
  status: AdminProgramStatus;
  originalPrice: number;
  originalPriceLabel: string;
  price: number;
  priceLabel: string;
  discountRateLabel: string;
  discountedPriceLabel: string;
  monthlyInstallmentLabel: string;
  soldCount: number;
  monthlySoldCount: number;
  capacity: number | null;
  remainingSeats: number | null;
  remainingSeatsLabel: string;
  tags: string[];
  hashtagLabels: string[];
  learningPoints: string[];
  recommendedFor: string[];
  preparationChecklist: string[];
  registrationPeriodLabel: string;
  operationPeriodLabel?: string | undefined;
  stats: ProgramInfoItem[];
  faqItems: ProgramFaqItem[];
  curriculumTrack: ProgramCurriculumTrack;
  updatedAt: string;
}

export interface AdminProgramListItem {
  accessPolicy: AdminProgramAccessPolicy;
  canDelete: boolean;
  canDuplicate: boolean;
  canEdit: boolean;
  format: AdminProgramFormat;
  formatLabel: string;
  id: string;
  isPublishReady: boolean;
  missingFieldCount: number;
  origin: AdminProgramOrigin;
  parentCollectionLabel: string;
  parentCollectionPath: string;
  priceLabel: string;
  publicPath: string;
  remainingSeatsLabel: string;
  scheduleSummary: string;
  slug: string;
  status: AdminProgramStatus;
  title: string;
  updatedAt: string;
}

export interface AdminProgramsResponse {
  items: AdminProgramListItem[];
}

export interface AdminProgramDetailResponse {
  isPublishReady: boolean;
  missingFieldLabels: string[];
  program: AdminProgramDetailItem;
}

export interface AdminProgramMenuItem {
  childCollectionCount: number;
  depth: number;
  description: string;
  id: string;
  label: string;
  labelPath: string;
  lectureCount: number;
  parentId: string | null;
  path: string;
  slug: string;
  status: AdminProgramMenuStatus;
}

export interface AdminProgramMenuTreeItem {
  childCollectionCount: number;
  depth: number;
  description: string;
  effectiveStatus: AdminProgramMenuStatus;
  id: string;
  isLeafMenu: boolean;
  label: string;
  labelPath: string;
  linkedProgramCount: number;
  parentId: string | null;
  path: string;
  slug: string;
  status: AdminProgramMenuStatus;
  totalProgramCount: number;
}

export interface AdminProgramMenuTreeResponse {
  items: AdminProgramMenuTreeItem[];
  maxDepth: number;
  topLevelLimit: number;
}

export interface AdminProgramMenuParentOption {
  depth: number;
  id: string;
  isLeafMenu: boolean;
  label: string;
  labelPath: string;
  path: string;
}

export interface AdminProgramMenuLinkedProgram {
  formatLabel: string;
  id: string;
  origin: AdminProgramOrigin;
  publicPath: string;
  scheduleLabel: string;
  slug: string;
  status: AdminProgramStatus;
  title: string;
  updatedAt: string;
}

export interface AdminProgramMenuDetailResponse {
  allowedParentOptions: AdminProgramMenuParentOption[];
  canCreateChildMenu: boolean;
  canCreateProgram: boolean;
  canDelete: boolean;
  menu: AdminProgramMenuTreeItem;
  linkedPrograms: AdminProgramMenuLinkedProgram[];
  siblingCount: number;
  siblingIndex: number;
}

export interface AdminSalesOverview {
  grossRevenueLabel: string;
  monthlyRevenueLabel: string;
  totalOrdersLabel: string;
  bestSellerTitle: string;
}

export interface AdminSalesRow {
  id: string;
  programTitle: string;
  format: AdminProgramFormat;
  status: AdminProgramStatus;
  soldCount: number;
  monthlySoldCount: number;
  totalRevenueLabel: string;
  monthlyRevenueLabel: string;
  remainingSeatsLabel: string;
}

export interface AdminConsoleResponse {
  adminDisplayName: string;
  summaryCards: AdminSummaryCard[];
  notices: AdminNoticeItem[];
  programMenus: AdminProgramMenuItem[];
  qnaThreads: AdminQnaThread[];
  resources: AdminResourceItem[];
  reviewPosts: AdminReviewItem[];
  programCollectionOptions: AdminProgramCollectionOption[];
  managedPrograms: AdminProgramDetailItem[];
  programs: AdminProgramItem[];
  salesOverview: AdminSalesOverview;
  salesRows: AdminSalesRow[];
}

export interface AdminLoginRequest {
  identifier: string;
  password: string;
}

export interface AdminLoginResponse {
  ok: true;
  adminDisplayName: string;
}

export interface CreateAdminNoticePayload {
  category: AdminNoticeCategory;
  isPinned: boolean;
  title: string;
}

export interface ReplyAdminQnaPayload {
  content: string;
}

export interface CreateAdminResourcePayload {
  attachmentName: string;
  attachmentSizeLabel: string;
  description: string;
  title: string;
  visibility: AdminResourceVisibility;
}

export interface CreateAdminReviewPayload {
  summary: string;
  title: string;
}

export interface UpsertAdminProgramPayload {
  parentCollectionPath: string;
  capacity: number | null;
  accessPolicy: AdminProgramAccessPolicy;
  format: AdminProgramFormat;
  registrationEndDate: string | null;
  registrationStartDate: string | null;
  learningEndDate: string | null;
  learningStartDate: string | null;
  difficultyLabel: string;
  originalPrice: number;
  price: number;
  slug: string;
  description: string;
  heroImageSrc: string;
  heroImageAlt: string;
  operationPeriodLabel?: string | undefined;
  registrationPeriodLabel: string;
  tags: string[];
  hashtagLabels: string[];
  learningPoints: string[];
  recommendedFor: string[];
  preparationChecklist: string[];
  stats: ProgramInfoItem[];
  faqItems: ProgramFaqItem[];
  curriculumTrack: ProgramCurriculumTrack;
  title: string;
}

export interface CreateAdminProgramDraftPayload {
  accessPolicy: AdminProgramAccessPolicy;
  capacity: number | null;
  format: AdminProgramFormat;
  learningEndDate: string | null;
  learningStartDate: string | null;
  originalPrice: number;
  parentCollectionPath: string;
  price: number;
  registrationEndDate: string | null;
  registrationStartDate: string | null;
  slug: string;
  sourceProgramId: string | null;
  title: string;
}

export interface CreateAdminProgramDraftResponse {
  id: string;
}

export interface CreateAdminProgramMenuPayload {
  description: string;
  label: string;
  parentId: string | null;
  slug: string;
  status: AdminProgramMenuStatus;
}

export interface UpdateAdminProgramMenuPayload {
  description: string;
  label: string;
  slug: string;
  status: AdminProgramMenuStatus;
}

export interface MoveAdminProgramMenuPayload {
  parentId: string | null;
}

export interface ReorderAdminProgramMenuPayload {
  direction: 'down' | 'up';
}

export interface MoveAdminProgramPayload {
  targetCollectionPath: string;
}
