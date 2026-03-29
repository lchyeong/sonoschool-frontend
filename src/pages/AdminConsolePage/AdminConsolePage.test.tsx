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

const createAdminTagFixture = (count: number) => {
  const tagTypes = ['TOPIC', 'TARGET', 'FORMAT', 'LEVEL', 'FEATURE'] as const;

  return Array.from({ length: count }, (_, index) => {
    const order = index + 1;

    return {
      active: order % 2 === 1,
      createdAt: '2026-03-27T09:00:00Z',
      id: order,
      name: `태그 ${String(order)}`,
      slug: `tag-${String(order)}`,
      sortOrder: order,
      type: tagTypes[index % tagTypes.length],
      updatedAt: '2026-03-27T09:00:00Z',
    };
  });
};

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

const createAdminCouponFixture = (count: number) => {
  return Array.from({ length: count }, (_, index) => {
    const order = index + 1;

    return {
      active: order % 2 === 1,
      code: `COUPON-${String(order)}`,
      discountType: order % 2 === 0 ? 'PERCENTAGE' : 'FIXED_AMOUNT',
      discountValue: order % 2 === 0 ? 10 : order * 1000,
      id: order,
      maxDiscountAmount: order % 2 === 0 ? 30000 : null,
      minOrderAmount: order * 10000,
      name: `쿠폰 ${String(order)}`,
      validFrom: '2026-03-27T09:00:00Z',
      validUntil: '2026-12-31T14:59:59Z',
    };
  });
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
      await screen.findByRole('heading', { level: 1, name: '새 프로그램 등록' }),
    ).toBeInTheDocument();
  });

  it('edits a program on the dedicated edit page and saves it', async () => {
    renderAdminConsoleRoute('/admin/programs/2001/edit');

    expect(
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 기본정보' }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('프로그램 소개'), {
      target: { value: '프로그램 소개 문구를 관리자에서 수정한 테스트입니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '기본정보 저장' }));

    await waitFor(() => {
      expect(
        useToastStore
          .getState()
          .toasts.some((toast) => toast.message === '프로그램을 수정했습니다.'),
      ).toBe(true);
    });
  });

  it('renders the dedicated program resources workspace tab', async () => {
    renderAdminConsoleRoute('/admin/programs/2001/resources');

    expect(
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 자료' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '새 자료 등록' })).toBeInTheDocument();
    expect(screen.getByText('등록된 프로그램 자료가 없습니다.')).toBeInTheDocument();
  });

  it('renders the qna management section with pending threads first', async () => {
    renderAdminConsoleRoute('/admin/qna');

    expect(await screen.findByText('답변 대기 2건')).toBeInTheDocument();
    expect(screen.getByText('오프라인 핸즈온 과정 환불 기준이 궁금합니다.')).toBeInTheDocument();
    expect(screen.getAllByText('답변 대기').length).toBeGreaterThan(0);
  });

  it('deletes an admin qna reply from the selected thread', async () => {
    renderAdminConsoleRoute('/admin/qna');

    await screen.findByText('복부 실전 워크숍은 사전 복습이 필요한가요?');

    fireEvent.click(getClosestButton('복부 실전 워크숍은 사전 복습이 필요한가요?'));
    expect(
      await screen.findByText(/기본 스캔 루틴 영상은 미리 한번 보고 오시는 것을 권장합니다./),
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
            title: '오리엔테이션 퀴즈',
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
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 퀴즈' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('강의별 퀴즈 현황')).toBeInTheDocument();
    expect(screen.queryByLabelText('강의 검색')).not.toBeInTheDocument();
    expect(await screen.findAllByText('오리엔테이션')).toHaveLength(2);
    expect(await screen.findByText('상세 관리')).toBeInTheDocument();
    expect(await screen.findByText('운영중')).toBeInTheDocument();

    expect(await screen.findByLabelText('퀴즈 제목')).toHaveValue('오리엔테이션 퀴즈');
    expect(await screen.findByLabelText('합격 점수')).toHaveValue('60');

    fireEvent.click(screen.getByRole('button', { name: '응시 결과' }));

    expect(await screen.findByText('수강생 응시 결과')).toBeInTheDocument();
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

  it('renders searchable paginated tags with a dedicated edit tab', async () => {
    server.use(
      http.get('*/api/v1/admin/tags', () => {
        return HttpResponse.json({
          data: createAdminTagFixture(9),
        });
      }),
    );

    renderAdminConsoleRoute('/admin/tags');

    expect(await screen.findByRole('heading', { level: 1, name: '태그 관리' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '태그 1' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2' }));

    expect(await screen.findByRole('button', { name: '태그 9' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: '태그 검색' }), {
      target: { value: 'tag-9' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '태그 9' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '태그 1' })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '수정' }));

    expect(await screen.findByRole('button', { name: '태그 9 수정' })).toBeInTheDocument();
    expect(screen.getByLabelText('태그 코드')).toHaveValue('tag-9');
  });

  it('renders searchable paginated coupons with a dedicated edit tab', async () => {
    server.use(
      http.get('*/api/v1/admin/coupons', () => {
        return HttpResponse.json({
          data: createAdminCouponFixture(9),
        });
      }),
    );

    renderAdminConsoleRoute('/admin/coupons');

    expect(await screen.findByRole('heading', { level: 1, name: '쿠폰 관리' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '쿠폰 1' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2' }));

    expect(await screen.findByRole('button', { name: '쿠폰 9' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: '쿠폰 검색' }), {
      target: { value: 'COUPON-9' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '쿠폰 9' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '쿠폰 1' })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '수정' }));

    expect(await screen.findByRole('button', { name: '쿠폰 9 수정' })).toBeInTheDocument();
    expect(screen.getByLabelText('쿠폰 코드')).toHaveValue('COUPON-9');
  });

  it('renders searchable paginated resources with a dedicated edit tab', async () => {
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
    expect(await screen.findByRole('button', { name: '자료 1' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2' }));

    expect(await screen.findByRole('button', { name: '자료 9' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: '자료 검색' }), {
      target: { value: 'resource-9' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '자료 9' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '자료 1' })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '수정' }));

    expect(await screen.findByRole('button', { name: '자료 9 수정' })).toBeInTheDocument();
    expect(screen.getByLabelText('파일명')).toHaveValue('resource-9.pdf');
    expect(screen.getByLabelText('파일 주소')).toHaveValue('https://example.com/resource-9.pdf');
  });
});
