export type AdminProgramType = 'ONLINE' | 'OFFLINE' | 'HYBRID';
export type AdminProgramLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type AdminProgramCatalogStatus = 'OPEN' | 'SCHEDULED' | 'CLOSED' | 'FULL';
export type AdminProgramAccessPolicy = 'COHORT' | 'FIXED_DURATION' | 'UNLIMITED';

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
  thumbnailUrl: string | null;
  programType: AdminProgramType;
  level: AdminProgramLevel | null;
  instructorName: string | null;
  price: number;
  salePrice: number | null;
  maxStudents: number | null;
  currentStudents: number;
  full: boolean;
  published: boolean;
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

export interface AdminProgramDetail {
  id: number;
  categoryId: number;
  categoryName: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  programType: AdminProgramType;
  level: AdminProgramLevel | null;
  instructorName: string | null;
  instructorBio: string | null;
  price: number;
  salePrice: number | null;
  maxStudents: number | null;
  currentStudents: number;
  full: boolean;
  published: boolean;
  catalogStatus: AdminProgramCatalogStatus;
  saleStartAt: string | null;
  saleEndAt: string | null;
  accessDays: number | null;
  accessPolicy: AdminProgramAccessPolicy | null;
  learningStartAt: string | null;
  learningEndAt: string | null;
  learningPoints: string[];
  recommendedFor: string[];
  checklists: string[];
  summaryItems: AdminProgramSummaryInfoItem[];
  faqs: AdminProgramFaqItem[];
  deletable?: boolean;
  deleteBlockedReason?: string | null;
}

export interface AdminProgramUpsertPayload {
  categoryId: number;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  programType: AdminProgramType;
  level: AdminProgramLevel | null;
  instructorName: string | null;
  instructorBio: string | null;
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
  recommendedFor: string[];
  checklists: string[];
  summaryItems: AdminProgramSummaryInfoItem[];
  faqs: AdminProgramFaqItem[];
}
