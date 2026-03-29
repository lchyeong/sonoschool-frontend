import type {
  ProgramCurriculumTrack,
  ProgramFaqItem,
  ProgramInfoItem,
} from '@/types/programCatalog';

export type AdminProgramFormat = 'online' | 'offline' | 'hybrid';
export type AdminProgramStatus = 'draft' | 'published' | 'hidden';
export type AdminProgramOrigin = 'managed' | 'site';
export type AdminProgramAccessPolicy = 'cohort' | 'limited-window' | 'unlimited';
export type AdminProgramMenuStatus = 'published' | 'hidden';

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
