import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LearningPage from '@/pages/LearningPage/LearningPage';
import type { EnrollmentDetail, LearningPlayerSnapshot } from '@/types/mypage';

const fetchMyEnrollmentDetailMock = vi.fn<(enrollmentId: number) => Promise<EnrollmentDetail>>();
const fetchMyLearningPlayerSnapshotMock =
  vi.fn<(enrollmentId: number) => Promise<LearningPlayerSnapshot>>();

vi.mock('@/api/mypage', () => ({
  fetchMyEnrollmentDetail: (enrollmentId: number) => fetchMyEnrollmentDetailMock(enrollmentId),
  fetchMyLearningPlayerSnapshot: (enrollmentId: number) =>
    fetchMyLearningPlayerSnapshotMock(enrollmentId),
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

const testEnrollmentDetail: EnrollmentDetail = {
  active: true,
  certificateEligible: false,
  completed: false,
  completedAt: null,
  completedLectures: 1,
  completionRate: 33,
  enrolledAt: '2026-03-01T09:00:00Z',
  expireAt: '2026-09-30T14:59:59Z',
  id: 101,
  programId: 2001,
  programTitle: '복부초음파 기초',
  progress: [
    {
      completed: true,
      completedAt: '2026-03-03T10:00:00Z',
      lastWatchedAt: '2026-03-03T10:00:00Z',
      lectureId: 1,
      watchedSeconds: 1260,
    },
    {
      completed: false,
      completedAt: null,
      lastWatchedAt: '2026-03-10T11:00:00Z',
      lectureId: 2,
      watchedSeconds: 540,
    },
    {
      completed: false,
      completedAt: null,
      lastWatchedAt: null,
      lectureId: 3,
      watchedSeconds: 0,
    },
  ],
  status: 'ACTIVE',
  totalLectures: 3,
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
  it('renders the learning dashboard and continue action', async () => {
    fetchMyEnrollmentDetailMock.mockResolvedValue(testEnrollmentDetail);
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(testSnapshot);

    renderLearningPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: '온라인 수강 대시보드' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: '복부초음파 기초' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '복부초음파 기초 2강' }),
    ).toBeInTheDocument();
    expect(screen.getByText('진도율')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('총 3개 강의')).toBeInTheDocument();
    expect(screen.getAllByText('현재 강의').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: '이어보기' })).toHaveAttribute(
      'href',
      '/mypage/learning/101/lesson/enrollment-101-lesson-2',
    );
  });

  it('links curriculum rows to the full player route', async () => {
    fetchMyEnrollmentDetailMock.mockResolvedValue(testEnrollmentDetail);
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(testSnapshot);

    renderLearningPage();

    expect(
      await screen.findByRole('link', { name: /복부초음파 기초 3강.*학습하기/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /복부초음파 기초 3강.*학습하기/ })).toHaveAttribute(
      'href',
      '/mypage/learning/101/lesson/enrollment-101-lesson-3',
    );
  });
});
