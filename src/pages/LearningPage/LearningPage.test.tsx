import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LearningPage from '@/pages/LearningPage/LearningPage';
import type { LearningPlayerSnapshot } from '@/types/mypage';

const fetchMyLearningPlayerSnapshotMock =
  vi.fn<(enrollmentId: number, deviceId?: string) => Promise<LearningPlayerSnapshot>>();

vi.mock('@/api/mypage', () => ({
  fetchMyLearningPlayerSnapshot: (enrollmentId: number, deviceId?: string) =>
    fetchMyLearningPlayerSnapshotMock(enrollmentId, deviceId),
}));

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

const testSnapshot: LearningPlayerSnapshot = {
  completedLessonIds: ['enrollment-101-lesson-1'],
  currentLessonId: 'enrollment-101-lesson-2',
  curriculumTrack: {
    id: 'track-101',
    sections: [
      {
        description: '기초 루틴',
        durationLabel: '2강',
        id: 'section-1',
        lessons: [
          {
            deliveryType: 'online',
            description: '첫 번째 강의',
            durationLabel: '25분',
            durationMinutes: 25,
            endDate: null,
            id: 'enrollment-101-lesson-1',
            startDate: null,
            title: '복부초음파 기초 1강',
          },
          {
            deliveryType: 'online',
            description: '두 번째 강의',
            durationLabel: '32분',
            durationMinutes: 32,
            endDate: null,
            id: 'enrollment-101-lesson-2',
            startDate: null,
            title: '복부초음파 기초 2강',
          },
        ],
        title: '1단계 학습',
      },
      {
        description: '응용 루틴',
        durationLabel: '1강',
        id: 'section-2',
        lessons: [
          {
            deliveryType: 'online',
            description: '세 번째 강의',
            durationLabel: '28분',
            durationMinutes: 28,
            endDate: null,
            id: 'enrollment-101-lesson-3',
            startDate: null,
            title: '복부초음파 기초 3강',
          },
        ],
        title: '2단계 학습',
      },
    ],
    summaryItems: ['3개 강의', '완료 1개', '진도율 33%'],
    summaryKind: 'decimal',
    title: '복부초음파 기초 플레이어',
  },
  enrollment: {
    active: true,
    completedLessons: 1,
    completionRate: 33,
    enrolledAt: '2026-03-01T09:00:00Z',
    expireAt: '2026-09-30T14:59:59Z',
    id: 101,
    programId: 2001,
    programTitle: '복부초음파 기초',
    status: 'ACTIVE',
    totalLessons: 3,
  },
  lastPlaybackAt: '2026-03-10T11:00:00Z',
  lessonPlaybackById: {
    'enrollment-101-lesson-1': {
      lectureId: 1,
      mimeType: 'application/x-mpegURL',
      posterUrl: null,
    },
    'enrollment-101-lesson-2': {
      lectureId: 2,
      mimeType: 'application/x-mpegURL',
      posterUrl: null,
    },
    'enrollment-101-lesson-3': {
      lectureId: 3,
      mimeType: 'application/x-mpegURL',
      posterUrl: null,
    },
  },
  nextLessonId: 'enrollment-101-lesson-3',
  resumeAtSeconds: 540,
};

const renderLearningPage = (initialEntry = '/mypage/learning/101') => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<LearningPage />} path='/mypage/learning/:enrollmentId' />
          <Route
            element={<p>플레이어 화면</p>}
            path='/mypage/learning/:enrollmentId/lesson/:lessonId'
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LearningPage', () => {
  it('redirects directly to the current lesson route', async () => {
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(testSnapshot);

    renderLearningPage();

    expect(await screen.findByText('플레이어 화면')).toBeInTheDocument();
  });

  it('shows a fallback message when playback is unavailable', async () => {
    const enrollment = testSnapshot.enrollment;
    if (!enrollment) {
      throw new Error('Expected enrollment test data.');
    }

    fetchMyLearningPlayerSnapshotMock.mockResolvedValue({
      ...testSnapshot,
      currentLessonId: null,
      enrollment: {
        ...enrollment,
        active: false,
        status: 'EXPIRED',
      },
      nextLessonId: null,
    });

    renderLearningPage();

    expect(
      await screen.findByText('재생 가능한 강의가 없거나 수강 기간이 종료되었습니다.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '내 강의로 돌아가기' })).toHaveAttribute(
      'href',
      '/mypage',
    );
  });
});
