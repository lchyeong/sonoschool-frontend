import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import RootLayout from './RootLayout';

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

afterEach(() => {
  cleanup();
});

describe('RootLayout', () => {
  it('does not render the quick menu on non-home pages', () => {
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
                  element: <div>교육과정 화면</div>,
                  handle: { access: 'public', routeKey: 'programs' },
                  path: 'programs',
                },
              ],
            },
          ],
          path: '/',
        },
      ],
      { initialEntries: ['/programs'] },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(screen.queryByRole('complementary', { name: '빠른 메뉴' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '페이지 상단으로 이동' })).not.toBeInTheDocument();
  });

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
