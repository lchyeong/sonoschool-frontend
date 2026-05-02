import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/mocks/server';
import AdminConsolePage from '@/pages/AdminConsolePage/AdminConsolePage';
import { adminConsoleRouteTree } from '@/routes/router';
import { useAdminAuthStore } from '@/stores/useAdminAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminProgramDraftDetail } from '@/types/adminProgramDrafts';

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
        slug: null,
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
  },
) => {
  const queryClient = createTestQueryClient();

  mockProgramDraftApis(options?.draftDetail);
  mockProgramEditorApis();

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

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
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

  it('shows the student column in the program list with offline capacity only for offline programs', async () => {
    renderAdminConsoleRoute('/admin/programs');

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 관리' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: '수강생' })).toBeInTheDocument();
    expect(await screen.findByText('12명')).toBeInTheDocument();
    expect(screen.getByText('20 / 20')).toBeInTheDocument();
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
        passCorrectCount: 1,
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
    renderAdminConsoleRoute('/admin/programs/2001/edit');

    expect(
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 수정' }),
    ).toBeInTheDocument();
    expect(screen.getByText('수강생 12명')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('프로그램 소개'), {
      target: { value: '프로그램 소개 문구를 관리자에서 수정한 테스트입니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));

    await waitFor(() => {
      expect(
        useToastStore
          .getState()
          .toasts.some((toast) => toast.message === '프로그램을 수정했습니다.'),
      ).toBe(true);
    });
  });

  it('shows offline programs with current students against capacity on the dedicated edit page', async () => {
    renderAdminConsoleRoute('/admin/programs/2002/edit');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'FAST 집중 실습 수정' }),
    ).toBeInTheDocument();
    expect(screen.getByText('수강생 20/20명')).toBeInTheDocument();
  });

  it('renders the dedicated program resources workspace tab', async () => {
    renderAdminConsoleRoute('/admin/programs/2001/resources');

    expect(
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 강의 구성' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('강의 자료')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '자료 등록' })).toBeInTheDocument();
    expect(screen.getByText('등록된 강의 자료가 없습니다.')).toBeInTheDocument();
  });

  it('moves from the notice list to dedicated create and edit pages', async () => {
    renderAdminConsoleRoute('/admin/notices');

    expect(
      await screen.findByRole('heading', { level: 1, name: '공지사항 관리' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('전역 공지 목록')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '새 공지 등록' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 공지 등록' }),
    ).toBeInTheDocument();

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
    expect(await screen.findByLabelText('팝업 이미지 파일')).toBeInTheDocument();
    expect(screen.queryByLabelText('노출 우선순위')).not.toBeInTheDocument();
    expect(screen.queryByText('노출 우선순위')).not.toBeInTheDocument();
    expect(screen.getAllByText('노출 선택됨').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('팝업 제목')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('팝업 본문')).not.toBeInTheDocument();
  });

  it('renders the qna management section with pending threads first', async () => {
    renderAdminConsoleRoute('/admin/qna');

    expect(await screen.findByText('답변 대기 1건')).toBeInTheDocument();
    expect(screen.getAllByText('오프라인 핸즈온 과정 환불 기준이 궁금합니다.').length).toBe(2);
    expect(screen.getAllByText('답변 대기').length).toBeGreaterThan(0);
  });

  it('deletes an admin qna reply from the selected thread', async () => {
    renderAdminConsoleRoute('/admin/qna');

    await screen.findByText('회원가입 후 본인인증 문자가 오지 않을 때는 어떻게 하나요?');

    fireEvent.click(getClosestButton('회원가입 후 본인인증 문자가 오지 않을 때는 어떻게 하나요?'));
    expect(
      await screen.findByText(/통신사 스팸 차단과 번호 입력 형식을 먼저 확인해 주세요./),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '삭제' })[0]);

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

    fireEvent.click(screen.getByRole('link', { name: '김민지' }));

    expect(await screen.findByRole('heading', { level: 1, name: '회원 상세' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: '김민지' })).toBeInTheDocument();
    expect((await screen.findAllByText('복부초음파 기초')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /복부초음파 기초/ }));

    expect((await screen.findAllByText('혈액가스 문제 풀이')).length).toBeGreaterThan(0);

    fireEvent.click(await screen.findByText('혈액가스 문제 풀이'));

    expect((await screen.findAllByText('이 결과에 해당하는 상태는?')).length).toBeGreaterThan(0);
  });

  it('renders the dedicated practicum management section', async () => {
    renderAdminConsoleRoute('/admin/practicum');

    expect(await screen.findByRole('heading', { level: 1, name: '일정관리' })).toBeInTheDocument();
    expect((await screen.findAllByRole('heading', { level: 3 })).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '당일일정변경' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '운영시간 설정 변경' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '개인일정 추가' })).toBeInTheDocument();
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

    fireEvent.click(await screen.findByRole('button', { name: '관리자 개인 일정' }));

    expect(await screen.findByRole('heading', { name: '개인일정 상세' })).toBeInTheDocument();
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

    const calendarDayButton = (await screen.findAllByRole('button')).find(
      (button): button is HTMLButtonElement => /일정 \d+건/.test(button.textContent || ''),
    );

    expect(calendarDayButton).toBeDefined();

    if (!calendarDayButton) {
      throw new Error('일정 버튼을 찾지 못했습니다.');
    }

    fireEvent.click(calendarDayButton);

    expect(await screen.findByRole('heading', { name: '일정관리 상세' })).toBeInTheDocument();
    expect(screen.getByText('오프라인 강의')).toBeInTheDocument();
    expect(screen.getByText('실습')).toBeInTheDocument();
    expect(screen.getByText('개인일정')).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: '예약일자 변경' }));

    expect(await screen.findByRole('heading', { name: '예약일자 변경' })).toBeInTheDocument();
    expect(screen.getAllByText(/잔여 \d+석/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '실습 일정 상세로 돌아가기' }));

    expect(await screen.findByRole('heading', { name: '실습 일정 상세' })).toBeInTheDocument();
  });

  it('supports editing a personal schedule from the detail modal', async () => {
    renderAdminConsoleRoute('/admin/practicum');

    await screen.findByRole('heading', { level: 1, name: '일정관리' });

    fireEvent.change(screen.getByLabelText('조회 월'), {
      target: { value: '2026-03' },
    });

    fireEvent.click(await screen.findByRole('button', { name: '관리자 개인 일정' }));

    expect(await screen.findByRole('heading', { name: '개인일정 상세' })).toBeInTheDocument();

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

  it('renders the dedicated program problems workspace tab', async () => {
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
            passCorrectCount: 1,
            timeLimitSeconds: 1800,
            questions: [
              {
                explanation: '프로그램 개요를 다시 확인해 주세요.',
                id: 9901,
                mediaType: null,
                mediaUrl: null,
                problemAreaId: 1,
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
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 강의 구성' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('강의별 문제 현황')).toBeInTheDocument();
    expect(screen.queryByLabelText('강의 검색')).not.toBeInTheDocument();
    expect(await screen.findAllByText('오리엔테이션')).toHaveLength(3);
    expect(screen.queryByLabelText('문제 설명')).not.toBeInTheDocument();
    expect(await screen.findByLabelText('합격 기준 문항 수')).toBeInTheDocument();
  });

  it('renders the category management section without category code fields', async () => {
    renderAdminConsoleRoute('/admin/program-menus');

    fireEvent.click(await screen.findByRole('button', { name: '내과과정 카테고리 선택' }));
    expect(screen.queryByLabelText('카테고리 코드')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '새 카테고리' }));

    expect(screen.queryByLabelText('카테고리 코드')).not.toBeInTheDocument();
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
    expect(await screen.findByText('전체 공개 자료 목록')).toBeInTheDocument();
    expect(screen.getByText('자료 1')).toBeInTheDocument();
    expect(screen.queryByText('자료 2')).not.toBeInTheDocument();
    expect(
      screen.getByText('프로그램 자료는 프로그램 등록/수정 화면에서만 관리합니다.'),
    ).toBeInTheDocument();

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

    fireEvent.click(screen.getByRole('button', { name: '목록으로' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '자료실 관리' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '수정' })[0]);

    expect(await screen.findByRole('heading', { level: 1, name: '자료 수정' })).toBeInTheDocument();
    expect(screen.getByLabelText('파일명')).toHaveValue('resource-1.pdf');
    expect(screen.getByLabelText('파일 주소')).toHaveValue('https://example.com/resource-1.pdf');
  });
});
