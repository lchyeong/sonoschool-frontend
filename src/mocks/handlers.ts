import { http, HttpResponse } from 'msw';

import {
  attemptMockAdminLogin,
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
  getMockAdminProgramsResponse,
  getMockAdminProgramMenuDetailResponse,
  getMockAdminProgramMenuTreeResponse,
  hideMockAdminProgramItem,
  moveMockAdminProgramItem,
  moveMockAdminProgramMenuItem,
  publishMockAdminProgramItem,
  reorderMockAdminProgramMenuItem,
  replyMockAdminQna,
  toggleMockAdminProgramVisibility,
  updateMockAdminProgramMenuItem,
  updateMockAdminProgram,
} from '@/mocks/data/adminConsole';
import { getMockHomeHeroSlides } from '@/mocks/data/homeHeroSlides';
import { getMockHomeHistoryTimeline } from '@/mocks/data/homeHistoryTimeline';
import { getMockProgramPage, getMockProgramsOverview } from '@/mocks/data/programCatalog';
import { getMockProgramSearchIndex } from '@/mocks/data/programSearch';
import { getMockSiteNavigation } from '@/mocks/data/siteNavigation';
import type {
  AdminConsoleResponse,
  AdminProgramAccessPolicy,
  AdminLoginResponse,
  AdminNoticeCategory,
  AdminProgramFormat,
  AdminProgramMenuDetailResponse,
  AdminProgramMenuTreeResponse,
  CreateAdminProgramDraftPayload,
  CreateAdminProgramMenuPayload,
  AdminProgramStatus,
  AdminResourceVisibility,
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
import type { HomeHeroSlidesResponse } from '@/types/homeHeroSlides';
import type { HomeHistoryTimelineResponse } from '@/types/homeHistoryTimeline';
import type { ProgramPageResponse, ProgramsOverviewResponse } from '@/types/programCatalog';
import type { ProgramSearchIndexResponse } from '@/types/programSearch';
import type { SiteNavigationResponse } from '@/types/siteNavigation';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object';
};

const isAdminNoticeCategory = (value: unknown): value is AdminNoticeCategory => {
  return value === '운영' || value === '학사' || value === '이벤트';
};

const isAdminResourceVisibility = (value: unknown): value is AdminResourceVisibility => {
  return value === 'public' || value === 'students-only';
};

const isAdminProgramFormat = (value: unknown): value is AdminProgramFormat => {
  return value === 'online' || value === 'offline' || value === 'hybrid';
};

const isAdminProgramAccessPolicy = (value: unknown): value is AdminProgramAccessPolicy => {
  return value === 'cohort' || value === 'limited-window' || value === 'unlimited';
};

const isAdminProgramMenuStatus = (value: unknown): value is 'published' | 'hidden' => {
  return value === 'published' || value === 'hidden';
};

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim());
};

const isProgramInfoItem = (value: unknown): boolean => {
  return (
    isRecord(value) &&
    typeof value['label'] === 'string' &&
    value['label'].trim().length > 0 &&
    typeof value['value'] === 'string' &&
    value['value'].trim().length > 0
  );
};

const isProgramFaqItem = (value: unknown): boolean => {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    value['id'].trim().length > 0 &&
    typeof value['question'] === 'string' &&
    value['question'].trim().length > 0 &&
    typeof value['answer'] === 'string' &&
    value['answer'].trim().length > 0
  );
};

const isProgramCurriculumLesson = (value: unknown): boolean => {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    value['id'].trim().length > 0 &&
    typeof value['title'] === 'string' &&
    value['title'].trim().length > 0 &&
    (value['description'] === undefined || typeof value['description'] === 'string') &&
    (value['deliveryType'] === 'online' || value['deliveryType'] === 'offline') &&
    typeof value['durationLabel'] === 'string' &&
    value['durationLabel'].trim().length > 0 &&
    (value['durationMinutes'] === null || typeof value['durationMinutes'] === 'number') &&
    (value['startDate'] === null || typeof value['startDate'] === 'string') &&
    (value['endDate'] === null || typeof value['endDate'] === 'string')
  );
};

const isProgramCurriculumSection = (value: unknown): boolean => {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    value['id'].trim().length > 0 &&
    typeof value['title'] === 'string' &&
    value['title'].trim().length > 0 &&
    typeof value['description'] === 'string' &&
    value['description'].trim().length > 0 &&
    typeof value['durationLabel'] === 'string' &&
    value['durationLabel'].trim().length > 0 &&
    Array.isArray(value['lessons']) &&
    value['lessons'].every(isProgramCurriculumLesson)
  );
};

const isProgramCurriculumTrack = (value: unknown): boolean => {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    value['id'].trim().length > 0 &&
    (value['title'] === undefined ||
      (typeof value['title'] === 'string' && value['title'].trim().length > 0)) &&
    (value['summaryKind'] === 'decimal' || value['summaryKind'] === 'disc') &&
    isStringArray(value['summaryItems']) &&
    Array.isArray(value['sections']) &&
    value['sections'].every(isProgramCurriculumSection)
  );
};

const isUpsertAdminProgramPayload = (value: unknown): value is UpsertAdminProgramPayload => {
  return (
    isRecord(value) &&
    typeof value['title'] === 'string' &&
    value['title'].trim().length > 0 &&
    typeof value['slug'] === 'string' &&
    value['slug'].trim().length > 0 &&
    typeof value['parentCollectionPath'] === 'string' &&
    value['parentCollectionPath'].trim().length > 0 &&
    typeof value['description'] === 'string' &&
    typeof value['heroImageSrc'] === 'string' &&
    value['heroImageSrc'].trim().length > 0 &&
    typeof value['heroImageAlt'] === 'string' &&
    isAdminProgramFormat(value['format']) &&
    isAdminProgramAccessPolicy(value['accessPolicy']) &&
    (value['registrationStartDate'] === null ||
      typeof value['registrationStartDate'] === 'string') &&
    (value['registrationEndDate'] === null || typeof value['registrationEndDate'] === 'string') &&
    (value['learningStartDate'] === null || typeof value['learningStartDate'] === 'string') &&
    (value['learningEndDate'] === null || typeof value['learningEndDate'] === 'string') &&
    typeof value['difficultyLabel'] === 'string' &&
    value['difficultyLabel'].trim().length > 0 &&
    typeof value['originalPrice'] === 'number' &&
    typeof value['price'] === 'number' &&
    (value['capacity'] === null || typeof value['capacity'] === 'number') &&
    isStringArray(value['tags']) &&
    Array.isArray(value['stats']) &&
    value['stats'].every(isProgramInfoItem) &&
    isStringArray(value['learningPoints']) &&
    isStringArray(value['recommendedFor']) &&
    isStringArray(value['preparationChecklist']) &&
    Array.isArray(value['faqItems']) &&
    value['faqItems'].every(isProgramFaqItem) &&
    isProgramCurriculumTrack(value['curriculumTrack']) &&
    (value['hashtagLabels'] === undefined || isStringArray(value['hashtagLabels']))
  );
};

const isCreateAdminProgramDraftPayload = (
  value: unknown,
): value is CreateAdminProgramDraftPayload => {
  return (
    isRecord(value) &&
    typeof value['title'] === 'string' &&
    value['title'].trim().length > 0 &&
    typeof value['slug'] === 'string' &&
    value['slug'].trim().length > 0 &&
    typeof value['parentCollectionPath'] === 'string' &&
    value['parentCollectionPath'].trim().length > 0 &&
    isAdminProgramFormat(value['format']) &&
    isAdminProgramAccessPolicy(value['accessPolicy']) &&
    (value['sourceProgramId'] === null ||
      value['sourceProgramId'] === undefined ||
      (typeof value['sourceProgramId'] === 'string' &&
        value['sourceProgramId'].trim().length > 0)) &&
    typeof value['originalPrice'] === 'number' &&
    typeof value['price'] === 'number' &&
    (value['capacity'] === null || typeof value['capacity'] === 'number') &&
    (value['registrationStartDate'] === null ||
      typeof value['registrationStartDate'] === 'string') &&
    (value['registrationEndDate'] === null || typeof value['registrationEndDate'] === 'string') &&
    (value['learningStartDate'] === null || typeof value['learningStartDate'] === 'string') &&
    (value['learningEndDate'] === null || typeof value['learningEndDate'] === 'string')
  );
};

const isCreateAdminProgramMenuPayload = (
  value: unknown,
): value is CreateAdminProgramMenuPayload => {
  return (
    isRecord(value) &&
    (value['parentId'] === null ||
      value['parentId'] === undefined ||
      (typeof value['parentId'] === 'string' && value['parentId'].trim().length > 0)) &&
    typeof value['label'] === 'string' &&
    value['label'].trim().length > 0 &&
    typeof value['slug'] === 'string' &&
    value['slug'].trim().length > 0 &&
    typeof value['description'] === 'string' &&
    value['description'].trim().length > 0 &&
    isAdminProgramMenuStatus(value['status'])
  );
};

const isUpdateAdminProgramMenuPayload = (
  value: unknown,
): value is UpdateAdminProgramMenuPayload => {
  return (
    isRecord(value) &&
    typeof value['label'] === 'string' &&
    value['label'].trim().length > 0 &&
    typeof value['slug'] === 'string' &&
    value['slug'].trim().length > 0 &&
    typeof value['description'] === 'string' &&
    value['description'].trim().length > 0 &&
    isAdminProgramMenuStatus(value['status'])
  );
};

const isMoveAdminProgramMenuPayload = (value: unknown): value is MoveAdminProgramMenuPayload => {
  return (
    isRecord(value) &&
    (value['parentId'] === null ||
      value['parentId'] === undefined ||
      (typeof value['parentId'] === 'string' && value['parentId'].trim().length > 0))
  );
};

const isReorderAdminProgramMenuPayload = (
  value: unknown,
): value is ReorderAdminProgramMenuPayload => {
  return isRecord(value) && (value['direction'] === 'up' || value['direction'] === 'down');
};

const isMoveAdminProgramPayload = (value: unknown): value is MoveAdminProgramPayload => {
  return (
    isRecord(value) &&
    typeof value['targetCollectionPath'] === 'string' &&
    value['targetCollectionPath'].trim().length > 0
  );
};

export const handlers = [
  http.post('*/sites/:siteKey/admin/login', async ({ params, request }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const identifier = body['identifier'];
    const password = body['password'];

    if (typeof identifier !== 'string' || typeof password !== 'string') {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const response: AdminLoginResponse | null = attemptMockAdminLogin(
      siteKey,
      identifier,
      password,
    );

    if (!response) {
      return HttpResponse.json({ message: 'Invalid admin credentials' }, { status: 401 });
    }

    return HttpResponse.json(response);
  }),
  http.get('*/sites/:siteKey/admin/console', ({ params }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const response: AdminConsoleResponse = getMockAdminConsole(siteKey);

    return HttpResponse.json(response);
  }),
  http.post('*/sites/:siteKey/admin/notices', async ({ params, request }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const title = body['title'];
    const category = body['category'];
    const isPinned = body['isPinned'];

    if (
      typeof title !== 'string' ||
      !isAdminNoticeCategory(category) ||
      typeof isPinned !== 'boolean'
    ) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: CreateAdminNoticePayload = { category, isPinned, title };

    createMockAdminNotice(siteKey, payload);
    return HttpResponse.json({ ok: true });
  }),
  http.post('*/sites/:siteKey/admin/qna/:threadId/replies', async ({ params, request }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const threadId = typeof params['threadId'] === 'string' ? params['threadId'] : '';
    const body = await request.json().catch(() => null);

    if (!isRecord(body) || !threadId) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const content = body['content'];
    if (typeof content !== 'string') {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: ReplyAdminQnaPayload = { content };
    const updatedThread = replyMockAdminQna(siteKey, threadId, payload);

    if (!updatedThread) {
      return HttpResponse.json({ message: 'Q&A thread not found' }, { status: 404 });
    }

    return HttpResponse.json({ ok: true });
  }),
  http.post('*/sites/:siteKey/admin/resources', async ({ params, request }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const title = body['title'];
    const description = body['description'];
    const attachmentName = body['attachmentName'];
    const attachmentSizeLabel = body['attachmentSizeLabel'];
    const visibility = body['visibility'];

    if (
      typeof title !== 'string' ||
      typeof description !== 'string' ||
      typeof attachmentName !== 'string' ||
      typeof attachmentSizeLabel !== 'string' ||
      !isAdminResourceVisibility(visibility)
    ) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: CreateAdminResourcePayload = {
      attachmentName,
      attachmentSizeLabel,
      description,
      title,
      visibility: visibility,
    };

    createMockAdminResource(siteKey, payload);
    return HttpResponse.json({ ok: true });
  }),
  http.post('*/sites/:siteKey/admin/reviews', async ({ params, request }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const title = body['title'];
    const summary = body['summary'];

    if (typeof title !== 'string' || typeof summary !== 'string') {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: CreateAdminReviewPayload = { summary, title };

    createMockAdminReview(siteKey, payload);
    return HttpResponse.json({ ok: true });
  }),
  http.get('*/sites/:siteKey/admin/programs', ({ params, request }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const requestUrl = new URL(request.url);
    const response = getMockAdminProgramsResponse(siteKey, {
      collectionPath: requestUrl.searchParams.get('collectionPath'),
      format: (requestUrl.searchParams.get('format') as AdminProgramFormat | 'all' | null) ?? 'all',
      query: requestUrl.searchParams.get('q') ?? '',
      status: (requestUrl.searchParams.get('status') as AdminProgramStatus | 'all' | null) ?? 'all',
    });

    return HttpResponse.json(response);
  }),
  http.get('*/sites/:siteKey/admin/programs/:programId', ({ params }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const programId = typeof params['programId'] === 'string' ? params['programId'] : '';

    if (!programId) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    const response = getMockAdminProgramDetailResponse(siteKey, programId);

    if (!response) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    return HttpResponse.json(response);
  }),
  http.post('*/sites/:siteKey/admin/program-drafts', async ({ params, request }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const body = await request.json().catch(() => null);

    if (!isCreateAdminProgramDraftPayload(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: CreateAdminProgramDraftPayload = {
      accessPolicy: body.accessPolicy,
      capacity: body.capacity ?? null,
      format: body.format,
      learningEndDate: body.learningEndDate ?? null,
      learningStartDate: body.learningStartDate ?? null,
      originalPrice: body.originalPrice,
      parentCollectionPath: body.parentCollectionPath,
      price: body.price,
      registrationEndDate: body.registrationEndDate ?? null,
      registrationStartDate: body.registrationStartDate ?? null,
      slug: body.slug,
      sourceProgramId: body.sourceProgramId ?? null,
      title: body.title,
    };
    const createdDraft = createMockAdminProgramDraftItem(siteKey, payload);

    if (!createdDraft) {
      return HttpResponse.json(
        { message: 'Program target collection cannot contain programs' },
        { status: 400 },
      );
    }

    return HttpResponse.json(createdDraft);
  }),
  http.post('*/sites/:siteKey/admin/programs', async ({ params, request }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const body = await request.json().catch(() => null);

    if (!isUpsertAdminProgramPayload(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: UpsertAdminProgramPayload = body;

    const createdProgram = createMockAdminProgram(siteKey, payload);

    if (!createdProgram) {
      return HttpResponse.json(
        { message: 'Program target collection cannot contain programs' },
        { status: 400 },
      );
    }

    return HttpResponse.json({ ok: true });
  }),
  http.patch('*/sites/:siteKey/admin/programs/:programId', async ({ params, request }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const programId = typeof params['programId'] === 'string' ? params['programId'] : '';
    const body = await request.json().catch(() => null);

    if (!isUpsertAdminProgramPayload(body) || !programId) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: UpsertAdminProgramPayload = body;

    const updatedProgram = updateMockAdminProgram(siteKey, programId, payload);

    if (!updatedProgram) {
      return HttpResponse.json(
        { message: 'Program target collection cannot contain programs' },
        { status: 400 },
      );
    }

    return HttpResponse.json({ ok: true });
  }),
  http.post('*/sites/:siteKey/admin/programs/:programId/publish', ({ params }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const programId = typeof params['programId'] === 'string' ? params['programId'] : '';

    if (!programId) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    const updatedProgram = publishMockAdminProgramItem(siteKey, programId);

    if (!updatedProgram) {
      return HttpResponse.json({ message: 'Program not publishable' }, { status: 400 });
    }

    return HttpResponse.json({ ok: true });
  }),
  http.post('*/sites/:siteKey/admin/programs/:programId/hide', ({ params }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const programId = typeof params['programId'] === 'string' ? params['programId'] : '';

    if (!programId) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    const updatedProgram = hideMockAdminProgramItem(siteKey, programId);

    if (!updatedProgram) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    return HttpResponse.json({ ok: true });
  }),
  http.post('*/sites/:siteKey/admin/programs/:programId/move', async ({ params, request }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const programId = typeof params['programId'] === 'string' ? params['programId'] : '';
    const body = await request.json().catch(() => null);

    if (!programId || !isMoveAdminProgramPayload(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: MoveAdminProgramPayload = {
      targetCollectionPath: body.targetCollectionPath,
    };
    const result = moveMockAdminProgramItem(siteKey, programId, payload);

    if (!result.ok) {
      const message =
        result.reason === 'target-collection-not-found'
          ? 'Program target collection not found'
          : result.reason === 'target-collection-cannot-contain-programs'
            ? 'Program target collection cannot contain programs'
            : 'Program not found';

      return HttpResponse.json(
        { message },
        { status: result.reason === 'program-not-found' ? 404 : 400 },
      );
    }

    return HttpResponse.json({ ok: true });
  }),
  http.post('*/sites/:siteKey/admin/programs/:programId/toggle-visibility', ({ params }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const programId = typeof params['programId'] === 'string' ? params['programId'] : '';

    if (!programId) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    const updatedProgram = toggleMockAdminProgramVisibility(siteKey, programId);

    if (!updatedProgram) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    return HttpResponse.json({ ok: true });
  }),
  http.delete('*/sites/:siteKey/admin/programs/:programId', ({ params }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const programId = typeof params['programId'] === 'string' ? params['programId'] : '';

    if (!programId) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    const isDeleted = deleteMockAdminProgram(siteKey, programId);

    if (!isDeleted) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    return HttpResponse.json({ ok: true });
  }),
  http.post('*/sites/:siteKey/admin/program-menus', async ({ params, request }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const body = await request.json().catch(() => null);

    if (!isCreateAdminProgramMenuPayload(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: CreateAdminProgramMenuPayload = {
      description: body.description,
      label: body.label,
      parentId: body.parentId ?? null,
      slug: body.slug,
      status: body.status,
    };
    const result = createMockAdminProgramMenuItem(siteKey, payload);

    if (!result.ok) {
      const message =
        result.reason === 'parent-not-found'
          ? 'Program menu parent not found'
          : result.reason === 'parent-has-linked-programs'
            ? 'Program menu parent has linked programs'
            : result.reason === 'top-level-limit-exceeded'
              ? 'Program menu top level limit exceeded'
              : result.reason === 'unsupported-depth'
                ? 'Program menu depth exceeded'
                : result.reason === 'duplicate-slug'
                  ? 'Program menu slug duplicated'
                  : 'Program menu not found';

      return HttpResponse.json({ message }, { status: 400 });
    }

    return HttpResponse.json({ ok: true });
  }),
  http.get('*/sites/:siteKey/admin/program-menu-tree', ({ params }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const response: AdminProgramMenuTreeResponse = getMockAdminProgramMenuTreeResponse(siteKey);

    return HttpResponse.json(response);
  }),
  http.get('*/sites/:siteKey/admin/program-menus/:menuId', ({ params }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const menuId = typeof params['menuId'] === 'string' ? params['menuId'] : '';

    if (!menuId) {
      return HttpResponse.json({ message: 'Program menu not found' }, { status: 404 });
    }

    const response: AdminProgramMenuDetailResponse | null = getMockAdminProgramMenuDetailResponse(
      siteKey,
      menuId,
    );

    if (!response) {
      return HttpResponse.json({ message: 'Program menu not found' }, { status: 404 });
    }

    return HttpResponse.json(response);
  }),
  http.patch('*/sites/:siteKey/admin/program-menus/:menuId', async ({ params, request }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const menuId = typeof params['menuId'] === 'string' ? params['menuId'] : '';
    const body = await request.json().catch(() => null);

    if (!menuId || !isUpdateAdminProgramMenuPayload(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: UpdateAdminProgramMenuPayload = {
      description: body.description,
      label: body.label,
      slug: body.slug,
      status: body.status,
    };
    const result = updateMockAdminProgramMenuItem(siteKey, menuId, payload);

    if (!result.ok) {
      const message =
        result.reason === 'duplicate-slug'
          ? 'Program menu slug duplicated'
          : 'Program menu not found';

      return HttpResponse.json({ message }, { status: 400 });
    }

    return HttpResponse.json({ ok: true });
  }),
  http.delete('*/sites/:siteKey/admin/program-menus/:menuId', ({ params }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const menuId = typeof params['menuId'] === 'string' ? params['menuId'] : '';

    if (!menuId) {
      return HttpResponse.json({ message: 'Program menu not found' }, { status: 404 });
    }

    const result = deleteMockAdminProgramMenuItem(siteKey, menuId);

    if (!result.ok) {
      const message =
        result.reason === 'has-child-menus'
          ? 'Program menu has child menus'
          : result.reason === 'has-linked-programs'
            ? 'Program menu has linked programs'
            : 'Program menu not found';

      return HttpResponse.json(
        { message },
        { status: result.reason === 'menu-not-found' ? 404 : 400 },
      );
    }

    return HttpResponse.json({ ok: true });
  }),
  http.post('*/sites/:siteKey/admin/program-menus/:menuId/move', async ({ params, request }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const menuId = typeof params['menuId'] === 'string' ? params['menuId'] : '';
    const body = await request.json().catch(() => null);

    if (!menuId || !isMoveAdminProgramMenuPayload(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: MoveAdminProgramMenuPayload = {
      parentId: body.parentId ?? null,
    };
    const result = moveMockAdminProgramMenuItem(siteKey, menuId, payload);

    if (!result.ok) {
      const message =
        result.reason === 'parent-not-found'
          ? 'Program menu parent not found'
          : result.reason === 'parent-has-linked-programs'
            ? 'Program menu parent has linked programs'
            : result.reason === 'top-level-limit-exceeded'
              ? 'Program menu top level limit exceeded'
              : result.reason === 'unsupported-depth'
                ? 'Program menu depth exceeded'
                : result.reason === 'duplicate-slug'
                  ? 'Program menu slug duplicated'
                  : result.reason === 'cannot-move-to-descendant'
                    ? 'Program menu cannot move to descendant'
                    : 'Program menu not found';

      return HttpResponse.json(
        { message },
        { status: result.reason === 'menu-not-found' ? 404 : 400 },
      );
    }

    return HttpResponse.json({ ok: true });
  }),
  http.post('*/sites/:siteKey/admin/program-menus/:menuId/reorder', async ({ params, request }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const menuId = typeof params['menuId'] === 'string' ? params['menuId'] : '';
    const body = await request.json().catch(() => null);

    if (!menuId || !isReorderAdminProgramMenuPayload(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: ReorderAdminProgramMenuPayload = {
      direction: body.direction,
    };
    const result = reorderMockAdminProgramMenuItem(siteKey, menuId, payload);

    if (!result.ok) {
      const message =
        result.reason === 'reorder-limit'
          ? 'Program menu reorder limit reached'
          : 'Program menu not found';

      return HttpResponse.json(
        { message },
        { status: result.reason === 'menu-not-found' ? 404 : 400 },
      );
    }

    return HttpResponse.json({ ok: true });
  }),
  http.get('*/sites/:siteKey/navigation', ({ params }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const response: SiteNavigationResponse = getMockSiteNavigation(siteKey);

    return HttpResponse.json(response);
  }),
  http.get('*/sites/:siteKey/home-hero-slides', ({ params }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const response: HomeHeroSlidesResponse = getMockHomeHeroSlides(siteKey);

    return HttpResponse.json(response);
  }),
  http.get('*/sites/:siteKey/home-history-timeline', ({ params }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const response: HomeHistoryTimelineResponse = getMockHomeHistoryTimeline(siteKey);

    return HttpResponse.json(response);
  }),
  http.get('*/sites/:siteKey/program-search-index', ({ params }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const response: ProgramSearchIndexResponse = getMockProgramSearchIndex(siteKey);

    return HttpResponse.json(response);
  }),
  http.get('*/sites/:siteKey/programs/overview', ({ params }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const response: ProgramsOverviewResponse = getMockProgramsOverview(siteKey);

    return HttpResponse.json(response);
  }),
  http.get('*/sites/:siteKey/programs/page', ({ params, request }) => {
    const siteKey = typeof params['siteKey'] === 'string' ? params['siteKey'] : 'sono-school-main';
    const requestUrl = new URL(request.url);
    const path = requestUrl.searchParams.get('path') ?? '/programs';
    const response: ProgramPageResponse | null = getMockProgramPage(siteKey, path);

    if (!response) {
      return HttpResponse.json({ message: 'Program page not found' }, { status: 404 });
    }

    return HttpResponse.json(response);
  }),
  http.post('*/contact', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return HttpResponse.json({ ok: false, message: 'Invalid body' }, { status: 400 });
    }

    const title = body['title'];
    if (typeof title === 'string' && title.toLowerCase().includes('error')) {
      return HttpResponse.json({ ok: false, message: 'Invalid title' }, { status: 400 });
    }

    return HttpResponse.json({ ok: true });
  }),
];
