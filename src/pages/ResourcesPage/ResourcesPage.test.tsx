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
});
