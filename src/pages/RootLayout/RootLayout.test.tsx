import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppRouteHandle, type AppRouteKey } from '@/routes/routeRegistry';

import RootLayout from './RootLayout';

interface RootLayoutRouteFixture {
  initialEntry: string;
  path: string;
  routeKey?: AppRouteKey;
}

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

const renderRootLayoutRoute = ({ initialEntry, path, routeKey }: RootLayoutRouteFixture) => {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(
    [
      {
        children: [
          {
            element: <RootLayout />,
            path: '/',
            children: [
              {
                element: <div>테스트 화면</div>,
                handle: routeKey ? createAppRouteHandle(routeKey) : undefined,
                path,
              },
            ],
          },
        ],
        path: '/',
      },
    ],
    { initialEntries: [initialEntry] },
  );

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RootLayout', () => {
  it('renders the expanded quick menu without scrolling on common-header pages outside home', () => {
    renderRootLayoutRoute({
      initialEntry: '/programs',
      path: 'programs',
      routeKey: 'programs',
    });

    expect(screen.getByRole('complementary', { name: '빠른 메뉴' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '빠른 메뉴 닫기' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: '페이지 상단으로 이동' })).toBeInTheDocument();
  });

  it.each([
    { initialEntry: '/login', path: 'login', routeKey: 'login' },
    { initialEntry: '/mypage', path: 'mypage', routeKey: 'mypage' },
    {
      initialEntry: '/mypage/learning/101',
      path: 'mypage/learning/:enrollmentId',
      routeKey: 'learningPlayer',
    },
    {
      initialEntry: '/mypage/learning/101/lesson/lesson-1',
      path: 'mypage/learning/:enrollmentId/lesson/:lessonId',
      routeKey: 'learningLesson',
    },
    {
      initialEntry: '/mypage/enrollments/101/practicum',
      path: 'mypage/enrollments/:enrollmentId/practicum',
      routeKey: 'myEnrollmentPracticum',
    },
  ] satisfies RootLayoutRouteFixture[])(
    'does not render the quick menu on $routeKey routes',
    (fixture) => {
      renderRootLayoutRoute(fixture);

      expect(screen.queryByRole('complementary', { name: '빠른 메뉴' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: '페이지 상단으로 이동' }),
      ).not.toBeInTheDocument();
    },
  );

  it('resets window scroll to top when pathname changes', async () => {
    const scrollToSpy = vi.fn();
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [
        {
          children: [
            {
              element: <RootLayout />,
              path: '/',
              children: [
                {
                  element: (
                    <div>
                      <Link to='/second'>상세로 이동</Link>
                    </div>
                  ),
                  path: 'first',
                },
                { element: <div>두번째 화면</div>, path: 'second' },
              ],
            },
          ],
          path: '/',
        },
      ],
      { initialEntries: ['/first'] },
    );

    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollToSpy,
      writable: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    scrollToSpy.mockClear();

    fireEvent.click(screen.getByRole('link', { name: '상세로 이동' }));

    await screen.findByText('두번째 화면');

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith({
        behavior: 'auto',
        left: 0,
        top: 0,
      });
    });
  });
});
