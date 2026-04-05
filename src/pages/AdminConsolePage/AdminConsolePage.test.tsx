import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';
import AdminConsolePage from '@/pages/AdminConsolePage/AdminConsolePage';
import { adminConsoleRouteTree } from '@/routes/router';
import { useAdminAuthStore } from '@/stores/useAdminAuthStore';
import { useToastStore } from '@/stores/useToastStore';

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

const createAdminProgramDraftDetailFixture = () => {
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
        instructorBio: null,
        instructorName: null,
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
      quizzes: [],
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
              offlineScheduleRule: null,
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

const mockProgramDraftApis = () => {
  const draftDetail = createAdminProgramDraftDetailFixture();

  server.use(
    http.get('*/api/v1/admin/program-drafts', () => {
      return HttpResponse.json({ data: [] });
    }),
    http.post('*/api/v1/admin/program-drafts', () => {
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
    http.get('*/api/v1/admin/programs/:programId/quiz-summaries', () => {
      return HttpResponse.json({ data: [] });
    }),
    http.get('*/api/v1/admin/lectures/:lectureId/quiz', () => {
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
  section: 'dashboard' | 'programMenus' | 'programs' | 'practicum' = 'dashboard',
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

const renderAdminConsoleRoute = (initialEntry = '/admin/programs') => {
  const queryClient = createTestQueryClient();

  mockProgramDraftApis();
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
  it('renders the admin dashboard shortcuts', async () => {
    renderAdminConsolePage();

    expect(await screen.findByRole('heading', { level: 1, name: '운영 개요' })).toBeInTheDocument();
    expect(screen.getAllByText('결제 관리').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /공지사항 관리/i })).toHaveAttribute(
      'href',
      '/admin/notices',
    );
    expect(screen.getByRole('link', { name: /팝업 관리/i })).toHaveAttribute(
      'href',
      '/admin/popups',
    );
    expect(screen.getByRole('link', { name: /Q&A 관리/i })).toHaveAttribute('href', '/admin/qna');
    expect(screen.getByRole('link', { name: /프로그램 관리/i })).toHaveAttribute(
      'href',
      '/admin/programs',
    );
    expect(screen.getByRole('link', { name: /결제 관리/i })).toHaveAttribute(
      'href',
      '/admin/payments',
    );
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
    expect(screen.getByText('6 / 20')).toBeInTheDocument();
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

  it('edits a program on the dedicated edit page and saves it', async () => {
    renderAdminConsoleRoute('/admin/programs/2001/edit');

    expect(
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 수정' }),
    ).toBeInTheDocument();
    expect(screen.getByText('현재 수강생 12명')).toBeInTheDocument();

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
    expect(screen.getByText('현재 수강생 6/20명')).toBeInTheDocument();
  });

  it('renders the dedicated program resources workspace tab', async () => {
    renderAdminConsoleRoute('/admin/programs/2001/resources');

    expect(
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 커리큘럼' }),
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

  it('renders the enrollment management section and creates a manual enrollment', async () => {
    renderAdminConsoleRoute('/admin/enrollments');

    expect(await screen.findByRole('heading', { level: 1, name: '수강관리' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: '회원 검색' }), {
      target: { value: '김민' },
    });

    await screen.findByText('minji@example.com');

    fireEvent.click(getClosestButton('minji@example.com'));
    const enrollmentButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent.includes('ID 2001'));

    expect(enrollmentButton).toBeDefined();
    fireEvent.click(enrollmentButton as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: '수강 배정' }));

    await waitFor(() => {
      expect(
        useToastStore
          .getState()
          .toasts.some(
            (toast) =>
              toast.message.includes('김민지') && toast.message.includes('복부초음파 기초'),
          ),
      ).toBe(true);
    });
  });

  it('renders the dedicated practicum management section', async () => {
    renderAdminConsoleRoute('/admin/practicum');

    expect(
      await screen.findByRole('heading', { level: 1, name: '실습일정관리' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 3, name: /선택 날짜/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: '운영 시간 설정' })).toBeInTheDocument();
  });

  it('renders the dedicated program quizzes workspace tab', async () => {
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
      http.get('*/api/v1/admin/programs/2001/quiz-summaries', () => {
        return HttpResponse.json({
          data: [
            {
              attemptCount: 0,
              averageScore: null,
              hasQuiz: true,
              lastSubmittedAt: null,
              lastUpdatedAt: '2026-03-27T09:00:00Z',
              lectureId: 9101,
              questionCount: 1,
              quizId: 8801,
            },
          ],
        });
      }),
      http.get('*/api/v1/admin/lectures/9101/quiz', () => {
        return HttpResponse.json({
          data: {
            description: '학습 전 이해도 확인',
            id: 8801,
            lectureId: 9101,
            passScore: 60,
            questions: [
              {
                explanation: '프로그램 개요를 다시 확인해 주세요.',
                id: 9901,
                mediaType: null,
                mediaUrl: null,
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
      http.get('*/api/v1/admin/quizzes/8801/attempts', () => {
        return HttpResponse.json({
          data: [],
        });
      }),
    );

    renderAdminConsoleRoute('/admin/programs/2001/quizzes?lectureId=9101');

    expect(
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 커리큘럼' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('강의별 문제 현황')).toBeInTheDocument();
    expect(screen.queryByLabelText('강의 검색')).not.toBeInTheDocument();
    expect(await screen.findAllByText('오리엔테이션')).toHaveLength(3);
    expect(await screen.findByLabelText('문제 제목')).toBeInTheDocument();
    expect(await screen.findByLabelText('합격 점수')).toBeInTheDocument();
  });

  it('renders the category management section with category code fields', async () => {
    renderAdminConsoleRoute('/admin/program-menus');

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 카테고리 관리' }),
    ).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '내과과정 카테고리 선택' }));
    expect(screen.getByLabelText('카테고리 코드')).toHaveValue('internal-medicine');

    fireEvent.click(screen.getByRole('tab', { name: '새 카테고리' }));

    expect(screen.getAllByLabelText('카테고리 코드')[0]).toHaveValue('');
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
