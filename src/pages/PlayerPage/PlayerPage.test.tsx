import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PlayerPage from '@/pages/PlayerPage/PlayerPage';
import type {
  EnrollmentDetail,
  LearningPlayerSnapshot,
  ProtectedLectureStream,
} from '@/types/mypage';

const fetchMyEnrollmentDetailMock = vi.fn<(enrollmentId: number) => Promise<EnrollmentDetail>>();
const fetchMyLearningPlayerSnapshotMock =
  vi.fn<(enrollmentId: number) => Promise<LearningPlayerSnapshot>>();
const fetchLectureStreamMock =
  vi.fn<(lectureId: number, deviceId: string) => Promise<ProtectedLectureStream>>();

vi.mock('hls.js', () => {
  class LoaderMock {
    load() {}
  }

  class HlsMock {
    static Events = {
      ERROR: 'error',
    };

    static DefaultConfig = {
      loader: LoaderMock,
    };

    static isSupported() {
      return true;
    }

    attachMedia() {}

    destroy() {}

    loadSource() {}

    on() {}
  }

  return {
    default: HlsMock,
  };
});

vi.mock('@/api/mypage', () => ({
  fetchMyEnrollmentDetail: (enrollmentId: number) => fetchMyEnrollmentDetailMock(enrollmentId),
  fetchMyLearningPlayerSnapshot: (enrollmentId: number) =>
    fetchMyLearningPlayerSnapshotMock(enrollmentId),
  fetchLectureStream: (lectureId: number, deviceId: string) =>
    fetchLectureStreamMock(lectureId, deviceId),
}));

vi.mock('@/utils/playbackDeviceId', () => ({
  getOrCreatePlaybackDeviceId: () => 'test-device-id',
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

const testStreamResponse: ProtectedLectureStream = {
  expiresAt: 1_770_000_000,
  hlsKeyUrl: '/api/v1/lectures/2/hls-key',
  hlsUrl: 'https://example.com/lesson-2.m3u8',
  playbackSessionToken: 'test-session',
};

const renderPlayerPage = (initialEntry = '/mypage/learning/101/lesson/enrollment-101-lesson-2') => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<PlayerPage />} path='/mypage/learning/:enrollmentId/lesson/:lessonId' />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlayerPage', () => {
  it('renders the full player view and requests a protected stream', async () => {
    fetchMyEnrollmentDetailMock.mockResolvedValue(testEnrollmentDetail);
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(testSnapshot);
    fetchLectureStreamMock.mockResolvedValue(testStreamResponse);

    renderPlayerPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 2강' }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchLectureStreamMock).toHaveBeenCalledWith(2, 'test-device-id');
    });

    expect(screen.getByText('강의 대시보드')).toBeInTheDocument();
    expect(screen.getByText('현재 강의')).toBeInTheDocument();
  });

  it('moves to the next lesson from the player controls', async () => {
    fetchMyEnrollmentDetailMock.mockResolvedValue(testEnrollmentDetail);
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(testSnapshot);
    fetchLectureStreamMock.mockImplementation((lectureId) =>
      Promise.resolve({
        ...testStreamResponse,
        hlsKeyUrl: `/api/v1/lectures/${String(lectureId)}/hls-key`,
        hlsUrl: `https://example.com/lesson-${String(lectureId)}.m3u8`,
      }),
    );

    renderPlayerPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 2강' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음 강의' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: '복부초음파 기초 3강' }),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(fetchLectureStreamMock).toHaveBeenCalledWith(3, 'test-device-id');
    });
  });
});
