import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/mocks/server';
import AdminConsolePage from '@/pages/AdminConsolePage/AdminConsolePage';
import { globalQuestionsQueryKey } from '@/query/useQnaQueries';
import { adminConsoleRouteTree } from '@/routes/router';
import { useAdminAuthStore } from '@/stores/useAdminAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminProgramDraftDetail } from '@/types/adminProgramDrafts';
import type { PopupItem } from '@/types/popup';
import type { QuestionItem } from '@/types/qna';

const ACTIVE_SESSION_EXPIRES_AT = '2099-01-01T00:00:00Z';

const createAdminResourceFixture = (count: number) => {
  return Array.from({ length: count }, (_, index) => {
    const order = index + 1;

    return {
      createdAt: '2026-03-27T09:00:00Z',
      description: `자료 설명 ${String(order)}`,
      fileName: `resource-${String(order)}.pdf`,
      fileSize: order * 1024,
      fileUrl: `https://example.com/resource-${String(order)}.pdf`,
      id: order,
      mimeType: 'application/pdf',
      programId: order % 2 === 0 ? 2001 : null,
      programTitle: order % 2 === 0 ? '복부초음파 기초' : null,
      scope: order % 2 === 0 ? 'PROGRAM' : 'GLOBAL',
      sortOrder: order,
      title: `자료 ${String(order)}`,
      visibility: order % 2 === 0 ? 'ENROLLED_ONLY' : 'PUBLIC',
    };
  });
};

const createAdminProgramDraftDetailFixture = (): AdminProgramDraftDetail => {
  return {
    createdAt: '2026-03-27T09:00:00Z',
    finalProgramId: null,
    id: 91001,
    payload: {
      basicInfo: {
        accessDays: null,
        accessPolicy: 'UNLIMITED',
        categoryId: null,
        checklists: [],
        description: null,
        faqs: [],
        learningEndAt: null,
        learningOutcomes: [],
        learningPoints: [],
        learningStartAt: null,
        level: null,
        maxStudents: null,
        price: null,
        programType: 'ONLINE',
        recommendedFor: [],
        saleEndAt: null,
        salePrice: null,
        saleStartAt: null,
        summaryItems: [],
        thumbnailUrl: null,
        title: null,
      },
      problems: [],
      resources: [],
      sections: [
        {
          description: null,
          key: 'section-1',
          lectures: [
            {
              description: null,
              durationSeconds: null,
              key: 'lecture-1',
              lectureType: 'VIDEO',
              offlineSchedules: [],
              preview: false,
              published: false,
              sortOrder: 0,
              title: null,
              videoId: null,
              videoUploadErrorMessage: null,
              videoUploadFileName: null,
              videoUploadStatus: null,
            },
          ],
          sortOrder: 0,
          title: null,
        },
      ],
    },
    status: 'ACTIVE',
    titlePreview: null,
    updatedAt: '2026-03-27T09:00:00Z',
  };
};

const createValidAdminProgramDraftDetailFixture = (): AdminProgramDraftDetail => {
  const draftDetail = createAdminProgramDraftDetailFixture();
  draftDetail.finalProgramId = 2001;
  draftDetail.payload.basicInfo.categoryId = 1101;
  draftDetail.payload.basicInfo.price = 100000;
  draftDetail.payload.basicInfo.title = '구조화 정보 검증 과정';
  draftDetail.payload.sections[0].title = '기본 섹션';
  draftDetail.payload.sections[0].lectures[0].title = '기본 강의';
  return draftDetail;
};

const cloneDraftPayload = (
  payload: AdminProgramDraftDetail['payload'],
): AdminProgramDraftDetail['payload'] =>
  JSON.parse(JSON.stringify(payload)) as AdminProgramDraftDetail['payload'];

const saveCreateWorkspaceSnapshot = (
  draftId: number,
  snapshot: {
    lastSavedAt: string | null;
    lastSavedPayload: string;
    payload: AdminProgramDraftDetail['payload'];
  },
) => {
  window.sessionStorage.setItem(
    `admin-program-create-workspace:${String(draftId)}`,
    JSON.stringify(snapshot),
  );
};

const mockProgramDraftApis = (draftDetail = createAdminProgramDraftDetailFixture()) => {
  server.use(
    http.get('*/api/v1/admin/program-drafts', () => {
      return HttpResponse.json({ data: [] });
    }),
    http.post('*/api/v1/admin/program-drafts', () => {
      return HttpResponse.json({ data: draftDetail });
    }),
    http.post('*/api/v1/admin/program-drafts/from-program/:programId', () => {
      return HttpResponse.json({ data: draftDetail });
    }),
    http.post('*/api/v1/admin/program-drafts/duplicate-from-program/:programId', () => {
      return HttpResponse.json({ data: { ...draftDetail, finalProgramId: null } });
    }),
    http.get('*/api/v1/admin/program-drafts/:draftId', () => {
      return HttpResponse.json({ data: draftDetail });
    }),
  );
};

const mockProgramEditorApis = () => {
  server.use(
    http.get('*/api/v1/admin/programs/:programId/sections', () => {
      return HttpResponse.json({
        data: [
          {
            description: '기본 흐름',
            id: 501,
            lectures: [
              {
                description: '입문 강의',
                durationSeconds: 300,
                id: 9101,
                preview: true,
                published: true,
                sectionId: 501,
                sortOrder: 0,
                title: '오리엔테이션',
                videoId: 7001,
              },
            ],
            sortOrder: 0,
            title: '입문',
          },
        ],
      });
    }),
    http.get('*/api/v1/admin/programs/:programId/enrollments', () => {
      return HttpResponse.json({ data: [] });
    }),
    http.get('*/api/v1/admin/programs/:programId/problem-summaries', () => {
      return HttpResponse.json({ data: [] });
    }),
    http.get('*/api/v1/admin/lectures/:lectureId/problem', () => {
      return HttpResponse.json({ data: null });
    }),
  );
};

const getClosestButton = (text: string): HTMLButtonElement => {
  const button = screen.getByText(text).closest('button');

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected button for text: ${text}`);
  }

  return button;
};

const findMarch29CalendarDayButton = async () => {
  const calendarDayButton = (await screen.findAllByRole('button')).find(
    (button): button is HTMLButtonElement =>
      button.textContent.includes('29') && /일정 \d+건/.test(button.textContent || ''),
  );

  if (!calendarDayButton) {
    throw new Error('3월 29일 일정 버튼을 찾지 못했습니다.');
  }

  return calendarDayButton;
};

const openMarchPersonalScheduleDetail = async () => {
  const calendarDayButton = await findMarch29CalendarDayButton();

  fireEvent.click(calendarDayButton);

  const overviewDialog = await screen.findByRole('dialog', { name: '일정관리 상세' });
  fireEvent.click(await within(overviewDialog).findByRole('button', { name: /관리자 개인 일정/ }));

  return screen.findByRole('heading', { name: '개인일정 상세' });
};

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });
};

const renderAdminConsolePage = (
  section: 'programMenus' | 'programs' | 'practicum' = 'programs',
) => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminConsolePage section={section} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const renderAdminConsoleRoute = (
  initialEntry = '/admin/programs',
  options?: {
    draftDetail?: ReturnType<typeof createAdminProgramDraftDetailFixture>;
    skipProgramEditorApis?: boolean;
  },
) => {
  const queryClient = createTestQueryClient();

  mockProgramDraftApis(options?.draftDetail);
  if (!options?.skipProgramEditorApis) {
    mockProgramEditorApis();
  }

  useAdminAuthStore.setState({
    accessToken: 'admin-token',
    adminDisplayName: '소노스쿨 운영 관리자',
    expiresAt: ACTIVE_SESSION_EXPIRES_AT,
    isAuthenticated: true,
    loginId: 'admin',
    role: 'ROLE_ADMIN',
    tokenType: 'Bearer',
  });

  const router = createMemoryRouter([adminConsoleRouteTree], {
    initialEntries: [initialEntry],
  });

  const renderResult = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { ...renderResult, queryClient };
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.sessionStorage.clear();
  useAdminAuthStore.setState({
    accessToken: '',
    adminDisplayName: '',
    expiresAt: '',
    isAuthenticated: false,
    loginId: '',
    role: '',
    tokenType: '',
  });
  useToastStore.getState().clearToasts();
});

describe('AdminConsolePage', () => {
  it('renders program management as the default admin console section', async () => {
    renderAdminConsolePage();

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 관리' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: '운영 개요' })).not.toBeInTheDocument();
  });

  it('keeps the admin shell visible when the program list API fails', async () => {
    mockProgramDraftApis();

    server.use(
      http.get('*/api/v1/admin/programs', () => {
        return HttpResponse.json({ message: 'program list failed' }, { status: 500 });
      }),
    );

    renderAdminConsoleRoute('/admin/programs');

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 관리' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('프로그램 목록을 불러오지 못했습니다.')).toBeInTheDocument();
  });

  it('renders the payment management table with order number and lecture progress', async () => {
    renderAdminConsoleRoute('/admin/payments');

    expect(await screen.findByRole('heading', { level: 1, name: '결제 관리' })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: '프로그램명' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '주문번호' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '진도율' })).toBeInTheDocument();
    expect(screen.getByText('월별 매출 차트')).toBeInTheDocument();
    expect(screen.getByText('주별 매출 차트')).toBeInTheDocument();
    expect(await screen.findByText('ORD-501')).toBeInTheDocument();
    expect(screen.getAllByText('3/20강').length).toBeGreaterThan(0);
  });

  it('shows the latest cancellation date with a partial cancellation marker', async () => {
    server.use(
      http.get('*/api/v1/admin/payments', () => {
        return HttpResponse.json({
          data: [
            {
              amount: 200000,
              approvedAmount: 200000,
              buyerDisplayName: '이찬형',
              buyerLoginId: 'student01',
              canCancel: true,
              cancelledAmount: 100000,
              cancelledAt: null,
              completedLectureCount: 0,
              lastCancelledAt: '2026-03-21T02:00:00Z',
              orderName: '한달 완성 SPI',
              orderNumber: 'ORD-PARTIAL',
              orderType: 'CART_CHECKOUT',
              paidAt: '2026-03-20T02:00:00Z',
              paymentId: 174,
              paymentMethod: 'CARD',
              remainingAmount: 100000,
              requestedAt: '2026-03-20T02:00:00Z',
              status: 'PARTIALLY_CANCELLED',
              totalLectureCount: 10,
            },
          ],
        });
      }),
    );

    renderAdminConsoleRoute('/admin/payments');

    expect(await screen.findByRole('heading', { level: 1, name: '결제 관리' })).toBeInTheDocument();
    expect(await screen.findByText('한달 완성 SPI')).toBeInTheDocument();
    expect(screen.getByText(/26\.03\.21.*부분취소/)).toBeInTheDocument();
  });

  it('keeps the payment dashboard and table shell when the payment query returns no rows', async () => {
    server.use(
      http.get('*/api/v1/admin/payments', () => {
        return HttpResponse.json({ data: [] });
      }),
    );

    renderAdminConsoleRoute('/admin/payments');

    expect(await screen.findByRole('heading', { level: 1, name: '결제 관리' })).toBeInTheDocument();
    expect(await screen.findByText('월별 매출 차트')).toBeInTheDocument();
    expect(screen.getByText('주별 매출 차트')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '조회 기간 선택' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('주문번호를 입력하세요')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '프로그램명' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '관리' })).toBeInTheDocument();
    expect(screen.getByText('선택한 기간에 결제 내역이 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('운영 결제').nextElementSibling).toHaveTextContent('0건');
    expect(screen.getByText('결제 완료').nextElementSibling).toHaveTextContent('0건');
    expect(screen.getByText('결제 취소').nextElementSibling).toHaveTextContent('0건');
    expect(screen.getByText('완료 매출').nextElementSibling).toHaveTextContent('₩0');
    expect(screen.queryByText('표시할 운영 결제 내역이 없습니다.')).not.toBeInTheDocument();
  });

  it('shows a selected monthly sales marker on the chart and supports date-range filtering in the table', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-08T09:00:00Z'));

    renderAdminConsoleRoute('/admin/payments');

    expect(await screen.findByRole('heading', { level: 1, name: '결제 관리' })).toBeInTheDocument();
    expect(await screen.findByText('월별 매출 차트')).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByRole('button', { name: '2026년 3월 매출 보기' }));

    expect(await screen.findByText(/2026년 3월 · ₩/)).toBeInTheDocument();
    expect(screen.getByText('ORD-501')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '조회 기간 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '2026. 4. 1.' }));
    fireEvent.click(screen.getByRole('button', { name: '2026. 4. 30.' }));
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(await screen.findByText('선택한 기간에 결제 내역이 없습니다.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /2026\. 4\. 1\./ }));
    fireEvent.click(screen.getByRole('button', { name: '초기화' }));

    expect(await screen.findByText('ORD-501')).toBeInTheDocument();
  });

  it('moves from the program list to the dedicated create page', async () => {
    renderAdminConsoleRoute('/admin/programs');

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 관리' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('복부초음파 기초')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '새 프로그램 등록' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 통합 등록' }),
    ).toBeInTheDocument();
  });

  it('shows program visibility action buttons as the current visibility state', async () => {
    renderAdminConsoleRoute('/admin/programs');

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 관리' }),
    ).toBeInTheDocument();

    const publishedProgramRow = (await screen.findByText('복부초음파 기초')).closest('tr');
    const hiddenProgramRow = (await screen.findByText('FAST 집중 실습')).closest('tr');

    expect(publishedProgramRow).toBeInstanceOf(HTMLTableRowElement);
    expect(hiddenProgramRow).toBeInstanceOf(HTMLTableRowElement);
    expect(
      within(publishedProgramRow as HTMLTableRowElement).getByRole('button', { name: '공개' }),
    ).toBeInTheDocument();
    expect(
      within(hiddenProgramRow as HTMLTableRowElement).getByRole('button', { name: '숨김' }),
    ).toBeInTheDocument();
  });

  it('shows the blocked delete reason without sending a delete request', async () => {
    let deleteRequested = false;
    const confirmSpy = vi.spyOn(window, 'confirm');

    server.use(
      http.get('*/api/v1/admin/programs', () => {
        return HttpResponse.json({
          data: {
            content: [
              {
                activeEnrollmentCount: 3,
                catalogStatus: 'OPEN',
                categoryId: 2,
                categoryName: '내과과정',
                currentStudents: 3,
                deletable: false,
                deleteBlockedReason:
                  '수강 등록 이력이 있는 프로그램은 삭제할 수 없습니다. 결제 없이 관리자 수동 등록되었거나 만료/취소된 수강 기록이 남아 있습니다.',
                featured: false,
                full: false,
                id: 2001,
                level: 'BEGINNER',
                maxStudents: null,
                price: 220000,
                programType: 'ONLINE',
                published: false,
                saleEndAt: null,
                salePrice: null,
                saleStartAt: null,
                slug: 'abdomen-ultrasound-basic',
                thumbnailUrl: null,
                title: '복부초음파 기초',
              },
            ],
          },
        });
      }),
      http.delete('*/api/v1/admin/programs/:programId', () => {
        deleteRequested = true;
        return HttpResponse.json({ data: null });
      }),
    );

    renderAdminConsoleRoute('/admin/programs');

    expect(await screen.findByText('복부초음파 기초')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));

    await waitFor(() => {
      expect(
        useToastStore
          .getState()
          .toasts.some(
            (toast) =>
              toast.message ===
              '수강 등록 이력이 있는 프로그램은 삭제할 수 없습니다. 결제 없이 관리자 수동 등록되었거나 만료/취소된 수강 기록이 남아 있습니다.',
          ),
      ).toBe(true);
    });
    expect(deleteRequested).toBe(false);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('opens duplicate programs in the integrated draft workspace with curriculum copied', async () => {
    const draftDetail = createAdminProgramDraftDetailFixture();
    draftDetail.finalProgramId = null;
    draftDetail.payload.basicInfo.title = '복부초음파 기초 복제본';
    draftDetail.payload.basicInfo.saleStartAt = '2026-04-01T00:00:00Z';
    draftDetail.payload.basicInfo.saleEndAt = '2026-04-30T23:59:59Z';
    draftDetail.payload.basicInfo.learningStartAt = '2026-05-01T00:00:00Z';
    draftDetail.payload.basicInfo.learningEndAt = '2026-05-31T23:59:59Z';
    draftDetail.payload.sections[0].title = '기본 섹션';
    draftDetail.payload.sections[0].lectures[0].title = '오리엔테이션';

    renderAdminConsoleRoute('/admin/programs/2001/duplicate', { draftDetail });

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 통합 등록' }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('복부초음파 기초 복제본')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '강의 구성' }));

    expect(await screen.findByText('기본 섹션')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '섹션 펼치기' }));
    expect(await screen.findByText('오리엔테이션')).toBeInTheDocument();
  });

  it('blocks a new-cohort duplicate while its copied recruitment and learning periods have ended', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'));
    const draftDetail = createValidAdminProgramDraftDetailFixture();
    draftDetail.finalProgramId = null;
    draftDetail.payload.basicInfo.accessDays = 20;
    draftDetail.payload.basicInfo.accessPolicy = 'FIXED_DURATION';
    draftDetail.payload.basicInfo.learningEndAt = '2026-08-20T14:59:59Z';
    draftDetail.payload.basicInfo.learningStartAt = '2026-08-02T00:00:00Z';
    draftDetail.payload.basicInfo.programType = 'OFFLINE';
    draftDetail.payload.basicInfo.saleEndAt = '2026-08-20T14:59:59Z';
    draftDetail.payload.basicInfo.saleStartAt = '2026-08-01T00:00:00Z';
    let finalized = false;

    server.use(
      http.post('*/api/v1/admin/program-drafts/:draftId/finalize', () => {
        finalized = true;
        return HttpResponse.json({ data: { programId: 3001 } });
      }),
    );

    renderAdminConsoleRoute('/admin/programs/2001/duplicate?draftId=91001', { draftDetail });

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 통합 등록' }),
    ).toBeInTheDocument();

    vi.setSystemTime(new Date('2026-08-21T00:00:00Z'));
    fireEvent.click(screen.getByRole('button', { name: '등록 완료' }));

    expect(
      screen.getAllByText('새 기수 복제본의 모집 종료일은 현재 이후로 설정해 주세요.').length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText('새 기수 복제본의 수강 종료일은 현재 이후로 설정해 주세요.').length,
    ).toBeGreaterThan(0);
    expect(finalized).toBe(false);
    const recruitmentRangeButton = document.querySelector(
      "[data-draft-focus-key='basic-recruitment-range'] button",
    );
    await waitFor(() => {
      expect(document.activeElement).toBe(recruitmentRangeButton);
    });
  });

  it('shows the student column in the program list with offline capacity only for offline programs', async () => {
    renderAdminConsoleRoute('/admin/programs');

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 관리' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: '확정 수강생' })).toBeInTheDocument();
    expect(await screen.findByText('12명')).toBeInTheDocument();
    expect(screen.getByText('20 / 20')).toBeInTheDocument();
  });

  it('warns before editing an ended program and guides new cohorts to duplication', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    let duplicateSourceProgramId: string | null = null;

    server.use(
      http.get('*/api/v1/admin/programs', () => {
        return HttpResponse.json({
          data: {
            content: [
              {
                activeEnrollmentCount: 0,
                catalogStatus: 'ENDED',
                categoryId: 2,
                categoryName: '내과과정',
                currentStudents: 10,
                deletable: false,
                deleteBlockedReason: '수강 등록 이력이 있습니다.',
                featured: false,
                full: true,
                id: 2098,
                level: 'BEGINNER',
                maxStudents: 10,
                price: 10000,
                programType: 'OFFLINE',
                published: true,
                saleEndAt: '2026-08-20T14:59:00Z',
                salePrice: null,
                saleStartAt: '2026-08-15T15:00:00Z',
                slug: 'ended-offline-program',
                thumbnailUrl: null,
                title: '종료된 오프라인 과정',
              },
            ],
          },
        });
      }),
    );

    renderAdminConsoleRoute('/admin/programs');

    const programRow = (await screen.findByText('종료된 오프라인 과정')).closest('tr');

    if (!(programRow instanceof HTMLTableRowElement)) {
      throw new Error('Expected ended program row.');
    }

    expect(within(programRow).getByText('10 / 10')).toBeInTheDocument();
    expect(
      within(programRow).getByText('새 모집은 ‘새 기수로 복제’를 이용해 주세요.'),
    ).toBeInTheDocument();
    expect(within(programRow).getByRole('button', { name: '새 기수로 복제' })).toHaveAttribute(
      'title',
      '새 기수 모집은 기존 프로그램을 복제해 시작하세요.',
    );

    fireEvent.click(within(programRow).getByRole('button', { name: '수정' }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "종료된 프로그램의 수강 기간을 연장하면 기존 만료 수강권이 다시 활성화될 수 있습니다.\n새 기수 모집은 '새 기수로 복제'를 이용해 주세요.\n기존 프로그램을 수정하시겠습니까?",
    );
    expect(screen.getByRole('heading', { level: 1, name: '프로그램 관리' })).toBeInTheDocument();

    const duplicateDraft = createAdminProgramDraftDetailFixture();
    duplicateDraft.payload.basicInfo.title = '종료된 오프라인 과정 복제본';
    server.use(
      http.post('*/api/v1/admin/program-drafts/duplicate-from-program/:programId', ({ params }) => {
        duplicateSourceProgramId = String(params['programId']);
        return HttpResponse.json({ data: duplicateDraft });
      }),
    );

    fireEvent.click(within(programRow).getByRole('button', { name: '새 기수로 복제' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 통합 등록' }),
    ).toBeInTheDocument();
    expect(duplicateSourceProgramId).toBe('2098');
  });

  it('keeps lecture type fixed and shows video duration as readonly in the create curriculum workspace', async () => {
    renderAdminConsoleRoute('/admin/programs/new/curriculum?draftId=91001');

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 통합 등록' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '섹션 펼치기' }));
    fireEvent.click(screen.getByRole('button', { name: '강의 펼치기' }));

    expect(screen.getByText('강의 1-영상')).toBeInTheDocument();
    expect(screen.getByText('영상 길이')).toBeInTheDocument();
    expect(screen.queryByLabelText('강의 종류')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('길이(초)')).not.toBeInTheDocument();
  });

  it('focuses and warns on the first missing program registration field', async () => {
    renderAdminConsoleRoute('/admin/programs/new?draftId=91001');

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 통합 등록' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '등록 완료' }));

    expect(
      (await screen.findAllByText('기본정보: 카테고리를 선택해 주세요.')).length,
    ).toBeGreaterThan(0);

    await waitFor(() => {
      expect(document.activeElement).toHaveAccessibleName(/카테고리 선택/);
    });

    expect(screen.getByRole('status')).toHaveTextContent('기본정보: 카테고리를 선택해 주세요.');
  });

  it('formats the program registration price input with thousands separators', async () => {
    renderAdminConsoleRoute('/admin/programs/new?draftId=91001');

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 통합 등록' }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('정가'), {
      target: { value: '1234567' },
    });

    expect(screen.getByLabelText('정가')).toHaveValue('1,234,567');
  });

  it('warns for missing recruitment and learning ranges on fixed-duration registration', async () => {
    const draftDetail = createAdminProgramDraftDetailFixture();
    draftDetail.payload.basicInfo.accessPolicy = 'FIXED_DURATION';
    draftDetail.payload.basicInfo.categoryId = 1101;
    draftDetail.payload.basicInfo.price = 100000;
    draftDetail.payload.basicInfo.title = '고정 기간 테스트 과정';
    draftDetail.payload.basicInfo.saleEndAt = null;
    draftDetail.payload.basicInfo.saleStartAt = null;
    draftDetail.payload.basicInfo.learningEndAt = null;
    draftDetail.payload.basicInfo.learningStartAt = null;

    renderAdminConsoleRoute('/admin/programs/new?draftId=91001', {
      draftDetail,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 통합 등록' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '등록 완료' }));

    expect(
      (await screen.findAllByText('지정 기간 수강은 모집 시작일과 종료일을 입력해 주세요.')).length,
    ).toBeGreaterThan(0);

    await waitFor(() => {
      expect(document.activeElement).toHaveAccessibleName('상시 모집');
    });

    fireEvent.click(screen.getByRole('button', { name: '상시 모집' }));
    fireEvent.click(screen.getAllByRole('button', { name: '4' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: '5' })[0]);
    fireEvent.click(screen.getByRole('button', { name: '등록 완료' }));

    expect(
      (
        await screen.findAllByText(
          '지정 기간 수강은 수강 시작일과 종료일을 올바르게 입력해 주세요.',
        )
      ).length,
    ).toBeGreaterThan(0);
  });

  it('warns when rolling-days registration is missing access days', async () => {
    const draftDetail = createAdminProgramDraftDetailFixture();
    draftDetail.payload.basicInfo.accessPolicy = 'ROLLING_DAYS';
    draftDetail.payload.basicInfo.accessDays = null;
    draftDetail.payload.basicInfo.categoryId = 1101;
    draftDetail.payload.basicInfo.price = 100000;
    draftDetail.payload.basicInfo.title = '결제일 기준 테스트 과정';

    renderAdminConsoleRoute('/admin/programs/new?draftId=91001', {
      draftDetail,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 통합 등록' }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('수강 기간')).toBeInTheDocument();
    expect(screen.getByLabelText('결제일 기준 수강일수')).toBeInTheDocument();
    expect(screen.queryByLabelText('지정 기간')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '등록 완료' }));

    expect(
      (await screen.findAllByText('결제일 기준 수강일수는 1일 이상 입력해 주세요.')).length,
    ).toBeGreaterThan(0);

    await waitFor(() => {
      expect(document.activeElement).toHaveAccessibleName('결제일 기준 수강일수');
    });
  });

  it('treats offline lecture duration as schedule-driven and hides legacy prelearning video metadata', async () => {
    const draftDetail = createAdminProgramDraftDetailFixture();
    draftDetail.payload.sections[0].lectures = [
      {
        description: '오프라인 강의 전 안내 영상이 과거 데이터에 남아 있습니다.',
        durationSeconds: 1800,
        key: 'lecture-offline-1',
        lectureType: 'OFFLINE',
        offlineSchedules: [],
        preview: false,
        published: false,
        sortOrder: 0,
        title: '오프라인 실습 1회차',
        videoId: 7001,
        videoUploadErrorMessage: null,
        videoUploadFileName: 'prelearning.mp4',
        videoUploadStatus: 'READY',
      },
    ];

    renderAdminConsoleRoute('/admin/programs/new/curriculum?draftId=91001', {
      draftDetail,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 통합 등록' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '섹션 펼치기' }));
    fireEvent.click(screen.getByRole('button', { name: '강의 펼치기' }));

    expect(screen.getByText('오프라인 강의')).toBeInTheDocument();
    expect(screen.queryByText('선행 영상')).not.toBeInTheDocument();
    expect(screen.queryByText('선행 영상 파일')).not.toBeInTheDocument();
    expect(screen.queryByText('선행 영상 길이')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('길이(초)')).not.toBeInTheDocument();
  });

  it('limits lecture types in the create workspace for online programs', async () => {
    renderAdminConsoleRoute('/admin/programs/new/curriculum?draftId=91001');

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 통합 등록' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '섹션 펼치기' }));
    fireEvent.click(screen.getByRole('button', { name: '새 강의 추가' }));

    expect(screen.getByText('영상 강의')).toBeInTheDocument();
    expect(screen.getByText('문제풀이 강의')).toBeInTheDocument();
    expect(screen.getByText('첨부자료')).toBeInTheDocument();
    expect(screen.queryByText('오프라인 강의')).not.toBeInTheDocument();
    expect(screen.queryByText('실습 강의')).not.toBeInTheDocument();
  });

  it('saves the draft payload when a lecture is removed from the curriculum workspace', async () => {
    const draftDetail = createAdminProgramDraftDetailFixture();
    draftDetail.payload.sections[0].title = '1주차';
    draftDetail.payload.sections[0].lectures = [
      {
        ...draftDetail.payload.sections[0].lectures[0],
        key: 'lecture-keep',
        sortOrder: 0,
        title: '유지할 강의',
      },
      {
        ...draftDetail.payload.sections[0].lectures[0],
        key: 'lecture-remove',
        sortOrder: 1,
        title: '삭제할 강의',
        videoId: 119,
      },
    ];

    let savedPayload: unknown = null;

    server.use(
      http.put('*/api/v1/admin/program-drafts/:draftId', async ({ request }) => {
        savedPayload = await request.json();
        return HttpResponse.json({ data: { ...draftDetail, payload: savedPayload } });
      }),
    );

    renderAdminConsoleRoute('/admin/programs/new/curriculum?draftId=91001', {
      draftDetail,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 통합 등록' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '섹션 펼치기' }));
    fireEvent.click(screen.getAllByRole('button', { name: '강의 삭제' })[1]);

    await waitFor(() => {
      expect(savedPayload).toMatchObject({
        sections: [
          {
            lectures: [
              {
                key: 'lecture-keep',
                sortOrder: 0,
              },
            ],
          },
        ],
      });
    });
    expect(JSON.stringify(savedPayload)).not.toContain('lecture-remove');
  });

  it('auto-hides video lectures without videos when finalizing a draft', async () => {
    const draftDetail = createAdminProgramDraftDetailFixture();
    draftDetail.payload.basicInfo.categoryId = 1101;
    draftDetail.payload.basicInfo.price = 100000;
    draftDetail.payload.basicInfo.title = '영상 없는 강의 저장 테스트';
    draftDetail.payload.sections[0].title = '1주차';
    draftDetail.payload.sections[0].lectures[0] = {
      ...draftDetail.payload.sections[0].lectures[0],
      key: 'lecture-without-video',
      published: true,
      title: '영상 준비 중 강의',
      videoUploadErrorMessage: '영상 업로드가 실패했습니다.',
      videoUploadFileName: 'failed-video.mp4',
      videoUploadStatus: 'FAILED',
    };

    let savedPayload: unknown = null;
    let finalized = false;

    server.use(
      http.put('*/api/v1/admin/program-drafts/:draftId', async ({ request }) => {
        savedPayload = await request.json();
        return HttpResponse.json({ data: { ...draftDetail, payload: savedPayload } });
      }),
      http.post('*/api/v1/admin/program-drafts/:draftId/finalize', () => {
        finalized = true;
        return HttpResponse.json({ data: { draftId: 91001, programId: 2001 } });
      }),
    );

    renderAdminConsoleRoute('/admin/programs/new/curriculum?draftId=91001', {
      draftDetail,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 통합 등록' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('영상 준비 중 강의: 영상이 없어 비공개로 저장됩니다.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '등록 완료' }));

    await waitFor(() => {
      expect(finalized).toBe(true);
    });
    expect(savedPayload).toMatchObject({
      sections: [
        {
          lectures: [
            {
              key: 'lecture-without-video',
              published: false,
              videoUploadErrorMessage: null,
              videoUploadFileName: null,
              videoUploadStatus: null,
            },
          ],
        },
      ],
    });
  });

  it('limits lecture types in the create workspace for problem solving programs', async () => {
    const draftDetail = createAdminProgramDraftDetailFixture();
    draftDetail.payload.basicInfo.programType = 'PROBLEM_SOLVING';
    draftDetail.payload.sections[0].lectures[0].lectureType = 'PROBLEM';

    renderAdminConsoleRoute('/admin/programs/new/curriculum?draftId=91001', {
      draftDetail,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 통합 등록' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '섹션 펼치기' }));
    fireEvent.click(screen.getByRole('button', { name: '새 강의 추가' }));

    expect(screen.getByText('문제풀이 강의')).toBeInTheDocument();
    expect(screen.getByText('첨부자료')).toBeInTheDocument();
    expect(screen.queryByText('영상 강의')).not.toBeInTheDocument();
    expect(screen.queryByText('오프라인 강의')).not.toBeInTheDocument();
    expect(screen.queryByText('실습 강의')).not.toBeInTheDocument();
  });

  it('restores problem lecture time limit from the problem payload in the create workspace', async () => {
    const draftDetail = createAdminProgramDraftDetailFixture();
    draftDetail.payload.basicInfo.programType = 'PROBLEM_SOLVING';
    draftDetail.payload.sections[0].lectures[0] = {
      ...draftDetail.payload.sections[0].lectures[0],
      key: 'problem-lecture-1',
      lectureType: 'PROBLEM',
      title: '문제풀이',
    };
    draftDetail.payload.problems = [
      {
        lectureKey: 'problem-lecture-1',
        passScore: 100,
        retakeAllowed: false,
        questions: [],
        timeLimitSeconds: 1800,
        title: '문제풀이',
      },
    ];

    renderAdminConsoleRoute('/admin/programs/new/curriculum?draftId=91001', {
      draftDetail,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 통합 등록' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '섹션 펼치기' }));
    fireEvent.click(screen.getByRole('button', { name: '강의 펼치기' }));

    expect(screen.getByLabelText('제한시간(분)')).toHaveValue('30');
  });

  it('edits a program on the dedicated edit page and saves it', async () => {
    const draftDetail = createAdminProgramDraftDetailFixture();
    let savedPayload: unknown = null;

    server.use(
      http.put('*/api/v1/admin/program-drafts/:draftId', async ({ request }) => {
        savedPayload = await request.json();
        return HttpResponse.json({ data: { ...draftDetail, payload: savedPayload } });
      }),
    );

    renderAdminConsoleRoute('/admin/programs/2001/edit');

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 수정' }),
    ).toBeInTheDocument();
    expect(screen.getByText('프로그램 #2001')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '기본정보' }));
    expect(await screen.findByRole('heading', { name: '기본정보' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('프로그램 소개'), {
      target: { value: '프로그램 소개 문구를 관리자에서 수정한 테스트입니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '임시저장' }));

    await waitFor(() => {
      expect(savedPayload).toMatchObject({
        basicInfo: {
          description: '프로그램 소개 문구를 관리자에서 수정한 테스트입니다.',
        },
      });
    });
  });

  it('warns before a resumed edit reactivates matching expired fixed-duration enrollments', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-21T00:00:00Z'));
    const previousLearningEndAt = '2026-08-20T14:59:59Z';
    const draftDetail = createValidAdminProgramDraftDetailFixture();
    draftDetail.finalProgramId = 2001;
    draftDetail.payload.basicInfo.accessDays = 61;
    draftDetail.payload.basicInfo.accessPolicy = 'FIXED_DURATION';
    draftDetail.payload.basicInfo.learningEndAt = '2026-09-30T14:59:59Z';
    draftDetail.payload.basicInfo.learningStartAt = '2026-08-01T00:00:00Z';
    draftDetail.payload.basicInfo.programType = 'OFFLINE';
    draftDetail.payload.basicInfo.saleEndAt = '2026-09-01T14:59:59Z';
    draftDetail.payload.basicInfo.saleStartAt = '2026-07-01T00:00:00Z';
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    let originalProgramRequested = false;
    let originalEnrollmentsRequested = false;
    let finalized = false;

    server.use(
      http.get('*/api/v1/admin/programs/2001', () => {
        originalProgramRequested = true;
        return HttpResponse.json({
          data: {
            accessDays: 20,
            accessPolicy: 'FIXED_DURATION',
            activeEnrollmentCount: 0,
            catalogStatus: 'ENDED',
            categoryId: 1101,
            categoryName: '내과과정',
            checklists: [],
            currentStudents: 1,
            description: null,
            documents: [],
            faqs: [],
            featured: false,
            full: false,
            id: 2001,
            learningEndAt: previousLearningEndAt,
            learningOutcomes: [],
            learningPoints: [],
            learningStartAt: '2026-08-01T00:00:00Z',
            level: 'BEGINNER',
            maxStudents: 10,
            operationStatus: 'NORMAL',
            price: 100000,
            programType: 'OFFLINE',
            published: true,
            recommendedFor: [],
            saleEndAt: '2026-08-20T14:59:59Z',
            salePrice: null,
            saleStartAt: '2026-07-01T00:00:00Z',
            slug: 'ended-fixed-duration',
            summaryItems: [],
            thumbnailUrl: null,
            title: '종료된 지정 기간 과정',
          },
        });
      }),
      http.get('*/api/v1/admin/programs/2001/enrollments', () => {
        originalEnrollmentsRequested = true;
        return HttpResponse.json({
          data: [
            {
              cancelledAt: null,
              cancelReason: null,
              canCancelEnrollment: false,
              canCancelPayment: false,
              enrolledAt: '2026-08-01T00:00:00Z',
              enrollmentId: 7201,
              enrollmentStatus: 'EXPIRED',
              expireAt: previousLearningEndAt,
              loginId: 'expired01',
              paidAt: '2026-07-10T00:00:00Z',
              paymentId: 72001,
              paymentStatus: 'COMPLETED',
              phoneNumber: '010-1111-2222',
              userId: 301,
              userName: '만료회원',
            },
          ],
        });
      }),
      http.post('*/api/v1/admin/program-drafts/:draftId/finalize', () => {
        finalized = true;
        return HttpResponse.json({ data: { draftId: 91001, programId: 2001 } });
      }),
    );

    renderAdminConsoleRoute('/admin/programs/2001/edit?draftId=91001', {
      draftDetail,
      skipProgramEditorApis: true,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 수정' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(originalProgramRequested).toBe(true);
      expect(originalEnrollmentsRequested).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: '수정 완료' }));

    expect(confirmSpy).toHaveBeenCalledWith(
      '수강 종료일을 연장하면 기존 만료 수강권 1개가 새 종료일까지 다시 활성화됩니다.\n기존 수강생에게 수강 권한을 다시 부여하시겠습니까?',
    );
    expect(finalized).toBe(false);

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: '수정 완료' }));

    await waitFor(() => {
      expect(finalized).toBe(true);
    });
  });

  it.each([null, 2002])(
    'blocks edit finalization when the resumed draft is linked to %s instead of the route program',
    async (finalProgramId) => {
      const draftDetail = createValidAdminProgramDraftDetailFixture();
      draftDetail.finalProgramId = finalProgramId;
      let finalized = false;

      server.use(
        http.post('*/api/v1/admin/program-drafts/:draftId/finalize', () => {
          finalized = true;
          return HttpResponse.json({ data: { draftId: 91001, programId: 2001 } });
        }),
      );

      renderAdminConsoleRoute('/admin/programs/2001/edit?draftId=91001', { draftDetail });

      expect(
        await screen.findByRole('heading', { level: 1, name: '프로그램 수정' }),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '수정 완료' }));

      await waitFor(() => {
        expect(
          useToastStore
            .getState()
            .toasts.some(
              (toast) =>
                toast.message ===
                '현재 수정 초안이 이 프로그램과 연결되어 있지 않습니다. 프로그램 목록에서 수정을 다시 시작해 주세요.',
            ),
        ).toBe(true);
      });
      expect(finalized).toBe(false);
    },
  );

  it('prefers the server draft over a clean browser snapshot', async () => {
    const draftDetail = createValidAdminProgramDraftDetailFixture();
    draftDetail.payload.basicInfo.learningOutcomes = [
      { label: '서버 최신 성과', value: '서버 최신 설명' },
    ];
    const snapshotPayload = cloneDraftPayload(draftDetail.payload);
    snapshotPayload.basicInfo.learningOutcomes = [
      { label: '브라우저 이전 성과', value: '브라우저 이전 설명' },
    ];
    saveCreateWorkspaceSnapshot(draftDetail.id, {
      lastSavedAt: draftDetail.updatedAt,
      lastSavedPayload: JSON.stringify(snapshotPayload),
      payload: snapshotPayload,
    });

    renderAdminConsoleRoute('/admin/programs/2001/edit', { draftDetail });

    expect(await screen.findByLabelText('학습 성과 제목')).toHaveValue('서버 최신 성과');
    expect(screen.getByLabelText('학습 성과 설명')).toHaveValue('서버 최신 설명');
  });

  it('restores an unsaved browser snapshot based on the current server revision', async () => {
    const draftDetail = createValidAdminProgramDraftDetailFixture();
    draftDetail.payload.basicInfo.learningOutcomes = [
      { label: '서버 저장 성과', value: '서버 저장 설명' },
    ];
    const lastSavedPayload = cloneDraftPayload(draftDetail.payload);
    const snapshotPayload = cloneDraftPayload(lastSavedPayload);
    snapshotPayload.basicInfo.learningOutcomes = [
      { label: '로컬 미저장 성과', value: '로컬 미저장 설명' },
    ];
    saveCreateWorkspaceSnapshot(draftDetail.id, {
      lastSavedAt: draftDetail.updatedAt,
      lastSavedPayload: JSON.stringify(lastSavedPayload),
      payload: snapshotPayload,
    });

    renderAdminConsoleRoute('/admin/programs/2001/edit?draftId=91001', { draftDetail });

    expect(await screen.findByLabelText('학습 성과 제목')).toHaveValue('로컬 미저장 성과');
    expect(screen.getByLabelText('학습 성과 설명')).toHaveValue('로컬 미저장 설명');
  });

  it('rebases unsaved browser changes over newer managed upload state', async () => {
    const draftDetail = createValidAdminProgramDraftDetailFixture();
    draftDetail.updatedAt = '2026-03-27T09:05:00Z';
    draftDetail.payload.basicInfo.learningOutcomes = [
      { label: '서버 저장 성과', value: '서버 저장 설명' },
    ];
    draftDetail.payload.sections[0].lectures[0] = {
      ...draftDetail.payload.sections[0].lectures[0],
      durationSeconds: 120,
      videoId: 7001,
      videoUploadStatus: 'READY',
    };
    const lastSavedPayload = cloneDraftPayload(draftDetail.payload);
    lastSavedPayload.sections[0].lectures[0] = {
      ...lastSavedPayload.sections[0].lectures[0],
      durationSeconds: null,
      videoId: null,
      videoUploadStatus: 'PROCESSING',
    };
    const snapshotPayload = cloneDraftPayload(lastSavedPayload);
    snapshotPayload.basicInfo.learningOutcomes = [
      { label: '로컬 미저장 성과', value: '로컬 미저장 설명' },
    ];
    saveCreateWorkspaceSnapshot(draftDetail.id, {
      lastSavedAt: '2026-03-27T09:00:00Z',
      lastSavedPayload: JSON.stringify(lastSavedPayload),
      payload: snapshotPayload,
    });

    renderAdminConsoleRoute('/admin/programs/2001/edit?draftId=91001', { draftDetail });

    expect(await screen.findByLabelText('학습 성과 제목')).toHaveValue('로컬 미저장 성과');
    await waitFor(() => {
      const storedSnapshot = JSON.parse(
        window.sessionStorage.getItem('admin-program-create-workspace:91001') ?? '{}',
      ) as {
        payload?: AdminProgramDraftDetail['payload'];
      };
      expect(storedSnapshot.payload?.sections[0].lectures[0]).toMatchObject({
        durationSeconds: 120,
        videoId: 7001,
        videoUploadStatus: 'READY',
      });
    });
  });

  it('does not restore an unsaved browser snapshot based on an older server revision', async () => {
    const draftDetail = createValidAdminProgramDraftDetailFixture();
    draftDetail.updatedAt = '2026-03-27T09:00:00.922664Z';
    draftDetail.payload.basicInfo.learningOutcomes = [
      { label: '서버 최신 성과', value: '서버 최신 설명' },
    ];
    const lastSavedPayload = cloneDraftPayload(draftDetail.payload);
    lastSavedPayload.basicInfo.learningOutcomes = [
      { label: '서버 이전 성과', value: '서버 이전 설명' },
    ];
    const snapshotPayload = cloneDraftPayload(lastSavedPayload);
    snapshotPayload.basicInfo.learningOutcomes = [
      { label: '오래된 로컬 성과', value: '오래된 로컬 설명' },
    ];
    saveCreateWorkspaceSnapshot(draftDetail.id, {
      lastSavedAt: '2026-03-27T09:00:00.922100Z',
      lastSavedPayload: JSON.stringify(lastSavedPayload),
      payload: snapshotPayload,
    });

    renderAdminConsoleRoute('/admin/programs/2001/edit?draftId=91001', { draftDetail });

    expect(await screen.findByLabelText('학습 성과 제목')).toHaveValue('서버 최신 성과');
    expect(screen.getByLabelText('학습 성과 설명')).toHaveValue('서버 최신 설명');
  });

  it('does not restore a browser snapshot whose saved baseline differs from the server', async () => {
    const draftDetail = createValidAdminProgramDraftDetailFixture();
    draftDetail.payload.basicInfo.learningOutcomes = [
      { label: '서버 최신 성과', value: '서버 최신 설명' },
    ];
    const lastSavedPayload = cloneDraftPayload(draftDetail.payload);
    lastSavedPayload.basicInfo.learningOutcomes = [
      { label: '서버 이전 성과', value: '서버 이전 설명' },
    ];
    const snapshotPayload = cloneDraftPayload(lastSavedPayload);
    snapshotPayload.basicInfo.learningOutcomes = [
      { label: '로컬 미저장 성과', value: '로컬 미저장 설명' },
    ];
    saveCreateWorkspaceSnapshot(draftDetail.id, {
      lastSavedAt: draftDetail.updatedAt,
      lastSavedPayload: JSON.stringify(lastSavedPayload),
      payload: snapshotPayload,
    });

    renderAdminConsoleRoute('/admin/programs/2001/edit?draftId=91001', { draftDetail });

    expect(await screen.findByLabelText('학습 성과 제목')).toHaveValue('서버 최신 성과');
    expect(screen.getByLabelText('학습 성과 설명')).toHaveValue('서버 최신 설명');
  });

  it('normalizes malformed structured items from a restorable browser snapshot', async () => {
    const draftDetail = createValidAdminProgramDraftDetailFixture();
    const lastSavedPayload = cloneDraftPayload(draftDetail.payload);
    const snapshotPayload = cloneDraftPayload(lastSavedPayload);
    snapshotPayload.basicInfo.summaryItems = [
      {},
    ] as unknown as AdminProgramDraftDetail['payload']['basicInfo']['summaryItems'];
    saveCreateWorkspaceSnapshot(draftDetail.id, {
      lastSavedAt: draftDetail.updatedAt,
      lastSavedPayload: JSON.stringify(lastSavedPayload),
      payload: snapshotPayload,
    });

    renderAdminConsoleRoute('/admin/programs/2001/edit?draftId=91001', { draftDetail });

    expect(await screen.findByLabelText('핵심 포인트 제목')).toHaveValue('');
    expect(screen.getByLabelText('핵심 포인트 설명')).toHaveValue('');
  });

  it('maps edited summary items and learning outcomes to the draft save payload', async () => {
    const draftDetail = createValidAdminProgramDraftDetailFixture();
    draftDetail.payload.basicInfo.summaryItems = [{ label: '기존 제목', value: '기존 설명' }];
    draftDetail.payload.basicInfo.learningOutcomes = [{ label: '기존 성과', value: '기존 내용' }];
    let savedPayload: unknown = null;

    server.use(
      http.put('*/api/v1/admin/program-drafts/:draftId', async ({ request }) => {
        savedPayload = await request.json();
        return HttpResponse.json({ data: { ...draftDetail, payload: savedPayload } });
      }),
    );

    renderAdminConsoleRoute('/admin/programs/2001/edit?draftId=91001', { draftDetail });

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 수정' }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('핵심 포인트 제목'), {
      target: { value: '핵심 포인트 제목' },
    });
    fireEvent.change(screen.getByLabelText('핵심 포인트 설명'), {
      target: { value: '핵심 포인트 설명' },
    });
    fireEvent.change(screen.getByLabelText('학습 성과 제목'), {
      target: { value: '학습 성과 제목' },
    });
    fireEvent.change(screen.getByLabelText('학습 성과 설명'), {
      target: { value: '학습 성과 설명' },
    });
    fireEvent.click(screen.getByRole('button', { name: '임시저장' }));

    await waitFor(() => {
      expect(savedPayload).toMatchObject({
        basicInfo: {
          learningOutcomes: [{ content: '학습 성과 설명', title: '학습 성과 제목' }],
          summaryItems: [{ content: '핵심 포인트 설명', title: '핵심 포인트 제목' }],
        },
      });
    });
  });

  it('allows incomplete structured information during temporary draft saves', async () => {
    const draftDetail = createValidAdminProgramDraftDetailFixture();
    draftDetail.payload.basicInfo.summaryItems = [{ label: '   ', value: '임시 설명' }];
    draftDetail.payload.basicInfo.learningOutcomes = [{ label: '임시 성과', value: '   ' }];
    let savedPayload: unknown = null;

    server.use(
      http.put('*/api/v1/admin/program-drafts/:draftId', async ({ request }) => {
        savedPayload = await request.json();
        return HttpResponse.json({ data: { ...draftDetail, payload: savedPayload } });
      }),
    );

    renderAdminConsoleRoute('/admin/programs/2001/edit?draftId=91001', { draftDetail });

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 수정' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '임시저장' }));

    await waitFor(() => {
      expect(savedPayload).toMatchObject({
        basicInfo: {
          learningOutcomes: [{ content: '   ', title: '임시 성과' }],
          summaryItems: [{ content: '임시 설명', title: '   ' }],
        },
      });
    });
  });

  it.each([
    {
      field: 'summaryItems' as const,
      fieldLabel: '핵심 포인트 제목',
      invalidKey: 'label' as const,
      message: '핵심 포인트 1: 제목을 입력해 주세요.',
    },
    {
      field: 'summaryItems' as const,
      fieldLabel: '핵심 포인트 설명',
      invalidKey: 'value' as const,
      message: '핵심 포인트 1: 설명을 입력해 주세요.',
    },
    {
      field: 'learningOutcomes' as const,
      fieldLabel: '학습 성과 제목',
      invalidKey: 'label' as const,
      message: '학습 성과 1: 제목을 입력해 주세요.',
    },
    {
      field: 'learningOutcomes' as const,
      fieldLabel: '학습 성과 설명',
      invalidKey: 'value' as const,
      message: '학습 성과 1: 설명을 입력해 주세요.',
    },
  ])(
    'blocks finalization and focuses $fieldLabel when it is blank',
    async ({ field, fieldLabel, invalidKey, message }) => {
      const draftDetail = createValidAdminProgramDraftDetailFixture();
      draftDetail.payload.basicInfo.summaryItems = [
        { label: '핵심 포인트 제목', value: '핵심 포인트 설명' },
      ];
      draftDetail.payload.basicInfo.learningOutcomes = [
        { label: '학습 성과 제목', value: '학습 성과 설명' },
      ];
      const currentItem = draftDetail.payload.basicInfo[field][0];
      draftDetail.payload.basicInfo[field] = [{ ...currentItem, [invalidKey]: '   ' }];
      let finalizeCount = 0;

      server.use(
        http.post('*/api/v1/admin/program-drafts/:draftId/finalize', () => {
          finalizeCount += 1;
          return HttpResponse.json({ data: { draftId: 91001, programId: 2001 } });
        }),
      );

      renderAdminConsoleRoute('/admin/programs/2001/edit?draftId=91001', { draftDetail });

      expect(
        await screen.findByRole('heading', { level: 1, name: '프로그램 수정' }),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '수정 완료' }));

      expect(await screen.findByRole('status')).toHaveTextContent(message);
      await waitFor(() => {
        expect(screen.getByLabelText(fieldLabel)).toHaveFocus();
      });
      expect(finalizeCount).toBe(0);
    },
  );

  it('falls back legacy program resources route to the curriculum workspace tab', async () => {
    renderAdminConsoleRoute('/admin/programs/2001/resources');

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 수정' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '강의 구성' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '강의 구성' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('moves from the notice list to dedicated create and edit pages', async () => {
    renderAdminConsoleRoute('/admin/notices');

    expect(
      await screen.findByRole('heading', { level: 1, name: '공지사항 관리' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '새 공지 등록' })).toBeInTheDocument();

    const publishedNoticeRow = (await screen.findByText('수강 신청 및 등록 절차 안내')).closest(
      'tr',
    );
    const hiddenNoticeRow = (await screen.findByText('관리자 내부 초안 공지')).closest('tr');

    expect(publishedNoticeRow).toBeInstanceOf(HTMLTableRowElement);
    expect(hiddenNoticeRow).toBeInstanceOf(HTMLTableRowElement);
    expect(
      within(publishedNoticeRow as HTMLTableRowElement).getByRole('button', { name: '공개' }),
    ).toBeInTheDocument();
    expect(
      within(hiddenNoticeRow as HTMLTableRowElement).getByRole('button', { name: '숨김' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '새 공지 등록' }));

    expect(await screen.findByRole('heading', { level: 1, name: '공지 작성' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '목록으로' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '공지사항 관리' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '수정' })[0]);

    expect(await screen.findByRole('heading', { level: 1, name: '공지 수정' })).toBeInTheDocument();
    expect(screen.getByLabelText('공지 제목')).toHaveValue('관리자 내부 초안 공지');
  });

  it('renders popup management as an image-only workflow', async () => {
    renderAdminConsoleRoute('/admin/popups');

    expect(await screen.findByRole('heading', { level: 1, name: '팝업 관리' })).toBeInTheDocument();
    expect((await screen.findAllByText('노출중')).length).toBeGreaterThan(0);
    fireEvent.click(await screen.findByRole('button', { name: '새 팝업 등록' }));

    expect(await screen.findByLabelText('팝업 이미지 파일')).toBeInTheDocument();
    expect(screen.queryByLabelText('이동 URL')).not.toBeInTheDocument();
    expect(screen.queryByText('노출기간')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '상시 노출' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('노출 우선순위')).not.toBeInTheDocument();
    expect(screen.queryByText('노출 우선순위')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('팝업 제목')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('팝업 본문')).not.toBeInTheDocument();
  });

  it('shows popup management buttons as the current exposure state', async () => {
    const popups: PopupItem[] = [
      {
        altText: '현재 노출 팝업',
        createdAt: '2026-07-11T00:00:00Z',
        id: 9301,
        imageAssetId: 8301,
        imageUrl: 'https://cdn.example.com/popups/visible-popup.webp',
        published: true,
        sortOrder: 0,
        updatedAt: '2026-07-11T00:00:00Z',
        visibleEndAt: null,
        visibleStartAt: null,
      },
      {
        altText: '중지 팝업',
        createdAt: '2026-07-11T00:00:00Z',
        id: 9302,
        imageAssetId: 8302,
        imageUrl: 'https://cdn.example.com/popups/stopped-popup.webp',
        published: false,
        sortOrder: 1,
        updatedAt: '2026-07-11T00:00:00Z',
        visibleEndAt: null,
        visibleStartAt: null,
      },
    ];

    server.use(
      http.get('*/api/v1/admin/popups', () => {
        return HttpResponse.json({ data: popups, timestamp: '2026-07-11T00:00:00Z' });
      }),
    );

    renderAdminConsoleRoute('/admin/popups');

    const visiblePopupRow = (await screen.findByText('현재 노출 팝업')).closest('tr');
    const stoppedPopupRow = screen.getByText('중지 팝업').closest('tr');
    expect(visiblePopupRow).toBeInstanceOf(HTMLTableRowElement);
    expect(stoppedPopupRow).toBeInstanceOf(HTMLTableRowElement);
    expect(
      within(visiblePopupRow as HTMLTableRowElement).getByRole('button', { name: '노출' }),
    ).toHaveAttribute('title', '클릭하면 노출을 중지합니다.');
    expect(
      within(stoppedPopupRow as HTMLTableRowElement).getByRole('button', { name: '중지' }),
    ).toHaveAttribute('title', '클릭하면 노출 처리합니다.');

    fireEvent.click(
      within(visiblePopupRow as HTMLTableRowElement).getByRole('button', { name: '보기' }),
    );

    const previewDialog = await screen.findByRole('dialog', { name: '현재 노출 팝업' });
    expect(within(previewDialog).getByRole('button', { name: '노출' })).toHaveAttribute(
      'title',
      '클릭하면 노출을 중지합니다.',
    );
  });

  it('publishes up to three popups together without unpublishing existing popups', async () => {
    let publishRequestCount = 0;
    let unpublishRequestCount = 0;
    let popups: PopupItem[] = Array.from({ length: 4 }, (_, index) => ({
      altText: `${['첫', '두', '세', '네'][index]} 번째 팝업`,
      createdAt: '2026-07-11T00:00:00Z',
      id: 9401 + index,
      imageAssetId: 8401 + index,
      imageUrl: `https://cdn.example.com/popups/admin-popup-${String(index + 1)}.webp`,
      published: index < 2,
      sortOrder: index,
      updatedAt: '2026-07-11T00:00:00Z',
      visibleEndAt: null,
      visibleStartAt: null,
    }));

    server.use(
      http.get('*/api/v1/admin/popups', () => {
        return HttpResponse.json({ data: popups, timestamp: '2026-07-11T00:00:00Z' });
      }),
      http.post('*/api/v1/admin/popups/:popupId/publish', ({ params }) => {
        publishRequestCount += 1;
        const popupId = Number(params['popupId']);
        popups = popups.map((popup) =>
          popup.id === popupId ? { ...popup, published: true } : popup,
        );
        return HttpResponse.json({
          data: popups.find((popup) => popup.id === popupId),
          timestamp: '2026-07-11T00:00:00Z',
        });
      }),
      http.post('*/api/v1/admin/popups/:popupId/unpublish', () => {
        unpublishRequestCount += 1;
        return HttpResponse.json({ data: null, timestamp: '2026-07-11T00:00:00Z' });
      }),
    );

    renderAdminConsoleRoute('/admin/popups');

    expect((await screen.findAllByText('노출중')).length).toBe(2);
    const thirdPopupRow = screen.getByText('세 번째 팝업').closest('tr');
    const fourthPopupRow = screen.getByText('네 번째 팝업').closest('tr');
    expect(thirdPopupRow).toBeInstanceOf(HTMLTableRowElement);
    expect(fourthPopupRow).toBeInstanceOf(HTMLTableRowElement);
    fireEvent.click(
      within(thirdPopupRow as HTMLTableRowElement).getByRole('button', { name: '중지' }),
    );
    fireEvent.click(
      within(fourthPopupRow as HTMLTableRowElement).getByRole('button', { name: '중지' }),
    );

    await waitFor(() => {
      expect(screen.getAllByText('노출중')).toHaveLength(3);
    });
    expect(publishRequestCount).toBe(1);
    expect(unpublishRequestCount).toBe(0);

    fireEvent.click(
      within(fourthPopupRow as HTMLTableRowElement).getByRole('button', { name: '중지' }),
    );

    expect(publishRequestCount).toBe(1);
    expect(
      useToastStore
        .getState()
        .toasts.some((toast) => toast.message === '동시에 노출할 수 있는 팝업은 최대 3개입니다.'),
    ).toBe(true);
  });

  it('does not activate a scheduled published popup through editing when three are active', async () => {
    let updateRequestCount = 0;
    const popups: PopupItem[] = Array.from({ length: 4 }, (_, index) => ({
      altText: `수정 상한 팝업 ${String(index + 1)}`,
      createdAt: '2026-07-11T00:00:00Z',
      id: 9501 + index,
      imageAssetId: 8501 + index,
      imageUrl: `https://cdn.example.com/popups/edit-limit-popup-${String(index + 1)}.webp`,
      published: true,
      sortOrder: index,
      updatedAt: '2026-07-11T00:00:00Z',
      visibleEndAt: null,
      visibleStartAt: index === 3 ? '2099-01-01T00:00:00Z' : null,
    }));

    server.use(
      http.get('*/api/v1/admin/popups', () => {
        return HttpResponse.json({ data: popups, timestamp: '2026-07-11T00:00:00Z' });
      }),
      http.put('*/api/v1/admin/popups/:popupId', () => {
        updateRequestCount += 1;
        return HttpResponse.json({ data: popups[3], timestamp: '2026-07-11T00:00:00Z' });
      }),
    );

    renderAdminConsoleRoute('/admin/popups');

    expect((await screen.findAllByText('노출중')).length).toBe(3);
    const scheduledPopupRow = screen.getByText('수정 상한 팝업 4').closest('tr');
    expect(scheduledPopupRow).toBeInstanceOf(HTMLTableRowElement);
    fireEvent.click(
      within(scheduledPopupRow as HTMLTableRowElement).getByRole('button', { name: '수정' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: '팝업 수정' }));

    expect(updateRequestCount).toBe(0);
    expect(
      useToastStore
        .getState()
        .toasts.some((toast) => toast.message === '동시에 노출할 수 있는 팝업은 최대 3개입니다.'),
    ).toBe(true);
  });

  it('renders the qna management section with pending threads first', async () => {
    renderAdminConsoleRoute('/admin/qna');

    expect(await screen.findByLabelText('답변 대기 1건')).toBeInTheDocument();
    expect(screen.getByText('오프라인 핸즈온 과정 환불 기준이 궁금합니다.')).toBeInTheDocument();
    expect(screen.getAllByText('답변 대기').length).toBeGreaterThan(0);
  });

  it('reorders qna notice rows from the management list', async () => {
    const qnaNotices: QuestionItem[] = [
      {
        answered: false,
        authorName: '소노스쿨 운영팀',
        authorType: 'ADMIN',
        content: '<p>첫 공지 내용</p>',
        createdAt: '2026-03-20T00:00:00Z',
        id: 9001,
        mine: true,
        notice: true,
        noticeSortOrder: 0,
        privateQuestion: false,
        programId: null,
        programTitle: null,
        replies: [],
        replyCount: 0,
        scope: 'GLOBAL',
        title: '첫 공지',
        updatedAt: '2026-03-20T00:00:00Z',
      },
      {
        answered: false,
        authorName: '소노스쿨 운영팀',
        authorType: 'ADMIN',
        content: '<p>두 번째 공지 내용</p>',
        createdAt: '2026-03-21T00:00:00Z',
        id: 9002,
        mine: true,
        notice: true,
        noticeSortOrder: 1,
        privateQuestion: false,
        programId: null,
        programTitle: null,
        replies: [],
        replyCount: 0,
        scope: 'GLOBAL',
        title: '두 번째 공지',
        updatedAt: '2026-03-21T00:00:00Z',
      },
    ];
    let reorderPayload: unknown = null;

    server.use(
      http.get('*/api/v1/admin/qna', () => {
        return HttpResponse.json({ data: qnaNotices });
      }),
      http.put('*/api/v1/admin/qna/notices/reorder', async ({ request }) => {
        reorderPayload = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderAdminConsoleRoute('/admin/qna');

    const firstNoticeRow = (await screen.findByText('첫 공지')).closest('tr');

    if (!(firstNoticeRow instanceof HTMLTableRowElement)) {
      throw new Error('Expected first notice table row.');
    }

    fireEvent.click(within(firstNoticeRow).getByRole('button', { name: '아래로' }));

    await waitFor(() => {
      expect(reorderPayload).toEqual({
        items: [
          { id: 9002, sortOrder: 0 },
          { id: 9001, sortOrder: 1 },
        ],
      });
    });

    server.resetHandlers();
  });

  it('updates a qna notice from the admin qna detail', async () => {
    let qnaNotices: QuestionItem[] = [
      {
        answered: false,
        authorName: '소노스쿨 운영팀',
        authorType: 'ADMIN',
        content: '<p>수정 전 공지 내용</p>',
        createdAt: '2026-03-20T00:00:00Z',
        id: 9051,
        mine: true,
        notice: true,
        noticeSortOrder: 0,
        privateQuestion: false,
        programId: null,
        programTitle: null,
        replies: [],
        replyCount: 0,
        scope: 'GLOBAL',
        title: '수정 전 공지',
        updatedAt: '2026-03-20T00:00:00Z',
      },
    ];
    let updatedNoticePayload: unknown = null;

    server.use(
      http.get('*/api/v1/admin/qna', () => {
        return HttpResponse.json({ data: qnaNotices });
      }),
      http.put('*/api/v1/admin/qna/:questionId', async ({ params, request }) => {
        updatedNoticePayload = await request.json();
        const questionId = Number(params['questionId']);
        const payload = updatedNoticePayload as {
          content: string;
          privateQuestion: boolean;
          title: string;
        };

        qnaNotices = qnaNotices.map((notice) =>
          notice.id === questionId
            ? {
                ...notice,
                ...payload,
                updatedAt: '2026-08-16T00:00:00Z',
              }
            : notice,
        );

        return HttpResponse.json({
          data: qnaNotices.find((notice) => notice.id === questionId),
        });
      }),
    );

    const { queryClient } = renderAdminConsoleRoute('/admin/qna');
    queryClient.setQueryData(globalQuestionsQueryKey(), qnaNotices);

    await screen.findByText('수정 전 공지');
    fireEvent.click(getClosestButton('수정 전 공지'));
    fireEvent.click(await screen.findByRole('button', { name: '공지 수정' }));

    expect(screen.getByLabelText('공지 제목')).toHaveValue('수정 전 공지');
    expect(await screen.findByText('수정 전 공지 내용')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('공지 제목'), {
      target: { value: '수정된 공지' },
    });
    fireEvent.click(screen.getByRole('button', { name: '제목 1 · 큰 제목 (32px)' }));
    await waitFor(() => {
      expect(screen.getByText('수정 전 공지 내용').tagName).toBe('H1');
    });
    fireEvent.click(screen.getByRole('button', { name: '공지 저장' }));

    await waitFor(() => {
      expect(updatedNoticePayload).toEqual({
        content: '<h1>수정 전 공지 내용</h1><p></p>',
        privateQuestion: false,
        title: '수정된 공지',
      });
    });
    expect(
      useToastStore.getState().toasts.some((toast) => toast.message === '공지를 수정했습니다.'),
    ).toBe(true);
    await waitFor(() => {
      expect(screen.getAllByText('수정된 공지').length).toBeGreaterThan(0);
      expect(queryClient.getQueryState(globalQuestionsQueryKey())?.isInvalidated).toBe(true);
    });
  });

  it('deletes a qna notice from the admin qna detail', async () => {
    let qnaNotices: QuestionItem[] = [
      {
        answered: false,
        authorName: '소노스쿨 운영팀',
        authorType: 'ADMIN',
        content: '<p>삭제할 공지 내용</p>',
        createdAt: '2026-03-20T00:00:00Z',
        id: 9101,
        mine: true,
        notice: true,
        noticeSortOrder: 0,
        privateQuestion: false,
        programId: null,
        programTitle: null,
        replies: [],
        replyCount: 0,
        scope: 'GLOBAL',
        title: '삭제할 공지',
        updatedAt: '2026-03-20T00:00:00Z',
      },
    ];
    let deletedNoticeId: string | null = null;
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    server.use(
      http.get('*/api/v1/admin/qna', () => {
        return HttpResponse.json({ data: qnaNotices });
      }),
      http.delete('*/api/v1/admin/qna/:questionId', ({ params }) => {
        deletedNoticeId = String(params['questionId']);
        qnaNotices = qnaNotices.filter((notice) => String(notice.id) !== deletedNoticeId);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { queryClient } = renderAdminConsoleRoute('/admin/qna');
    queryClient.setQueryData(globalQuestionsQueryKey(), qnaNotices);

    await screen.findByText('삭제할 공지');
    fireEvent.click(getClosestButton('삭제할 공지'));

    expect(screen.queryByRole('button', { name: '질문 수정' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '공지 삭제' }));

    await waitFor(() => {
      expect(deletedNoticeId).toBe('9101');
    });
    expect(confirmSpy).toHaveBeenCalledWith('이 공지를 삭제하시겠습니까?');
    expect(
      useToastStore.getState().toasts.some((toast) => toast.message === '공지를 삭제했습니다.'),
    ).toBe(true);
    await waitFor(() => {
      expect(screen.queryByText('삭제할 공지')).not.toBeInTheDocument();
      expect(queryClient.getQueryState(globalQuestionsQueryKey())?.isInvalidated).toBe(true);
    });
    confirmSpy.mockRestore();
  });

  it('updates and deletes a question from the admin qna detail', async () => {
    let updatedQuestionPayload: unknown = null;
    let deletedQuestionId: string | null = null;
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    server.use(
      http.put('*/api/v1/admin/qna/:questionId', async ({ params, request }) => {
        updatedQuestionPayload = await request.json();
        return HttpResponse.json({ data: { id: Number(params['questionId']) } });
      }),
      http.delete('*/api/v1/admin/qna/:questionId', ({ params }) => {
        deletedQuestionId = String(params['questionId']);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderAdminConsoleRoute('/admin/qna');

    const questionTitle = '오프라인 핸즈온 과정 환불 기준이 궁금합니다.';
    await screen.findByText(questionTitle);
    fireEvent.click(getClosestButton(questionTitle));
    fireEvent.click(await screen.findByRole('button', { name: '질문 수정' }));

    fireEvent.change(screen.getByLabelText('질문 제목'), {
      target: { value: '수정한 환불 문의' },
    });
    fireEvent.change(screen.getByLabelText('질문 내용'), {
      target: { value: '수정한 환불 문의 내용입니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '질문 저장' }));

    await waitFor(() => {
      expect(updatedQuestionPayload).toEqual({
        content: '수정한 환불 문의 내용입니다.',
        privateQuestion: false,
        title: '수정한 환불 문의',
      });
    });
    expect(
      useToastStore.getState().toasts.some((toast) => toast.message === '질문을 수정했습니다.'),
    ).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '질문 삭제' }));

    await waitFor(() => {
      expect(deletedQuestionId).toBe('3');
    });
    expect(confirmSpy).toHaveBeenCalledWith('이 질문을 삭제하시겠습니까?');
    expect(
      useToastStore.getState().toasts.some((toast) => toast.message === '질문을 삭제했습니다.'),
    ).toBe(true);
    confirmSpy.mockRestore();
  });

  it('updates an admin answer without deleting and recreating it', async () => {
    let updatedReplyPayload: unknown = null;
    let createReplyRequestCount = 0;
    let deleteReplyRequestCount = 0;

    server.use(
      http.put('*/api/v1/admin/qna/replies/:replyId', async ({ params, request }) => {
        updatedReplyPayload = {
          content: await request.json(),
          replyId: String(params['replyId']),
        };
        return HttpResponse.json({
          data: {
            content: '수정된 관리자 답변입니다.',
            id: Number(params['replyId']),
          },
        });
      }),
      http.post('*/api/v1/admin/qna/:questionId/replies', () => {
        createReplyRequestCount += 1;
        return HttpResponse.json({ message: 'Unexpected reply create.' }, { status: 500 });
      }),
      http.delete('*/api/v1/admin/qna/replies/:replyId', () => {
        deleteReplyRequestCount += 1;
        return HttpResponse.json({ message: 'Unexpected reply delete.' }, { status: 500 });
      }),
    );

    renderAdminConsoleRoute('/admin/qna');

    const questionTitle = '회원가입 후 본인인증 문자가 오지 않을 때는 어떻게 하나요?';
    await screen.findByText(questionTitle);
    fireEvent.click(getClosestButton(questionTitle));
    expect(screen.queryByRole('button', { name: '답변 수정' })).not.toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('답변 수정'), {
      target: { value: '수정된 관리자 답변입니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '답변 저장' }));

    await waitFor(() => {
      expect(updatedReplyPayload).toEqual({
        content: { content: '수정된 관리자 답변입니다.' },
        replyId: '101',
      });
    });
    expect(createReplyRequestCount).toBe(0);
    expect(deleteReplyRequestCount).toBe(0);
    expect(
      useToastStore.getState().toasts.some((toast) => toast.message === '답변을 수정했습니다.'),
    ).toBe(true);
  });

  it('deletes an admin qna reply from the selected thread', async () => {
    renderAdminConsoleRoute('/admin/qna');

    await screen.findByText('회원가입 후 본인인증 문자가 오지 않을 때는 어떻게 하나요?');

    fireEvent.click(getClosestButton('회원가입 후 본인인증 문자가 오지 않을 때는 어떻게 하나요?'));
    expect(await screen.findByLabelText('답변 수정')).toHaveValue(
      '통신사 스팸 차단과 번호 입력 형식을 먼저 확인해 주세요. 문제가 계속되면 운영 Q&A나 고객문의로 남겨 주시면 수동 확인해 드립니다.',
    );

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));

    await waitFor(() => {
      expect(
        useToastStore.getState().toasts.some((toast) => toast.message === '답변을 삭제했습니다.'),
      ).toBe(true);
    });
  });

  it('renders the member management section and navigates to member detail', async () => {
    renderAdminConsoleRoute('/admin/enrollments');

    expect(await screen.findByRole('heading', { level: 1, name: '회원관리' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '김민지' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '박수현' })).toBeInTheDocument();
    expect(screen.getByText('닉네임 수현 · 아이디 shpark')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '2' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: '김민지' }));

    expect(await screen.findByRole('heading', { level: 1, name: '회원 상세' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: '김민지' })).toBeInTheDocument();
    expect((await screen.findAllByText('복부초음파 기초')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /복부초음파 기초/ }));

    expect((await screen.findAllByText('혈액가스 문제 풀이')).length).toBeGreaterThan(0);

    fireEvent.click(await screen.findByText('혈액가스 문제 풀이'));

    expect((await screen.findAllByText('이 결과에 해당하는 상태는?')).length).toBeGreaterThan(0);
  });

  it('moves between member management pages', async () => {
    renderAdminConsoleRoute('/admin/enrollments');

    expect(await screen.findByRole('link', { name: '김민지' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2' }));

    expect(await screen.findByRole('link', { name: '테스트회원08' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '김민지' })).not.toBeInTheDocument();
  });

  it('grants a program enrollment from the member detail page', async () => {
    renderAdminConsoleRoute('/admin/enrollments/101');

    expect(await screen.findByRole('heading', { level: 1, name: '회원 상세' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '수강권 지급' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('프로그램'), {
      target: { value: '2004' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '지급' }));

    await waitFor(() => {
      expect(
        useToastStore.getState().toasts.some((toast) => toast.message === '수강권을 지급했습니다.'),
      ).toBe(true);
    });
  });

  it('revokes a manually granted enrollment from the member detail page', async () => {
    renderAdminConsoleRoute('/admin/enrollments/101');

    expect(await screen.findByRole('heading', { level: 1, name: '회원 상세' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /복부 실전 실습예약 마스터/ }));
    fireEvent.click(await screen.findByRole('button', { name: '수강권 회수' }));

    const revokeDialog = await screen.findByRole('dialog', { name: '수강권 회수' });
    fireEvent.change(within(revokeDialog).getByLabelText('회수 사유'), {
      target: { value: '운영자 회수' },
    });
    fireEvent.click(within(revokeDialog).getByRole('button', { name: '수강권 회수' }));

    await waitFor(() => {
      expect(
        useToastStore.getState().toasts.some((toast) => toast.message === '수강권을 회수했습니다.'),
      ).toBe(true);
    });
  });

  it('renders the requested program enrollment fields and uses the enrollment sort mode', async () => {
    let requestedSortMode: string | null = null;

    server.use(
      http.get('*/api/v1/admin/programs', ({ request }) => {
        requestedSortMode = new URL(request.url).searchParams.get('sortMode');

        return HttpResponse.json({
          data: {
            content: [
              {
                activeEnrollmentCount: 3,
                catalogStatus: 'OPEN',
                categoryId: 103,
                categoryName: '소아내분비',
                currentStudents: 7,
                featured: false,
                full: false,
                id: 8101,
                level: 'BEGINNER',
                maxStudents: 8,
                price: 220000,
                programType: 'OFFLINE',
                published: true,
                saleEndAt: null,
                salePrice: null,
                saleStartAt: null,
                slug: 'enrollment-table-fixed',
                thumbnailUrl: null,
                title: '정원제 수강생 관리',
              },
              {
                activeEnrollmentCount: 5,
                catalogStatus: 'CLOSED',
                categoryId: 3,
                categoryName: '응급/POCUS과정',
                currentStudents: 5,
                featured: false,
                full: false,
                id: 8102,
                level: 'INTERMEDIATE',
                maxStudents: null,
                price: 180000,
                programType: 'ONLINE',
                published: false,
                saleEndAt: '2026-03-01T00:00:00Z',
                salePrice: null,
                saleStartAt: null,
                slug: 'enrollment-table-unlimited',
                thumbnailUrl: null,
                title: '무제한 수강생 관리',
              },
            ],
          },
        });
      }),
      http.get('*/api/v1/admin/categories/tree', () => {
        return HttpResponse.json({
          data: [
            {
              active: true,
              children: [
                {
                  active: false,
                  children: [
                    {
                      active: true,
                      children: [],
                      depth: 3,
                      id: 103,
                      name: '소아내분비',
                      slug: 'pediatric-endocrinology',
                      sortOrder: 0,
                    },
                  ],
                  depth: 2,
                  id: 102,
                  name: '소아내과',
                  slug: 'pediatrics',
                  sortOrder: 0,
                },
              ],
              depth: 1,
              id: 101,
              name: '의사과정',
              slug: 'doctor-course',
              sortOrder: 0,
            },
          ],
          timestamp: '2026-08-16T00:00:00Z',
        });
      }),
      http.get('*/api/v1/admin/programs/:programId/enrollments', () => {
        return HttpResponse.json({ data: [] });
      }),
    );

    renderAdminConsoleRoute('/admin/program-enrollments', {
      skipProgramEditorApis: true,
    });

    const programTitle = await screen.findByText('정원제 수강생 관리');
    const programRow = programTitle.closest('tr');
    const programTable = programRow?.closest('table');

    expect(programRow).toBeInstanceOf(HTMLTableRowElement);
    expect(programTable).toBeInstanceOf(HTMLTableElement);
    expect(
      within(programTable as HTMLTableElement)
        .getAllByRole('columnheader')
        .map((header) => header.textContent.trim()),
    ).toEqual(['프로그램명', '카테고리', '확정 수강생', '유형', '판매 상태', '펼침']);
    expect(
      await within(programRow as HTMLTableRowElement).findByText(
        '의사과정 > 소아내과 > 소아내분비',
      ),
    ).toBeInTheDocument();
    expect(within(programRow as HTMLTableRowElement).getByText('7 / 8 명')).toBeInTheDocument();
    expect(within(programRow as HTMLTableRowElement).getByText('오프라인')).toBeInTheDocument();
    expect(within(programRow as HTMLTableRowElement).getByText('판매중')).toBeInTheDocument();
    expect(screen.getByText('5 / 무제한')).toBeInTheDocument();
    expect(screen.getByText('응급/POCUS과정')).toBeInTheDocument();
    expect(requestedSortMode).toBe('ENROLLMENT_MANAGEMENT');

    fireEvent.change(screen.getByRole('searchbox', { name: '프로그램명 검색' }), {
      target: { value: '소아내과' },
    });
    expect(screen.getByText('정원제 수강생 관리')).toBeInTheDocument();
    expect(screen.queryByText('무제한 수강생 관리')).not.toBeInTheDocument();

    const dropdownButton = within(programRow as HTMLTableRowElement).getByRole('button', {
      name: '정원제 수강생 관리 수강생 목록 펼치기',
    });

    expect(dropdownButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(dropdownButton);

    expect(await screen.findByText('회원 리스트')).toBeInTheDocument();
    expect(await screen.findByText('표시할 수강생이 없습니다.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: '정원제 수강생 관리 수강생 목록 접기',
      }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('revokes a manually granted enrollment from the program enrollment detail modal', async () => {
    const cancelRequests: Array<{ enrollmentId: string; reason: unknown }> = [];

    server.use(
      http.get('*/api/v1/admin/programs/2003/enrollments', () => {
        return HttpResponse.json({
          data: [
            {
              cancelledAt: null,
              cancelReason: null,
              canCancelEnrollment: true,
              canCancelPayment: false,
              enrolledAt: '2026-03-08T09:00:00Z',
              enrollmentId: 7002,
              enrollmentStatus: 'ACTIVE',
              expireAt: null,
              loginId: 'minji01',
              paidAt: '2026-03-08T09:00:00Z',
              paymentId: 70002,
              paymentStatus: 'COMPLETED',
              phoneNumber: '010-1111-2222',
              userId: 101,
              userName: '김민지',
            },
          ],
        });
      }),
      http.post('*/api/v1/admin/enrollments/:enrollmentId/cancel', async ({ params, request }) => {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

        cancelRequests.push({
          enrollmentId: String(params['enrollmentId']),
          reason: body['reason'],
        });

        return HttpResponse.json({ data: null }, { status: 204 });
      }),
    );

    renderAdminConsoleRoute('/admin/program-enrollments?programId=2003', {
      skipProgramEditorApis: true,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 수강생 관리' }),
    ).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: '김민지 수강 상세 보기' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(await within(dialog).findByRole('button', { name: '수강권 회수' }));

    const revokeDialog = await screen.findByRole('dialog', { name: '수강권 회수' });
    fireEvent.change(within(revokeDialog).getByLabelText('회수 사유'), {
      target: { value: '프로그램 상세 회수' },
    });
    fireEvent.click(within(revokeDialog).getByRole('button', { name: '수강권 회수' }));

    await waitFor(() => {
      expect(cancelRequests).toContainEqual({
        enrollmentId: '7002',
        reason: '프로그램 상세 회수',
      });
      expect(
        useToastStore.getState().toasts.some((toast) => toast.message === '수강권을 회수했습니다.'),
      ).toBe(true);
    });
  });

  it('cancels a payment from the program enrollment detail modal', async () => {
    const cancelRequests: Array<{
      cancelAmount: unknown;
      cancelType: unknown;
      paymentId: string;
      reason: unknown;
    }> = [];

    server.use(
      http.get('*/api/v1/admin/programs/2003/enrollments', () => {
        return HttpResponse.json({
          data: [
            {
              cancelledAt: null,
              cancelReason: null,
              canCancelEnrollment: true,
              canCancelPayment: true,
              enrolledAt: '2026-03-08T09:00:00Z',
              enrollmentId: 7002,
              enrollmentStatus: 'ACTIVE',
              expireAt: null,
              loginId: 'minji01',
              paidAt: '2026-03-08T09:00:00Z',
              paymentId: 70002,
              paymentStatus: 'COMPLETED',
              phoneNumber: '010-1111-2222',
              userId: 101,
              userName: '김민지',
            },
          ],
        });
      }),
      http.get('*/api/v1/admin/payments/70002', () => {
        return HttpResponse.json({
          data: {
            amount: 2200000,
            approvedAmount: 2200000,
            buyerDisplayName: '김민지',
            buyerLoginId: 'minji01',
            cancelledAmount: 0,
            cancelledAt: null,
            cancelReason: null,
            canCancel: true,
            completedLectureCount: 0,
            failedAt: null,
            lastCancelledAt: null,
            orderName: '복부초음파 기초',
            orderNumber: 'KCP-test-70002',
            orderType: 'PROGRAM',
            paidAt: '2026-03-08T09:00:00Z',
            paymentId: 70002,
            paymentMethod: 'CARD',
            receiptUrl: null,
            registeredAt: null,
            remainingAmount: 2200000,
            requestedAt: '2026-03-08T09:00:00Z',
            status: 'COMPLETED',
            totalLectureCount: 10,
          },
        });
      }),
      http.post('*/api/v1/admin/payments/:paymentId/cancel', async ({ params, request }) => {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

        cancelRequests.push({
          cancelAmount: body['cancelAmount'],
          cancelType: body['cancelType'],
          paymentId: String(params['paymentId']),
          reason: body['reason'],
        });

        return HttpResponse.json({ data: {} });
      }),
    );

    renderAdminConsoleRoute('/admin/program-enrollments?programId=2003', {
      skipProgramEditorApis: true,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 수강생 관리' }),
    ).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: '김민지 수강 상세 보기' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(await within(dialog).findByRole('button', { name: '결제 취소' }));

    await screen.findByLabelText('취소 사유');
    const cancelDialog = await screen.findByRole('dialog', { name: '결제 취소' });
    fireEvent.click(within(cancelDialog).getByRole('checkbox', { name: /부분 취소/ }));
    expect(within(cancelDialog).getByRole('radio', { name: '100%' })).toBeInTheDocument();
    fireEvent.click(within(cancelDialog).getByRole('radio', { name: '50%' }));
    expect(within(cancelDialog).getByLabelText('부분취소 금액')).toHaveValue('1,100,000');
    fireEvent.change(within(cancelDialog).getByLabelText('취소 사유'), {
      target: { value: '프로그램 상세 결제 취소' },
    });
    fireEvent.click(within(cancelDialog).getByRole('button', { name: '결제 취소' }));

    await waitFor(() => {
      expect(cancelRequests).toContainEqual({
        cancelAmount: 1100000,
        cancelType: 'PARTIAL',
        paymentId: '70002',
        reason: '프로그램 상세 결제 취소',
      });
      expect(
        useToastStore
          .getState()
          .toasts.some((toast) => toast.message === '결제 취소를 반영했습니다.'),
      ).toBe(true);
    });
  });

  it('shows and manages a review from the program enrollment detail modal', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const updateRequests: Array<{ body: unknown; reviewId: string }> = [];
    const deleteRequests: string[] = [];

    server.use(
      http.get('*/api/v1/admin/programs/2003/enrollments', () => {
        return HttpResponse.json({
          data: [
            {
              cancelledAt: null,
              cancelReason: null,
              canCancelEnrollment: true,
              canCancelPayment: false,
              enrolledAt: '2026-03-08T09:00:00Z',
              enrollmentId: 7002,
              enrollmentStatus: 'ACTIVE',
              expireAt: null,
              loginId: 'minji01',
              paidAt: '2026-03-08T09:00:00Z',
              paymentId: 70002,
              paymentStatus: 'COMPLETED',
              phoneNumber: '010-1111-2222',
              review: {
                content: '수강생이 작성한 수강평입니다.',
                createdAt: '2026-03-10T09:00:00Z',
                id: 9001,
                rating: 5,
                updatedAt: '2026-03-10T09:00:00Z',
              },
              userId: 101,
              userName: '김민지',
            },
          ],
        });
      }),
      http.put('*/api/v1/admin/reviews/:reviewId', async ({ params, request }) => {
        updateRequests.push({
          body: await request.json(),
          reviewId: String(params['reviewId']),
        });

        return HttpResponse.json({ data: null });
      }),
      http.delete('*/api/v1/admin/reviews/:reviewId', ({ params }) => {
        deleteRequests.push(String(params['reviewId']));

        return HttpResponse.json({ data: null });
      }),
    );

    renderAdminConsoleRoute('/admin/program-enrollments?programId=2003', {
      skipProgramEditorApis: true,
    });

    expect(await screen.findByLabelText('수강평 작성')).toHaveTextContent('O');

    fireEvent.click(await screen.findByRole('button', { name: '김민지 수강 상세 보기' }));

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('수강생이 작성한 수강평입니다.')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: '수강평 수정' }));
    fireEvent.change(within(dialog).getByLabelText('수강평 별점'), {
      target: { value: '4' },
    });
    fireEvent.change(within(dialog).getByLabelText('수강평 내용'), {
      target: { value: '관리자가 수정한 수강평입니다.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '수강평 저장' }));

    await waitFor(() => {
      expect(updateRequests).toContainEqual({
        body: {
          content: '관리자가 수정한 수강평입니다.',
          rating: 4,
        },
        reviewId: '9001',
      });
      expect(
        useToastStore.getState().toasts.some((toast) => toast.message === '수강평을 수정했습니다.'),
      ).toBe(true);
    });

    fireEvent.click(within(dialog).getByRole('button', { name: '수강평 삭제' }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        '수강평을 삭제하면 복구할 수 없습니다.\n계속하시겠습니까?',
      );
      expect(deleteRequests).toContain('9001');
      expect(
        useToastStore.getState().toasts.some((toast) => toast.message === '수강평을 삭제했습니다.'),
      ).toBe(true);
    });
  });

  it('labels cancelled and future program enrollments without showing them as active', async () => {
    server.use(
      http.get('*/api/v1/admin/programs/2003/enrollments', () => {
        return HttpResponse.json({
          data: [
            {
              cancelledAt: '2026-06-20T09:00:00Z',
              cancelReason: '관리자 취소',
              canCancelEnrollment: false,
              canCancelPayment: false,
              enrolledAt: '2026-06-10T09:00:00Z',
              enrollmentId: 7101,
              enrollmentStatus: 'ACTIVE',
              expireAt: '2026-09-10T09:00:00Z',
              loginId: 'cancelled01',
              paidAt: '2026-06-10T09:00:00Z',
              paymentId: 71001,
              paymentStatus: 'CANCELLED',
              phoneNumber: '010-1111-2222',
              userId: 201,
              userName: '취소회원',
            },
            {
              cancelledAt: null,
              cancelReason: null,
              canCancelEnrollment: false,
              canCancelPayment: true,
              enrolledAt: '2999-07-07T00:00:00Z',
              enrollmentId: 7102,
              enrollmentStatus: 'ACTIVE',
              expireAt: '2999-10-15T00:00:00Z',
              loginId: 'future01',
              paidAt: '2026-06-24T09:00:00Z',
              paymentId: 71002,
              paymentStatus: 'COMPLETED',
              phoneNumber: '010-3333-4444',
              userId: 202,
              userName: '예정회원',
            },
            {
              cancelledAt: null,
              cancelReason: null,
              canCancelEnrollment: false,
              canCancelPayment: false,
              enrolledAt: '2000-01-01T00:00:00Z',
              enrollmentId: 7103,
              enrollmentStatus: 'EXPIRED',
              expireAt: '2000-02-01T00:00:00Z',
              loginId: 'expired01',
              paidAt: '2000-01-01T00:00:00Z',
              paymentId: 71003,
              paymentStatus: 'COMPLETED',
              phoneNumber: '010-5555-6666',
              userId: 203,
              userName: '만료회원',
            },
          ],
        });
      }),
    );

    renderAdminConsoleRoute('/admin/program-enrollments?programId=2003', {
      skipProgramEditorApis: true,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 수강생 관리' }),
    ).toBeInTheDocument();

    const cancelledRow = (await screen.findByText('취소회원')).closest('tr');
    const futureRow = (await screen.findByText('예정회원')).closest('tr');
    const expiredRow = (await screen.findByText('만료회원')).closest('tr');

    if (
      !(cancelledRow instanceof HTMLTableRowElement) ||
      !(futureRow instanceof HTMLTableRowElement) ||
      !(expiredRow instanceof HTMLTableRowElement)
    ) {
      throw new Error('Expected program enrollment rows.');
    }

    expect(within(cancelledRow).getByText('결제취소')).toBeInTheDocument();
    expect(within(cancelledRow).queryByText('수강중')).not.toBeInTheDocument();
    expect(within(futureRow).getByText('수강예정')).toBeInTheDocument();
    expect(within(expiredRow).getByText('만료')).toBeInTheDocument();
    expect(screen.getByText('확정 2명')).toBeInTheDocument();
    expect(screen.getByText('진행·예정 1명')).toBeInTheDocument();
    expect(screen.getByText('만료 1명')).toBeInTheDocument();
    expect(screen.getByText('취소 1명')).toBeInTheDocument();
  });

  it('renders the dedicated practicum management section', async () => {
    renderAdminConsoleRoute('/admin/practicum');

    expect(await screen.findByRole('heading', { level: 1, name: '일정관리' })).toBeInTheDocument();
    expect((await screen.findAllByRole('heading', { level: 3 })).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '당일일정변경' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '운영시간 설정 변경' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '개인일정 추가' })).toBeInTheDocument();
  });

  it('defaults operating hour changes to the selected date weekday only', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 16, 9, 0, 0));
    const operatingHourPayloads: Record<string, unknown>[] = [];

    server.use(
      http.put('*/api/v1/admin/practicum/operating-hours', async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        operatingHourPayloads.push(body);

        return HttpResponse.json({ data: [] });
      }),
    );

    renderAdminConsoleRoute('/admin/practicum');

    expect(await screen.findByRole('heading', { level: 1, name: '일정관리' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '운영시간 설정 변경' }));

    expect(
      await screen.findByText('선택한 날짜부터 체크한 요일의 기본 운영시간을 변경합니다.'),
    ).toBeInTheDocument();

    const mondayButton = screen.getByRole('button', { name: '월요일' });
    const sundayButton = screen.getByRole('button', { name: '일요일' });
    const tuesdayButton = screen.getByRole('button', { name: '화요일' });
    expect(mondayButton).toHaveAttribute('data-selected', 'false');
    expect(sundayButton).toHaveAttribute('data-selected', 'false');
    expect(tuesdayButton).toHaveAttribute('data-selected', 'true');

    fireEvent.click(screen.getByRole('button', { name: '운영시간 변경' }));

    await waitFor(() => {
      expect(operatingHourPayloads).toHaveLength(1);
    });
    expect(operatingHourPayloads[0]).toMatchObject({
      hours: [
        {
          enabled: true,
          weekday: 'TUESDAY',
        },
      ],
    });
  });

  it('opens a detail modal when a practicum or admin schedule entry is clicked', async () => {
    renderAdminConsoleRoute('/admin/practicum');

    await screen.findByRole('heading', { level: 1, name: '일정관리' });

    fireEvent.change(screen.getByLabelText('조회 월'), {
      target: { value: '2026-03' },
    });

    fireEvent.click(await screen.findByRole('button', { name: /실습$/ }));

    expect(await screen.findByRole('heading', { name: '실습 일정 상세' })).toBeInTheDocument();
    expect(screen.getAllByText('김민지').length).toBeGreaterThan(0);
    expect(screen.getAllByText('복부초음파 기초 > 복부 기본 실습').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '모달 닫기' }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '실습 일정 상세' })).not.toBeInTheDocument();
    });

    await openMarchPersonalScheduleDetail();

    expect(screen.getByRole('heading', { name: '개인일정 상세' })).toBeInTheDocument();
    expect(screen.getAllByText('관리자 개인 일정').length).toBeGreaterThan(0);
    expect(screen.getByText('일정시간')).toBeInTheDocument();
    expect(screen.getByText('일정내용')).toBeInTheDocument();
    expect(screen.getByText('센터 미팅 준비와 운영 점검을 진행합니다.')).toBeInTheDocument();
    expect(screen.getByText('진행상태')).toBeInTheDocument();
    expect(screen.getByText(/일정(예정|완료)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '일정변경' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '일정취소' })).toBeInTheDocument();
  });

  it('opens a daily overview modal when a calendar date is clicked', async () => {
    renderAdminConsoleRoute('/admin/practicum');

    await screen.findByRole('heading', { level: 1, name: '일정관리' });

    fireEvent.change(screen.getByLabelText('조회 월'), {
      target: { value: '2026-03' },
    });

    const calendarDayButton = await findMarch29CalendarDayButton();

    fireEvent.click(calendarDayButton);

    const overviewDialog = await screen.findByRole('dialog', { name: '일정관리 상세' });
    expect(within(overviewDialog).getByText('오프라인 강의')).toBeInTheDocument();
    expect(within(overviewDialog).getByText('실습')).toBeInTheDocument();
    expect(within(overviewDialog).getByText('개인일정')).toBeInTheDocument();
  });

  it('supports moving between daily overview and detail modal with a back button', async () => {
    renderAdminConsoleRoute('/admin/practicum');

    await screen.findByRole('heading', { level: 1, name: '일정관리' });

    fireEvent.change(screen.getByLabelText('조회 월'), {
      target: { value: '2026-03' },
    });

    const calendarDayButton = (await screen.findAllByRole('button')).find(
      (button): button is HTMLButtonElement => /일정 \d+건/.test(button.textContent || ''),
    );

    if (!calendarDayButton) {
      throw new Error('일정 버튼을 찾지 못했습니다.');
    }

    fireEvent.click(calendarDayButton);

    expect(await screen.findByRole('heading', { name: '일정관리 상세' })).toBeInTheDocument();

    const practicumOverviewButton = screen
      .getAllByRole('button')
      .find(
        (button): button is HTMLButtonElement =>
          (button.textContent || '').includes('김민지') &&
          (button.textContent || '').includes('활성 예약'),
      );

    if (!practicumOverviewButton) {
      throw new Error('실습 일정 상세 버튼을 찾지 못했습니다.');
    }

    fireEvent.click(practicumOverviewButton);

    expect(await screen.findByRole('heading', { name: '실습 일정 상세' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '일정 목록으로 돌아가기' }));

    expect(await screen.findByRole('heading', { name: '일정관리 상세' })).toBeInTheDocument();
  });

  it('opens the offline schedule detail modal with attendee and prelearning status', async () => {
    renderAdminConsoleRoute('/admin/practicum');

    await screen.findByRole('heading', { level: 1, name: '일정관리' });

    fireEvent.change(screen.getByLabelText('조회 월'), {
      target: { value: '2026-03' },
    });

    const offlinePreviewButton = (await screen.findAllByRole('button', { name: /오프라인$/ })).find(
      (button): button is HTMLButtonElement => button instanceof HTMLButtonElement,
    );

    if (!offlinePreviewButton) {
      throw new Error('오프라인 일정 미리보기 버튼을 찾지 못했습니다.');
    }

    fireEvent.click(offlinePreviewButton);

    expect(await screen.findByRole('heading', { name: '오프라인 일정 상세' })).toBeInTheDocument();
    expect(await screen.findByText('김민지')).toBeInTheDocument();
    expect(await screen.findByText('박준서')).toBeInTheDocument();
    expect(await screen.findByText(/minji01\s+·\s+010-1111-2222/)).toBeInTheDocument();
    expect(await screen.findByText(/junseo02\s+·\s+010-3333-4444/)).toBeInTheDocument();
    expect(await screen.findByText('선행 2/2')).toBeInTheDocument();
    expect(await screen.findByText('선행 1/2')).toBeInTheDocument();
    expect(await screen.findByText('실습복 지참')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '강의일자 변경' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: '김민지 출석 상태' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: '박준서 출석 상태' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio', { name: '선택 안 함' })).toHaveLength(2);
    expect(screen.getAllByRole('radio', { name: '출석' })).toHaveLength(2);
    expect(screen.getAllByRole('radio', { name: '결석' })).toHaveLength(2);
  });

  it('supports moving an offline schedule date from the detail modal', async () => {
    let receivedPayload: unknown = null;

    renderAdminConsoleRoute('/admin/practicum');

    server.use(
      http.get('*/api/v1/admin/programs/:programId/sections', ({ params }) => {
        if (Number(params['programId']) !== 2101) {
          return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
        }

        return HttpResponse.json({
          data: [
            {
              description: '오프라인 집중 강의',
              id: 8201,
              lectures: [
                {
                  description: '실습 중심 강의',
                  durationSeconds: null,
                  id: 9301,
                  lectureType: 'OFFLINE',
                  offlineSchedules: [
                    {
                      date: '2026-03-30',
                      endTime: '16:00',
                      id: 9901,
                      location: '서울 강남 공용 실습실',
                      notes: '실습복 지참',
                      startTime: '14:00',
                    },
                  ],
                  preview: false,
                  published: true,
                  sectionId: 8201,
                  sortOrder: 0,
                  title: '오프라인 집중 실습',
                  videoId: null,
                },
              ],
              sortOrder: 0,
              title: '2주차',
            },
          ],
        });
      }),
      http.put(
        '*/api/v1/admin/lectures/:lectureId/offline-schedules',
        async ({ params, request }) => {
          if (Number(params['lectureId']) !== 9301) {
            return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
          }

          receivedPayload = await request.json();

          return HttpResponse.json({
            data: {
              description: '실습 중심 강의',
              durationSeconds: null,
              id: 9301,
              lectureType: 'OFFLINE',
              offlineSchedules: [
                {
                  date: '2026-03-31',
                  endTime: '16:00',
                  id: 9910,
                  location: '서울 강남 공용 실습실',
                  notes: '실습복 지참',
                  startTime: '14:00',
                },
              ],
              preview: false,
              published: true,
              sectionId: 8201,
              sortOrder: 0,
              title: '오프라인 집중 실습',
              videoId: null,
            },
          });
        },
      ),
    );

    await screen.findByRole('heading', { level: 1, name: '일정관리' });

    fireEvent.change(screen.getByLabelText('조회 월'), {
      target: { value: '2026-03' },
    });

    const offlinePreviewButton = (await screen.findAllByRole('button', { name: /오프라인$/ })).find(
      (button): button is HTMLButtonElement => button instanceof HTMLButtonElement,
    );

    if (!offlinePreviewButton) {
      throw new Error('오프라인 일정 미리보기 버튼을 찾지 못했습니다.');
    }

    fireEvent.click(offlinePreviewButton);

    expect(await screen.findByRole('heading', { name: '오프라인 일정 상세' })).toBeInTheDocument();
    expect(await screen.findByText('김민지')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: '강의일자 변경' }));

    expect(await screen.findByRole('heading', { name: '강의일자 변경' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('이동 날짜'), {
      target: { value: '2026-03-31' },
    });
    fireEvent.click(screen.getByRole('button', { name: '변경 저장' }));

    await waitFor(() => {
      expect(
        useToastStore
          .getState()
          .toasts.some((toast) => toast.message === '오프라인 강의 일정을 변경했습니다.'),
      ).toBe(true);
    });

    expect(receivedPayload).toEqual({
      offlineSchedules: [
        {
          date: '2026-03-31',
          endTime: '16:00',
          location: '서울 강남 공용 실습실',
          notes: '실습복 지참',
          startTime: '14:00',
        },
      ],
    });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '강의일자 변경' })).not.toBeInTheDocument();
    });
  });

  it('supports selecting attendance status for an offline attendee', async () => {
    const attendanceStatuses = new Map<number, 'PRESENT' | 'ABSENT' | 'UNCHECKED'>();

    server.use(
      http.get('*/api/v1/admin/practicum/offline-schedules/:ruleId', ({ params }) => {
        const ruleId = Number(params['ruleId']);

        if (ruleId !== 9901) {
          return HttpResponse.json({ message: 'Offline schedule not found' }, { status: 404 });
        }

        return HttpResponse.json({
          data: {
            activeEnrollmentCount: 12,
            attendees: [
              {
                absent: attendanceStatuses.get(7201) === 'ABSENT',
                attendanceStatus: attendanceStatuses.get(7201) ?? 'UNCHECKED',
                enrollmentId: 7201,
                lectureCompleted: true,
                loginId: 'minji01',
                phoneNumber: '010-1111-2222',
                prerequisiteCompleted: true,
                prerequisiteCompletedCount: 2,
                prerequisiteLastLearningAt: '2026-03-29T04:00:00Z',
                prerequisiteTotalCount: 2,
                userId: 101,
                userName: '김민지',
              },
              {
                absent: attendanceStatuses.get(7202) === 'ABSENT',
                attendanceStatus: attendanceStatuses.get(7202) ?? 'UNCHECKED',
                enrollmentId: 7202,
                lectureCompleted: false,
                loginId: 'junseo02',
                phoneNumber: '010-3333-4444',
                prerequisiteCompleted: false,
                prerequisiteCompletedCount: 1,
                prerequisiteLastLearningAt: '2026-03-29T02:00:00Z',
                prerequisiteTotalCount: 2,
                userId: 102,
                userName: '박준서',
              },
            ],
            endAt: '2026-03-30T07:00:00Z',
            lectureId: 9301,
            lectureTitle: '오프라인 집중 실습',
            location: '서울 강남 공용 실습실',
            maxStudents: 16,
            notes: '실습복 지참',
            programId: 2101,
            programTitle: 'GI tract 마스터 과정',
            ruleId,
            sectionTitle: '2주차',
            startAt: '2026-03-30T05:00:00Z',
            videoAttached: false,
          },
        });
      }),
      http.patch(
        '*/api/v1/admin/practicum/offline-schedules/:ruleId/attendees/:enrollmentId/absence',
        async ({ params, request }) => {
          const enrollmentId = Number(params['enrollmentId']);
          const body = (await request.json()) as { status?: 'PRESENT' | 'ABSENT' | null };

          if (body.status) {
            attendanceStatuses.set(enrollmentId, body.status);
          } else {
            attendanceStatuses.set(enrollmentId, 'UNCHECKED');
          }

          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    renderAdminConsoleRoute('/admin/practicum');

    await screen.findByRole('heading', { level: 1, name: '일정관리' });

    fireEvent.change(screen.getByLabelText('조회 월'), {
      target: { value: '2026-03' },
    });

    fireEvent.click(await screen.findByRole('button', { name: /14:00 - 16:00 오프라인/ }));

    expect(await screen.findByRole('heading', { name: '오프라인 일정 상세' })).toBeInTheDocument();
    expect(await screen.findByText(/010-1111-2222/)).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: '김민지 출석 상태' })).getByRole('radio', {
        name: '결석',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '출석 상태 저장' }));

    await waitFor(() => {
      expect(
        useToastStore
          .getState()
          .toasts.some((toast) => toast.message === '출석 상태를 저장했습니다.'),
      ).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getAllByText('결석').length).toBeGreaterThan(0);
    });

    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: '김민지 출석 상태' })).getByRole('radio', {
        name: '출석',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '출석 상태 저장' }));

    await waitFor(() => {
      expect(screen.getAllByText('출석').length).toBeGreaterThan(0);
    });
  });

  it('shows practicum detail actions and supports the move reservation flow', async () => {
    renderAdminConsoleRoute('/admin/practicum');

    await screen.findByRole('heading', { level: 1, name: '일정관리' });

    fireEvent.change(screen.getByLabelText('조회 월'), {
      target: { value: '2026-03' },
    });

    fireEvent.click(await screen.findByRole('button', { name: /실습$/ }));

    expect(await screen.findByRole('heading', { name: '실습 일정 상세' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '예약일자 변경' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '예약취소' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '불참처리' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '실습완료' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '예약일자 변경' }));

    expect(await screen.findByRole('heading', { name: '예약일자 변경' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '실습 일정 상세로 돌아가기' }));

    expect(await screen.findByRole('heading', { name: '실습 일정 상세' })).toBeInTheDocument();
  });

  it('supports editing a personal schedule from the detail modal', async () => {
    renderAdminConsoleRoute('/admin/practicum');

    await screen.findByRole('heading', { level: 1, name: '일정관리' });

    fireEvent.change(screen.getByLabelText('조회 월'), {
      target: { value: '2026-03' },
    });

    await openMarchPersonalScheduleDetail();

    expect(screen.getByRole('heading', { name: '개인일정 상세' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '일정변경' }));

    expect(await screen.findByRole('heading', { name: '일정변경' })).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).queryByPlaceholderText('예: 외부 미팅 준비 및 주간 운영 점검'),
    ).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('일정명'), {
      target: { value: '관리자 일정 변경' },
    });
    fireEvent.change(within(dialog).getByLabelText('일정내용'), {
      target: { value: '월말 정산 검토 및 팀 공지 정리' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '수정 저장' }));

    await waitFor(() => {
      expect(
        useToastStore
          .getState()
          .toasts.some((toast) => toast.message === '개인 일정을 수정했습니다.'),
      ).toBe(true);
    });

    expect(await screen.findByRole('heading', { name: '개인일정 상세' })).toBeInTheDocument();
    expect(screen.getByText('관리자 일정 변경')).toBeInTheDocument();
    expect(screen.getByText('월말 정산 검토 및 팀 공지 정리')).toBeInTheDocument();
  });

  it('falls back legacy program problems route to the curriculum workspace tab', async () => {
    server.use(
      http.get('*/api/v1/admin/programs/2001/sections', () => {
        return HttpResponse.json({
          data: [
            {
              description: '기본 흐름',
              id: 501,
              lectures: [
                {
                  description: '입문 강의',
                  durationSeconds: 300,
                  id: 9101,
                  preview: true,
                  published: true,
                  sectionId: 501,
                  sortOrder: 0,
                  title: '오리엔테이션',
                  videoId: 7001,
                },
              ],
              sortOrder: 0,
              title: '입문',
            },
          ],
        });
      }),
      http.get('*/api/v1/admin/programs/2001/problem-summaries', () => {
        return HttpResponse.json({
          data: [
            {
              attemptCount: 0,
              averageScore: null,
              hasProblem: true,
              lastSubmittedAt: null,
              lastUpdatedAt: '2026-03-27T09:00:00Z',
              lectureId: 9101,
              questionCount: 1,
              problemId: 8801,
            },
          ],
        });
      }),
      http.get('*/api/v1/admin/lectures/9101/problem', () => {
        return HttpResponse.json({
          data: {
            id: 8801,
            lectureId: 9101,
            passScore: 100,
            passCorrectCount: 1,
            retakeAllowed: false,
            timeLimitSeconds: 1800,
            problemAreaId: 1,
            problemAreaName: '복부 초음파',
            questions: [
              {
                explanation: '프로그램 개요를 다시 확인해 주세요.',
                id: 9901,
                mediaType: null,
                mediaUrl: null,
                problemAreaId: 2,
                problemAreaName: '단순 계산',
                options: [
                  {
                    correct: true,
                    id: 9951,
                    mediaType: null,
                    mediaUrl: null,
                    optionText: '온라인 VOD 과정',
                    sortOrder: 0,
                  },
                  {
                    correct: false,
                    id: 9952,
                    mediaType: null,
                    mediaUrl: null,
                    optionText: '오프라인 실습만 진행',
                    sortOrder: 1,
                  },
                ],
                questionText: '복부초음파 기초 과정의 기본 형태는 무엇인가요?',
                questionType: 'SINGLE',
                sortOrder: 0,
              },
            ],
            title: '오리엔테이션 문제',
          },
        });
      }),
      http.get('*/api/v1/admin/problems/8801/attempts', () => {
        return HttpResponse.json({
          data: [],
        });
      }),
    );

    renderAdminConsoleRoute('/admin/programs/2001/problems?lectureId=9101');

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 수정' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '강의 구성' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '강의 구성' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByText('강의별 문제 현황')).not.toBeInTheDocument();
  });

  it('renders the category management section without category code fields', async () => {
    renderAdminConsoleRoute('/admin/program-menus');

    fireEvent.click(await screen.findByRole('button', { name: '내과과정 카테고리 선택' }));
    expect(screen.queryByLabelText('카테고리 코드')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '새 카테고리' }));

    expect(screen.queryByLabelText('카테고리 코드')).not.toBeInTheDocument();
  });

  it('hides the create-under action when a third-depth category is selected', async () => {
    server.use(
      http.get('*/api/v1/admin/categories/tree', () => {
        return HttpResponse.json({
          data: [
            {
              active: true,
              children: [
                {
                  active: true,
                  children: [
                    {
                      active: true,
                      children: [],
                      depth: 3,
                      id: 103,
                      name: '소아내분비',
                      slug: 'pediatric-endocrinology',
                      sortOrder: 0,
                    },
                  ],
                  depth: 2,
                  id: 102,
                  name: '소아내과',
                  slug: 'pediatrics',
                  sortOrder: 0,
                },
              ],
              depth: 1,
              id: 101,
              name: '의사과정',
              slug: 'doctor-course',
              sortOrder: 0,
            },
          ],
          timestamp: '2026-05-29T00:00:00Z',
        });
      }),
    );

    renderAdminConsoleRoute('/admin/program-menus');

    fireEvent.click(await screen.findByRole('button', { name: '소아내과 카테고리 선택' }));
    fireEvent.click(await screen.findByRole('button', { name: '소아내분비 카테고리 선택' }));
    fireEvent.click(screen.getByRole('tab', { name: '새 카테고리' }));

    expect(screen.getAllByText('의사과정 > 소아내과 > 소아내분비').length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('button', { name: '이 카테고리 하위로 만들기' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '최상위 카테고리로 만들기' })).toBeInTheDocument();
  });

  it('shows only global resources in the resource library and uses dedicated create and edit pages', async () => {
    server.use(
      http.get('*/api/v1/admin/resources', () => {
        return HttpResponse.json({
          data: createAdminResourceFixture(9),
        });
      }),
    );

    renderAdminConsoleRoute('/admin/resources');

    expect(
      await screen.findByRole('heading', { level: 1, name: '자료실 관리' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('자료 1')).toBeInTheDocument();
    expect(screen.queryByText('자료 2')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: '자료 검색' }), {
      target: { value: 'resource-9' },
    });

    await waitFor(() => {
      expect(screen.getByText('자료 9')).toBeInTheDocument();
      expect(screen.queryByText('자료 1')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '새 자료 등록' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 자료 등록' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/자료실에 게시할 전역 자료를 등록합니다\./)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '목록으로' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '자료실 관리' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '수정' })[0]);

    expect(await screen.findByRole('heading', { level: 1, name: '자료 수정' })).toBeInTheDocument();
    expect(screen.getByText('등록된 자료 파일 1개')).toBeInTheDocument();
    expect(screen.getByText('resource-1.pdf')).toBeInTheDocument();
    expect(screen.queryByLabelText('파일 주소')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('MIME 타입')).not.toBeInTheDocument();
  });

  it('shows resource library visibility action buttons as the current visibility state', async () => {
    server.use(
      http.get('*/api/v1/admin/resources', () => {
        return HttpResponse.json({
          data: [
            {
              createdAt: '2026-03-27T09:00:00Z',
              description: '공개 자료 설명',
              fileName: 'public-resource.pdf',
              fileSize: 2048,
              fileUrl: 'https://example.com/public-resource.pdf',
              id: 9101,
              lectureId: null,
              lectureTitle: null,
              mimeType: 'application/pdf',
              programId: null,
              programTitle: null,
              scope: 'GLOBAL',
              sortOrder: 1,
              title: '공개 자료',
              visibility: 'PUBLIC',
            },
            {
              createdAt: '2026-03-27T09:00:00Z',
              description: '숨김 자료 설명',
              fileName: 'hidden-resource.pdf',
              fileSize: 4096,
              fileUrl: 'https://example.com/hidden-resource.pdf',
              id: 9102,
              lectureId: null,
              lectureTitle: null,
              mimeType: 'application/pdf',
              programId: null,
              programTitle: null,
              scope: 'GLOBAL',
              sortOrder: 2,
              title: '숨김 자료',
              visibility: 'HIDDEN',
            },
          ],
        });
      }),
    );

    renderAdminConsoleRoute('/admin/resources');

    const publicResourceRow = (await screen.findByText('공개 자료')).closest('tr');
    const hiddenResourceRow = (await screen.findByText('숨김 자료')).closest('tr');

    expect(publicResourceRow).toBeInstanceOf(HTMLTableRowElement);
    expect(hiddenResourceRow).toBeInstanceOf(HTMLTableRowElement);
    expect(
      within(publicResourceRow as HTMLTableRowElement).getByRole('button', { name: '공개' }),
    ).toBeInTheDocument();
    expect(
      within(hiddenResourceRow as HTMLTableRowElement).getByRole('button', { name: '숨김' }),
    ).toBeInTheDocument();
  });

  it('paginates the resource library by ten global resources', async () => {
    server.use(
      http.get('*/api/v1/admin/resources', () => {
        return HttpResponse.json({
          data: createAdminResourceFixture(22),
        });
      }),
    );

    renderAdminConsoleRoute('/admin/resources');

    expect(await screen.findByText('자료 1')).toBeInTheDocument();
    expect(screen.getByText('자료 19')).toBeInTheDocument();
    expect(screen.queryByText('자료 21')).not.toBeInTheDocument();

    const pagination = screen.getByRole('navigation', { name: '자료실 페이지 이동' });
    fireEvent.click(within(pagination).getByRole('button', { name: '2' }));

    expect(await screen.findByText('자료 21')).toBeInTheDocument();
    expect(screen.queryByText('자료 1')).not.toBeInTheDocument();
  });
});
