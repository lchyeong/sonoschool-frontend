import axios from 'axios';
import { z } from 'zod';

import axiosInstance from '@/api/axiosInstance';
import { shouldUseMockFallback } from '@/api/fallback';
import { http } from '@/api/http';
import {
  createMockAdminNotice,
  createMockAdminProgram,
  createMockAdminProgramDraftItem,
  createMockAdminProgramMenuItem,
  createMockAdminResource,
  createMockAdminReview,
  deleteMockAdminProgram,
  deleteMockAdminProgramMenuItem,
  getMockAdminConsole,
  getMockAdminProgramDetailResponse,
  getMockAdminProgramMenuDetailResponse,
  getMockAdminProgramMenuTreeResponse,
  getMockAdminProgramsResponse,
  hideMockAdminProgramItem,
  moveMockAdminProgramItem,
  moveMockAdminProgramMenuItem,
  publishMockAdminProgramItem,
  reorderMockAdminProgramMenuItem,
  replyMockAdminQna,
  toggleMockAdminProgramVisibility,
  updateMockAdminProgram,
  updateMockAdminProgramMenuItem,
} from '@/mocks/data/adminConsole';
import type {
  AdminConsoleResponse,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminProgramDetailResponse,
  AdminProgramMenuDetailResponse,
  AdminProgramMenuTreeResponse,
  AdminProgramsResponse,
  CreateAdminProgramDraftPayload,
  CreateAdminProgramDraftResponse,
  CreateAdminProgramMenuPayload,
  CreateAdminNoticePayload,
  CreateAdminResourcePayload,
  CreateAdminReviewPayload,
  MoveAdminProgramMenuPayload,
  MoveAdminProgramPayload,
  ReorderAdminProgramMenuPayload,
  ReplyAdminQnaPayload,
  UpdateAdminProgramMenuPayload,
  UpsertAdminProgramPayload,
} from '@/types/adminConsole';

const toZodErrorMessage = (error: z.ZodError): string => {
  const issues = error.issues
    .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  return issues ? `\n${issues}` : '';
};

const summaryCardSchema = z.object({
  description: z.string().min(1),
  id: z.string().min(1),
  label: z.string().min(1),
  tone: z.enum(['brand', 'accent', 'neutral', 'danger']),
  value: z.string().min(1),
});

const adminProgramStatusSchema = z.enum(['draft', 'published', 'hidden']);
const adminProgramOriginSchema = z.enum(['managed', 'site']);
const adminProgramAccessPolicySchema = z.enum(['cohort', 'limited-window', 'unlimited']);

const noticeItemSchema = z.object({
  category: z.enum(['운영', '학사', '이벤트']),
  id: z.string().min(1),
  isPinned: z.boolean(),
  publishedAt: z.string().min(1),
  status: z.enum(['published', 'scheduled']),
  title: z.string().min(1),
});

const qnaReplySchema = z.object({
  authorName: z.string().min(1),
  content: z.string().min(1),
  repliedAt: z.string().min(1),
});

const qnaThreadSchema = z.object({
  authorName: z.string().min(1),
  category: z.string().min(1),
  id: z.string().min(1),
  question: z.string().min(1),
  reply: qnaReplySchema.optional(),
  status: z.enum(['waiting', 'answered']),
  submittedAt: z.string().min(1),
});

const resourceItemSchema = z.object({
  attachmentName: z.string().min(1),
  attachmentSizeLabel: z.string().min(1),
  description: z.string().min(1),
  id: z.string().min(1),
  publishedAt: z.string().min(1),
  title: z.string().min(1),
  visibility: z.enum(['public', 'students-only']),
});

const reviewItemSchema = z.object({
  educatorName: z.string().min(1),
  id: z.string().min(1),
  publishedAt: z.string().min(1),
  status: z.enum(['published', 'draft']),
  summary: z.string().min(1),
  title: z.string().min(1),
});

const programCollectionOptionSchema = z.object({
  depth: z.number().int().nonnegative(),
  description: z.string().min(1),
  id: z.string().min(1),
  label: z.string().min(1),
  labelPath: z.string().min(1),
  lectureCount: z.number().int().nonnegative(),
  path: z.string().min(1),
});

const programMenuItemSchema = z.object({
  childCollectionCount: z.number().int().nonnegative(),
  depth: z.number().int().positive(),
  description: z.string().min(1),
  id: z.string().min(1),
  label: z.string().min(1),
  labelPath: z.string().min(1),
  lectureCount: z.number().int().nonnegative(),
  parentId: z.string().min(1).nullable(),
  path: z.string().min(1),
  slug: z.string().min(1),
  status: z.enum(['published', 'hidden']),
});

const programMenuTreeItemSchema = z.object({
  childCollectionCount: z.number().int().nonnegative(),
  depth: z.number().int().positive(),
  description: z.string().min(1),
  effectiveStatus: z.enum(['published', 'hidden']),
  id: z.string().min(1),
  isLeafMenu: z.boolean(),
  label: z.string().min(1),
  labelPath: z.string().min(1),
  linkedProgramCount: z.number().int().nonnegative(),
  parentId: z.string().min(1).nullable(),
  path: z.string().min(1),
  slug: z.string().min(1),
  status: z.enum(['published', 'hidden']),
  totalProgramCount: z.number().int().nonnegative(),
});

const programMenuTreeResponseSchema = z.object({
  items: z.array(programMenuTreeItemSchema),
  maxDepth: z.number().int().positive(),
  topLevelLimit: z.number().int().positive(),
});

const programMenuParentOptionSchema = z.object({
  depth: z.number().int().positive(),
  id: z.string().min(1),
  isLeafMenu: z.boolean(),
  label: z.string().min(1),
  labelPath: z.string().min(1),
  path: z.string().min(1),
});

const programMenuLinkedProgramSchema = z.object({
  formatLabel: z.string().min(1),
  id: z.string().min(1),
  origin: adminProgramOriginSchema,
  publicPath: z.string().min(1),
  scheduleLabel: z.string().min(1),
  slug: z.string().min(1),
  status: z.enum(['published', 'hidden']),
  title: z.string().min(1),
  updatedAt: z.string().min(1),
});

const programMenuDetailResponseSchema = z.object({
  allowedParentOptions: z.array(programMenuParentOptionSchema),
  canCreateChildMenu: z.boolean(),
  canCreateProgram: z.boolean(),
  canDelete: z.boolean(),
  linkedPrograms: z.array(programMenuLinkedProgramSchema),
  menu: programMenuTreeItemSchema,
  siblingCount: z.number().int().positive(),
  siblingIndex: z.number().int().nonnegative(),
});

const programItemSchema = z.object({
  capacity: z.number().int().nonnegative().nullable(),
  format: z.enum(['online', 'offline', 'hybrid']),
  id: z.string().min(1),
  monthlySoldCount: z.number().int().nonnegative(),
  price: z.number().nonnegative(),
  priceLabel: z.string().min(1),
  remainingSeats: z.number().int().nonnegative().nullable(),
  remainingSeatsLabel: z.string().min(1),
  slug: z.string().min(1),
  soldCount: z.number().int().nonnegative(),
  status: adminProgramStatusSchema,
  title: z.string().min(1),
  updatedAt: z.string().min(1),
});

const programInfoItemSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const programFaqItemSchema = z.object({
  answer: z.string().min(1),
  id: z.string().min(1),
  question: z.string().min(1),
});

const curriculumLessonSchema = z.object({
  deliveryType: z.enum(['online', 'offline']),
  description: z.string().trim().optional(),
  durationLabel: z.string().min(1),
  durationMinutes: z.number().int().nonnegative().nullable(),
  endDate: z.string().min(1).nullable(),
  id: z.string().min(1),
  startDate: z.string().min(1).nullable(),
  title: z.string().min(1),
});

const curriculumSectionSchema = z.object({
  description: z.string().min(1),
  durationLabel: z.string().min(1),
  id: z.string().min(1),
  lessons: z.array(curriculumLessonSchema).min(1).max(16),
  title: z.string().min(1),
});

const curriculumTrackSchema = z.object({
  id: z.string().min(1),
  sections: z.array(curriculumSectionSchema).min(1).max(12),
  summaryItems: z.array(z.string().trim().min(1)).min(1).max(12),
  summaryKind: z.enum(['decimal', 'disc']),
  title: z.string().min(1).optional(),
});

const programDetailItemSchema = z.object({
  accessPolicy: adminProgramAccessPolicySchema,
  capacity: z.number().int().nonnegative().nullable(),
  canDelete: z.boolean(),
  canDuplicate: z.boolean(),
  canEdit: z.boolean(),
  curriculumTrack: curriculumTrackSchema,
  description: z.string(),
  difficultyLabel: z.string().min(1),
  discountRateLabel: z.string().min(1),
  discountedPriceLabel: z.string().min(1),
  durationLabel: z.string().min(1),
  faqItems: z.array(programFaqItemSchema).min(1).max(12),
  format: z.enum(['online', 'offline', 'hybrid']),
  formatLabel: z.string().min(1),
  hashtagLabels: z.array(z.string().trim().min(1)).max(12),
  heroImageAlt: z.string(),
  heroImageSrc: z.string().min(1),
  id: z.string().min(1),
  learningPoints: z.array(z.string().trim().min(1)).min(1).max(12),
  learningEndDate: z.string().min(1).nullable(),
  learningStartDate: z.string().min(1).nullable(),
  monthlyInstallmentLabel: z.string().min(1),
  monthlySoldCount: z.number().int().nonnegative(),
  origin: adminProgramOriginSchema,
  operationPeriodLabel: z.string().min(1).optional(),
  originalPrice: z.number().nonnegative(),
  originalPriceLabel: z.string().min(1),
  parentCollectionLabel: z.string().min(1),
  parentCollectionPath: z.string().min(1),
  preparationChecklist: z.array(z.string().trim().min(1)).min(1).max(12),
  price: z.number().nonnegative(),
  priceLabel: z.string().min(1),
  publicPath: z.string().min(1),
  registrationEndDate: z.string().min(1).nullable(),
  registrationPeriodLabel: z.string().min(1),
  registrationStartDate: z.string().min(1).nullable(),
  recommendedFor: z.array(z.string().trim().min(1)).min(1).max(12),
  remainingSeats: z.number().int().nonnegative().nullable(),
  remainingSeatsLabel: z.string().min(1),
  scheduleLabel: z.string().min(1),
  slug: z.string().min(1),
  soldCount: z.number().int().nonnegative(),
  stats: z.array(programInfoItemSchema).min(1).max(12),
  status: adminProgramStatusSchema,
  tags: z.array(z.string().trim().min(1)).min(1).max(12),
  title: z.string().min(1),
  tuitionLabel: z.string().min(1),
  updatedAt: z.string().min(1),
});

const adminProgramListItemSchema = z.object({
  accessPolicy: adminProgramAccessPolicySchema,
  canDelete: z.boolean(),
  canDuplicate: z.boolean(),
  canEdit: z.boolean(),
  format: z.enum(['online', 'offline', 'hybrid']),
  formatLabel: z.string().min(1),
  id: z.string().min(1),
  isPublishReady: z.boolean(),
  missingFieldCount: z.number().int().nonnegative(),
  origin: adminProgramOriginSchema,
  parentCollectionLabel: z.string().min(1),
  parentCollectionPath: z.string().min(1),
  priceLabel: z.string().min(1),
  publicPath: z.string().min(1),
  remainingSeatsLabel: z.string().min(1),
  scheduleSummary: z.string().min(1),
  slug: z.string().min(1),
  status: adminProgramStatusSchema,
  title: z.string().min(1),
  updatedAt: z.string().min(1),
});

const adminProgramsResponseSchema = z.object({
  items: z.array(adminProgramListItemSchema),
});

const adminProgramDetailResponseSchema = z.object({
  isPublishReady: z.boolean(),
  missingFieldLabels: z.array(z.string().min(1)),
  program: programDetailItemSchema,
});

const createAdminProgramDraftPayloadSchema = z.object({
  accessPolicy: adminProgramAccessPolicySchema,
  capacity: z.number().int().nonnegative().nullable(),
  format: z.enum(['online', 'offline', 'hybrid']),
  learningEndDate: z.string().min(1).nullable(),
  learningStartDate: z.string().min(1).nullable(),
  originalPrice: z.number().nonnegative(),
  parentCollectionPath: z.string().min(1),
  price: z.number().nonnegative(),
  registrationEndDate: z.string().min(1).nullable(),
  registrationStartDate: z.string().min(1).nullable(),
  slug: z.string().min(1),
  sourceProgramId: z.string().min(1).nullable(),
  title: z.string().min(1),
});

const createAdminProgramDraftResponseSchema = z.object({
  id: z.string().min(1),
});

const salesOverviewSchema = z.object({
  bestSellerTitle: z.string().min(1),
  grossRevenueLabel: z.string().min(1),
  monthlyRevenueLabel: z.string().min(1),
  totalOrdersLabel: z.string().min(1),
});

const salesRowSchema = z.object({
  format: z.enum(['online', 'offline', 'hybrid']),
  id: z.string().min(1),
  monthlyRevenueLabel: z.string().min(1),
  monthlySoldCount: z.number().int().nonnegative(),
  programTitle: z.string().min(1),
  remainingSeatsLabel: z.string().min(1),
  soldCount: z.number().int().nonnegative(),
  status: adminProgramStatusSchema,
  totalRevenueLabel: z.string().min(1),
});

const adminConsoleResponseSchema = z.object({
  adminDisplayName: z.string().min(1),
  managedPrograms: z.array(programDetailItemSchema),
  notices: z.array(noticeItemSchema),
  programMenus: z.array(programMenuItemSchema),
  programCollectionOptions: z.array(programCollectionOptionSchema).min(1),
  programs: z.array(programItemSchema),
  qnaThreads: z.array(qnaThreadSchema),
  resources: z.array(resourceItemSchema),
  reviewPosts: z.array(reviewItemSchema),
  salesOverview: salesOverviewSchema,
  salesRows: z.array(salesRowSchema),
  summaryCards: z.array(summaryCardSchema),
});

const adminLoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.string().min(1),
  expiresAt: z.string().min(1),
  loginId: z.string().min(1),
  displayName: z.string().min(1),
  role: z.string().min(1),
});

const mutationSuccessSchema = z.object({
  ok: z.literal(true),
});

const getBackendMessage = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') return null;

  const record = data as Record<string, unknown>;
  const message = record['message'];
  if (typeof message === 'string' && message.trim()) return message.trim();

  return null;
};

const toAdminUserMessage = (backendMessage: string | null): string => {
  switch (backendMessage) {
    case 'Invalid admin credentials':
    case 'Invalid username or password.':
      return '아이디 또는 비밀번호를 확인해 주세요.';
    case 'Q&A thread not found':
      return '답변할 문의를 찾을 수 없습니다.';
    case 'Program not found':
      return '선택한 강의를 찾을 수 없습니다.';
    case 'Program collection not found':
      return '강의를 등록할 카테고리를 찾을 수 없습니다.';
    case 'Program menu not found':
      return '선택한 강의 메뉴를 찾을 수 없습니다.';
    case 'Program menu parent not found':
      return '상위 강의 메뉴를 찾을 수 없습니다.';
    case 'Program menu has child menus':
      return '하위 메뉴가 남아 있는 강의 메뉴는 삭제할 수 없습니다.';
    case 'Program menu has linked programs':
      return '연결된 강의가 남아 있는 강의 메뉴는 삭제할 수 없습니다.';
    case 'Program menu parent has linked programs':
      return '이미 강의가 연결된 메뉴 아래에는 하위 메뉴를 추가하거나 이동할 수 없습니다.';
    case 'Program menu cannot move to descendant':
      return '자기 자신 또는 하위 메뉴 아래로는 이동할 수 없습니다.';
    case 'Program menu reorder limit reached':
      return '더 이상 같은 단계에서 이동할 수 없습니다.';
    case 'Program menu depth exceeded':
      return '강의 메뉴는 최대 3뎁스까지만 구성할 수 있습니다.';
    case 'Program menu slug duplicated':
      return '같은 단계에 이미 사용 중인 메뉴 슬러그입니다.';
    case 'Program menu top level limit exceeded':
      return '헤더 최상위 강의 메뉴는 최대 6개까지만 등록할 수 있습니다.';
    case 'Program target collection not found':
      return '강의를 옮길 대상 강의 메뉴를 찾을 수 없습니다.';
    case 'Program target collection cannot contain programs':
      return '하위 메뉴가 있는 단계에는 강의를 직접 연결할 수 없습니다.';
    case 'Program not publishable':
      return '게시에 필요한 필수 항목이 아직 비어 있습니다.';
    case 'Invalid body':
      return '입력값을 다시 확인해 주세요.';
    default:
      return '관리자 요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';
  }
};

const assertMutationSucceeded = (responseData: unknown): void => {
  const parsed = mutationSuccessSchema.safeParse(responseData);

  if (!parsed.success) {
    throw new Error(`[adminConsole] Invalid mutation response.${toZodErrorMessage(parsed.error)}`);
  }
};

const handleAxiosAdminError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const backendMessage = getBackendMessage(error.response?.data);
    throw new Error(toAdminUserMessage(backendMessage));
  }

  throw error;
};

const throwAdminFallbackMessage = (backendMessage: string | null): never => {
  throw new Error(toAdminUserMessage(backendMessage));
};

const getProgramMenuMutationBackendMessage = (reason: string): string => {
  switch (reason) {
    case 'parent-not-found':
      return 'Program menu parent not found';
    case 'parent-has-linked-programs':
      return 'Program menu parent has linked programs';
    case 'top-level-limit-exceeded':
      return 'Program menu top level limit exceeded';
    case 'unsupported-depth':
      return 'Program menu depth exceeded';
    case 'duplicate-slug':
      return 'Program menu slug duplicated';
    case 'has-child-menus':
      return 'Program menu has child menus';
    case 'has-linked-programs':
      return 'Program menu has linked programs';
    case 'cannot-move-to-descendant':
      return 'Program menu cannot move to descendant';
    case 'reorder-limit':
      return 'Program menu reorder limit reached';
    default:
      return 'Program menu not found';
  }
};

const getProgramMoveBackendMessage = (reason: string): string => {
  switch (reason) {
    case 'target-collection-not-found':
      return 'Program target collection not found';
    case 'target-collection-cannot-contain-programs':
      return 'Program target collection cannot contain programs';
    default:
      return 'Program not found';
  }
};

export const fetchAdminConsole = async (siteKey: string): Promise<AdminConsoleResponse> => {
  try {
    const encodedSiteKey = encodeURIComponent(siteKey);
    const responseData = await http.get<unknown>(`/sites/${encodedSiteKey}/admin/console`);
    const parsed = adminConsoleResponseSchema.safeParse(responseData);

    if (!parsed.success) {
      throw new Error(`[adminConsole] Invalid console response.${toZodErrorMessage(parsed.error)}`);
    }

    return parsed.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    return getMockAdminConsole(siteKey);
  }
};

export const fetchAdminProgramMenuTree = async (
  siteKey: string,
): Promise<AdminProgramMenuTreeResponse> => {
  try {
    const encodedSiteKey = encodeURIComponent(siteKey);
    const responseData = await http.get<unknown>(
      `/sites/${encodedSiteKey}/admin/program-menu-tree`,
    );
    const parsed = programMenuTreeResponseSchema.safeParse(responseData);

    if (!parsed.success) {
      throw new Error(
        `[adminConsole] Invalid program menu tree response.${toZodErrorMessage(parsed.error)}`,
      );
    }

    return parsed.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    return getMockAdminProgramMenuTreeResponse(siteKey);
  }
};

export const fetchAdminProgramMenuDetail = async (
  siteKey: string,
  menuId: string,
): Promise<AdminProgramMenuDetailResponse> => {
  try {
    const encodedSiteKey = encodeURIComponent(siteKey);
    const encodedMenuId = encodeURIComponent(menuId);
    const responseData = await http.get<unknown>(
      `/sites/${encodedSiteKey}/admin/program-menus/${encodedMenuId}`,
    );
    const parsed = programMenuDetailResponseSchema.safeParse(responseData);

    if (!parsed.success) {
      throw new Error(
        `[adminConsole] Invalid program menu detail response.${toZodErrorMessage(parsed.error)}`,
      );
    }

    return parsed.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    const mockResponse = getMockAdminProgramMenuDetailResponse(siteKey, menuId);

    if (mockResponse) {
      return mockResponse;
    }

    throw error;
  }
};

export const fetchAdminPrograms = async (
  siteKey: string,
  options?: {
    collectionPath?: string | null;
    format?: 'all' | 'hybrid' | 'offline' | 'online';
    query?: string;
    status?: 'all' | 'draft' | 'hidden' | 'published';
  },
): Promise<AdminProgramsResponse> => {
  const searchParams = new URLSearchParams();

  if (options?.collectionPath) {
    searchParams.set('collectionPath', options.collectionPath);
  }

  if (options?.query?.trim()) {
    searchParams.set('q', options.query.trim());
  }

  if (options?.status && options.status !== 'all') {
    searchParams.set('status', options.status);
  }

  if (options?.format && options.format !== 'all') {
    searchParams.set('format', options.format);
  }

  try {
    const encodedSiteKey = encodeURIComponent(siteKey);
    const queryString = searchParams.toString();
    const responseData = await http.get<unknown>(
      `/sites/${encodedSiteKey}/admin/programs${queryString ? `?${queryString}` : ''}`,
    );
    const parsed = adminProgramsResponseSchema.safeParse(responseData);

    if (!parsed.success) {
      throw new Error(
        `[adminConsole] Invalid admin programs response.${toZodErrorMessage(parsed.error)}`,
      );
    }

    return parsed.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    return getMockAdminProgramsResponse(siteKey, options);
  }
};

export const fetchAdminProgramDetail = async (
  siteKey: string,
  programId: string,
): Promise<AdminProgramDetailResponse> => {
  try {
    const encodedSiteKey = encodeURIComponent(siteKey);
    const encodedProgramId = encodeURIComponent(programId);
    const responseData = await http.get<unknown>(
      `/sites/${encodedSiteKey}/admin/programs/${encodedProgramId}`,
    );
    const parsed = adminProgramDetailResponseSchema.safeParse(responseData);

    if (!parsed.success) {
      throw new Error(
        `[adminConsole] Invalid admin program detail response.${toZodErrorMessage(parsed.error)}`,
      );
    }

    return parsed.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    const mockResponse = getMockAdminProgramDetailResponse(siteKey, programId);

    if (mockResponse) {
      return mockResponse;
    }

    throw error;
  }
};

export const loginAdmin = async (
  siteKey: string,
  payload: AdminLoginRequest,
): Promise<AdminLoginResponse> => {
  void siteKey;

  try {
    const response = await axiosInstance.post<{ data: unknown }>(`/api/auth/login`, {
      loginId: payload.identifier,
      password: payload.password,
    });
    const parsed = adminLoginResponseSchema.safeParse(response.data.data);

    if (!parsed.success) {
      throw new Error(`[adminConsole] Invalid login response.${toZodErrorMessage(parsed.error)}`);
    }

    if (parsed.data.role !== 'ROLE_ADMIN') {
      throw new Error('관리자 권한 계정으로 로그인해 주세요.');
    }

    return {
      accessToken: parsed.data.accessToken,
      tokenType: parsed.data.tokenType,
      expiresAt: parsed.data.expiresAt,
      loginId: parsed.data.loginId,
      adminDisplayName: parsed.data.displayName,
      role: parsed.data.role,
    };
  } catch (error: unknown) {
    return handleAxiosAdminError(error);
  }
};

export const createAdminNotice = async (
  siteKey: string,
  payload: CreateAdminNoticePayload,
): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);

  try {
    const response = await axiosInstance.post(`/sites/${encodedSiteKey}/admin/notices`, payload);
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      createMockAdminNotice(siteKey, payload);
      return;
    }

    return handleAxiosAdminError(error);
  }
};

export const replyAdminQna = async (
  siteKey: string,
  threadId: string,
  payload: ReplyAdminQnaPayload,
): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);
  const encodedThreadId = encodeURIComponent(threadId);

  try {
    const response = await axiosInstance.post(
      `/sites/${encodedSiteKey}/admin/qna/${encodedThreadId}/replies`,
      payload,
    );
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const mockResponse = replyMockAdminQna(siteKey, threadId, payload);

      if (mockResponse) {
        return;
      }

      return throwAdminFallbackMessage('Q&A thread not found');
    }

    return handleAxiosAdminError(error);
  }
};

export const createAdminResource = async (
  siteKey: string,
  payload: CreateAdminResourcePayload,
): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);

  try {
    const response = await axiosInstance.post(`/sites/${encodedSiteKey}/admin/resources`, payload);
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      createMockAdminResource(siteKey, payload);
      return;
    }

    return handleAxiosAdminError(error);
  }
};

export const createAdminReview = async (
  siteKey: string,
  payload: CreateAdminReviewPayload,
): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);

  try {
    const response = await axiosInstance.post(`/sites/${encodedSiteKey}/admin/reviews`, payload);
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      createMockAdminReview(siteKey, payload);
      return;
    }

    return handleAxiosAdminError(error);
  }
};

export const createAdminProgramDraft = async (
  siteKey: string,
  payload: CreateAdminProgramDraftPayload,
): Promise<CreateAdminProgramDraftResponse> => {
  const encodedSiteKey = encodeURIComponent(siteKey);
  const parsedPayload = createAdminProgramDraftPayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    throw new Error(
      `[adminConsole] Invalid program draft payload.${toZodErrorMessage(parsedPayload.error)}`,
    );
  }

  try {
    const response = await axiosInstance.post(
      `/sites/${encodedSiteKey}/admin/program-drafts`,
      payload,
    );
    const parsed = createAdminProgramDraftResponseSchema.safeParse(response.data);

    if (!parsed.success) {
      throw new Error(
        `[adminConsole] Invalid program draft response.${toZodErrorMessage(parsed.error)}`,
      );
    }

    return parsed.data;
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const mockResponse = createMockAdminProgramDraftItem(siteKey, payload);

      if (mockResponse) {
        return mockResponse;
      }

      return throwAdminFallbackMessage('Program collection not found');
    }

    return handleAxiosAdminError(error);
  }
};

export const createAdminProgram = async (
  siteKey: string,
  payload: UpsertAdminProgramPayload,
): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);

  try {
    const response = await axiosInstance.post(`/sites/${encodedSiteKey}/admin/programs`, payload);
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const mockResponse = createMockAdminProgram(siteKey, payload);

      if (mockResponse) {
        return;
      }

      return throwAdminFallbackMessage('Program collection not found');
    }

    return handleAxiosAdminError(error);
  }
};

export const updateAdminProgram = async (
  siteKey: string,
  programId: string,
  payload: UpsertAdminProgramPayload,
): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);
  const encodedProgramId = encodeURIComponent(programId);

  try {
    const response = await axiosInstance.patch(
      `/sites/${encodedSiteKey}/admin/programs/${encodedProgramId}`,
      payload,
    );
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const mockResponse = updateMockAdminProgram(siteKey, programId, payload);

      if (mockResponse) {
        return;
      }

      return throwAdminFallbackMessage('Program not found');
    }

    return handleAxiosAdminError(error);
  }
};

export const toggleAdminProgramVisibility = async (
  siteKey: string,
  programId: string,
): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);
  const encodedProgramId = encodeURIComponent(programId);

  try {
    const response = await axiosInstance.post(
      `/sites/${encodedSiteKey}/admin/programs/${encodedProgramId}/toggle-visibility`,
    );
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const mockResponse = toggleMockAdminProgramVisibility(siteKey, programId);

      if (mockResponse) {
        return;
      }

      return throwAdminFallbackMessage('Program not found');
    }

    return handleAxiosAdminError(error);
  }
};

export const deleteAdminProgram = async (siteKey: string, programId: string): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);
  const encodedProgramId = encodeURIComponent(programId);

  try {
    const response = await axiosInstance.delete(
      `/sites/${encodedSiteKey}/admin/programs/${encodedProgramId}`,
    );
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      if (deleteMockAdminProgram(siteKey, programId)) {
        return;
      }

      return throwAdminFallbackMessage('Program not found');
    }

    return handleAxiosAdminError(error);
  }
};

export const publishAdminProgram = async (siteKey: string, programId: string): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);
  const encodedProgramId = encodeURIComponent(programId);

  try {
    const response = await axiosInstance.post(
      `/sites/${encodedSiteKey}/admin/programs/${encodedProgramId}/publish`,
    );
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const mockResponse = publishMockAdminProgramItem(siteKey, programId);

      if (mockResponse) {
        return;
      }

      return throwAdminFallbackMessage('Program not publishable');
    }

    return handleAxiosAdminError(error);
  }
};

export const hideAdminProgram = async (siteKey: string, programId: string): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);
  const encodedProgramId = encodeURIComponent(programId);

  try {
    const response = await axiosInstance.post(
      `/sites/${encodedSiteKey}/admin/programs/${encodedProgramId}/hide`,
    );
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const mockResponse = hideMockAdminProgramItem(siteKey, programId);

      if (mockResponse) {
        return;
      }

      return throwAdminFallbackMessage('Program not found');
    }

    return handleAxiosAdminError(error);
  }
};

export const createAdminProgramMenu = async (
  siteKey: string,
  payload: CreateAdminProgramMenuPayload,
): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);

  try {
    const response = await axiosInstance.post(
      `/sites/${encodedSiteKey}/admin/program-menus`,
      payload,
    );
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const result = createMockAdminProgramMenuItem(siteKey, payload);

      if (result.ok) {
        return;
      }

      return throwAdminFallbackMessage(getProgramMenuMutationBackendMessage(result.reason));
    }

    return handleAxiosAdminError(error);
  }
};

export const updateAdminProgramMenu = async (
  siteKey: string,
  menuId: string,
  payload: UpdateAdminProgramMenuPayload,
): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);
  const encodedMenuId = encodeURIComponent(menuId);

  try {
    const response = await axiosInstance.patch(
      `/sites/${encodedSiteKey}/admin/program-menus/${encodedMenuId}`,
      payload,
    );
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const result = updateMockAdminProgramMenuItem(siteKey, menuId, payload);

      if (result.ok) {
        return;
      }

      return throwAdminFallbackMessage(getProgramMenuMutationBackendMessage(result.reason));
    }

    return handleAxiosAdminError(error);
  }
};

export const deleteAdminProgramMenu = async (siteKey: string, menuId: string): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);
  const encodedMenuId = encodeURIComponent(menuId);

  try {
    const response = await axiosInstance.delete(
      `/sites/${encodedSiteKey}/admin/program-menus/${encodedMenuId}`,
    );
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const result = deleteMockAdminProgramMenuItem(siteKey, menuId);

      if (result.ok) {
        return;
      }

      return throwAdminFallbackMessage(getProgramMenuMutationBackendMessage(result.reason));
    }

    return handleAxiosAdminError(error);
  }
};

export const moveAdminProgramMenu = async (
  siteKey: string,
  menuId: string,
  payload: MoveAdminProgramMenuPayload,
): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);
  const encodedMenuId = encodeURIComponent(menuId);

  try {
    const response = await axiosInstance.post(
      `/sites/${encodedSiteKey}/admin/program-menus/${encodedMenuId}/move`,
      payload,
    );
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const result = moveMockAdminProgramMenuItem(siteKey, menuId, payload);

      if (result.ok) {
        return;
      }

      return throwAdminFallbackMessage(getProgramMenuMutationBackendMessage(result.reason));
    }

    return handleAxiosAdminError(error);
  }
};

export const reorderAdminProgramMenu = async (
  siteKey: string,
  menuId: string,
  payload: ReorderAdminProgramMenuPayload,
): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);
  const encodedMenuId = encodeURIComponent(menuId);

  try {
    const response = await axiosInstance.post(
      `/sites/${encodedSiteKey}/admin/program-menus/${encodedMenuId}/reorder`,
      payload,
    );
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const result = reorderMockAdminProgramMenuItem(siteKey, menuId, payload);

      if (result.ok) {
        return;
      }

      return throwAdminFallbackMessage(getProgramMenuMutationBackendMessage(result.reason));
    }

    return handleAxiosAdminError(error);
  }
};

export const moveAdminProgram = async (
  siteKey: string,
  programId: string,
  payload: MoveAdminProgramPayload,
): Promise<void> => {
  const encodedSiteKey = encodeURIComponent(siteKey);
  const encodedProgramId = encodeURIComponent(programId);

  try {
    const response = await axiosInstance.post(
      `/sites/${encodedSiteKey}/admin/programs/${encodedProgramId}/move`,
      payload,
    );
    assertMutationSucceeded(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const result = moveMockAdminProgramItem(siteKey, programId, payload);

      if (result.ok) {
        return;
      }

      return throwAdminFallbackMessage(getProgramMoveBackendMessage(result.reason));
    }

    return handleAxiosAdminError(error);
  }
};
