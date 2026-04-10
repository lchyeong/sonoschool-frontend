import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';
import AdminProgramCurriculumSection from '@/pages/AdminConsolePage/AdminProgramCurriculumSection';

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

const renderCurriculumSection = () => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminProgramCurriculumSection
        enabled
        programId={2002}
        programLearningEndAt='2026-06-30T14:59:59.000Z'
        programLearningStartAt='2026-06-01T00:00:00.000Z'
        programType='OFFLINE'
      />
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
});

describe('AdminProgramCurriculumSection', () => {
  it('limits offline schedule dates to the program learning period on edit screens', async () => {
    server.use(
      http.get('*/api/v1/admin/programs/2002/sections', () => {
        return HttpResponse.json({
          data: [
            {
              description: '현장 강의 섹션',
              id: 501,
              lectures: [
                {
                  description: '현장 실습 안내',
                  durationSeconds: null,
                  id: 9101,
                  lectureType: 'OFFLINE',
                  offlineSchedules: [],
                  practicumEnabled: false,
                  preview: false,
                  published: false,
                  problemOnly: false,
                  sectionId: 501,
                  sortOrder: 0,
                  title: '복부 실습 워크숍',
                  videoId: null,
                },
              ],
              sortOrder: 0,
              title: '오프라인 섹션',
            },
          ],
        });
      }),
    );

    renderCurriculumSection();

    expect(await screen.findByText('오프라인 섹션')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '섹션 펼치기' }));
    fireEvent.click(screen.getByRole('button', { name: '강의 펼치기' }));
    fireEvent.click(screen.getByRole('button', { name: '현장강의 추가' }));

    expect(
      screen.getByText(
        '일정 날짜는 프로그램 수강 기간인 2026-06-01 ~ 2026-06-30 안에서만 등록할 수 있습니다.',
      ),
    ).toBeInTheDocument();

    const dateInput = screen.getByLabelText('일자');
    expect(dateInput).toHaveAttribute('min', '2026-06-01');
    expect(dateInput).toHaveAttribute('max', '2026-06-30');
  });
});
