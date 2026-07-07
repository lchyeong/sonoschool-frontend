import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';
import ResourcesPage from '@/pages/ResourcesPage/ResourcesPage';

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

describe('ResourcesPage', () => {
  it('renders live resource items instead of the placeholder page', async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ResourcesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: '자료실' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '2026 상반기 과정 일정표' })).toHaveAttribute(
      'href',
      '/resources/resource-1',
    );
    expect(await screen.findByText('오프라인 실습 준비 체크리스트')).toBeInTheDocument();
    expect(screen.queryByText('상세')).not.toBeInTheDocument();
  });

  it('keeps search working when a resource description is null', async () => {
    server.use(
      http.get('*/api/v1/resources', () => {
        return HttpResponse.json({
          data: [
            {
              attachments: [],
              createdAt: '2026-03-04T09:00:00Z',
              description: null,
              id: 1,
              programId: null,
              programTitle: null,
              publicSlug: 'resource-null-description',
              scope: 'GLOBAL',
              title: '설명 없는 자료',
              visibility: 'PUBLIC',
            },
          ],
          timestamp: new Date().toISOString(),
        });
      }),
    );

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ResourcesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('link', { name: '설명 없는 자료' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: '자료실 검색' }), {
      target: { value: '설명' },
    });
    fireEvent.click(screen.getByRole('button', { name: '검색' }));

    expect(screen.getByRole('link', { name: '설명 없는 자료' })).toBeInTheDocument();
  });

  it('does not render hidden resources even if the API returns them', async () => {
    server.use(
      http.get('*/api/v1/resources', () => {
        return HttpResponse.json({
          data: [
            {
              attachments: [],
              createdAt: '2026-03-04T09:00:00Z',
              description: '게시 자료 설명',
              id: 1,
              programId: null,
              programTitle: null,
              publicSlug: 'visible-resource',
              scope: 'GLOBAL',
              title: '게시 자료',
              visibility: 'PUBLIC',
            },
            {
              attachments: [],
              createdAt: '2026-03-05T09:00:00Z',
              description: '숨김 자료 설명',
              id: 2,
              programId: null,
              programTitle: null,
              publicSlug: 'hidden-resource',
              scope: 'GLOBAL',
              title: '숨김 자료',
              visibility: 'HIDDEN',
            },
          ],
          timestamp: new Date().toISOString(),
        });
      }),
    );

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ResourcesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('link', { name: '게시 자료' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '숨김 자료' })).not.toBeInTheDocument();
    expect(screen.getByText(/총/)).toHaveTextContent('총 1건의 자료');
  });

  it('paginates resources by ten items per page', async () => {
    server.use(
      http.get('*/api/v1/resources', () => {
        return HttpResponse.json({
          data: Array.from({ length: 11 }, (_, index) => {
            const order = index + 1;

            return {
              attachments: [],
              createdAt: `2026-05-${String(order).padStart(2, '0')}T09:00:00Z`,
              description: `자료 설명 ${String(order)}`,
              id: order,
              programId: null,
              programTitle: null,
              publicSlug: `page-resource-${String(order)}`,
              scope: 'GLOBAL',
              title: `페이지 자료 ${String(order)}`,
              visibility: 'PUBLIC',
            };
          }),
          timestamp: new Date().toISOString(),
        });
      }),
    );

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ResourcesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('link', { name: '페이지 자료 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '페이지 자료 10' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '페이지 자료 11' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2' }));

    expect(await screen.findByRole('link', { name: '페이지 자료 11' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '페이지 자료 1' })).not.toBeInTheDocument();
  });
});
