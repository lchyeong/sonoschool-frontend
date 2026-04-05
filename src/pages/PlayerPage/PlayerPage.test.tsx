import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PlayerPage from '@/pages/PlayerPage/PlayerPage';
import type {
  LearningPlayerSnapshot,
  LectureProgressSaveResponse,
  ProtectedLectureStream,
} from '@/types/mypage';
import type {
  StudentQuiz,
  StudentQuizAttemptResult,
  StudentQuizSession,
} from '@/types/studentQuizzes';

const {
  createdHlsConfigs,
  fetchLectureStreamMock,
  fetchMyLearningPlayerSnapshotMock,
  fetchStudentQuizMock,
  saveStudentQuizSessionMock,
  saveLectureProgressMock,
  sendLectureProgressBeaconMock,
  submitStudentQuizMock,
  testState,
} = vi.hoisted(() => ({
  createdHlsConfigs: [] as Array<Record<string, unknown>>,
  fetchLectureStreamMock:
    vi.fn<(lectureId: number, deviceId: string) => Promise<ProtectedLectureStream>>(),
  fetchMyLearningPlayerSnapshotMock:
    vi.fn<(enrollmentId: number) => Promise<LearningPlayerSnapshot>>(),
  fetchStudentQuizMock: vi.fn<(lectureId: number) => Promise<StudentQuiz | null>>(),
  saveStudentQuizSessionMock:
    vi.fn<(quizId: number, payload: Record<string, unknown>) => Promise<StudentQuizSession>>(),
  saveLectureProgressMock:
    vi.fn<
      (
        enrollmentId: number,
        lectureId: number,
        watchedSeconds: number,
      ) => Promise<LectureProgressSaveResponse>
    >(),
  sendLectureProgressBeaconMock:
    vi.fn<(enrollmentId: number, lectureId: number, watchedSeconds: number) => boolean>(),
  submitStudentQuizMock:
    vi.fn<
      (
        quizId: number,
        payload: { answers: Record<number, number[]> },
      ) => Promise<StudentQuizAttemptResult>
    >(),
  testState: {
    isHlsSupported: true,
  },
}));

vi.mock('hls.js/light', () => {
  class LoaderMock {
    load() {}
  }

  class HlsMock {
    levels = [{ height: 720 }, { height: 1080 }];

    static Events = {
      ERROR: 'error',
      MANIFEST_PARSED: 'manifestParsed',
    };

    static DefaultConfig = {
      loader: LoaderMock,
    };

    static isSupported() {
      return testState.isHlsSupported;
    }

    constructor(config?: Record<string, unknown>) {
      createdHlsConfigs.push(config ?? {});
    }

    attachMedia() {}

    destroy() {}

    loadSource() {}

    on(event: string, callback: (eventName: string, data?: unknown) => void) {
      if (event === HlsMock.Events.MANIFEST_PARSED) {
        callback(event, {});
      }
    }
  }

  return {
    default: HlsMock,
  };
});

vi.mock('@/api/mypage', () => ({
  fetchLectureStream: (lectureId: number, deviceId: string) =>
    fetchLectureStreamMock(lectureId, deviceId),
  fetchMyLearningPlayerSnapshot: (enrollmentId: number) =>
    fetchMyLearningPlayerSnapshotMock(enrollmentId),
  saveLectureProgress: (enrollmentId: number, lectureId: number, watchedSeconds: number) =>
    saveLectureProgressMock(enrollmentId, lectureId, watchedSeconds),
  sendLectureProgressBeacon: (enrollmentId: number, lectureId: number, watchedSeconds: number) =>
    sendLectureProgressBeaconMock(enrollmentId, lectureId, watchedSeconds),
}));

vi.mock('@/api/studentQuizzes', () => ({
  fetchStudentQuiz: (lectureId: number) => fetchStudentQuizMock(lectureId),
  saveStudentQuizSession: (quizId: number, payload: Record<string, unknown>) =>
    saveStudentQuizSessionMock(quizId, payload),
  submitStudentQuiz: (quizId: number, payload: { answers: Record<number, number[]> }) =>
    submitStudentQuizMock(quizId, payload),
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
  lessonProgressByLessonId: {
    'enrollment-101-lesson-1': {
      completed: true,
      completedAt: '2026-03-03T10:00:00Z',
      lastWatchedAt: '2026-03-03T10:00:00Z',
      lectureId: 1,
      progressPercent: 100,
      watchedSeconds: 1260,
    },
    'enrollment-101-lesson-2': {
      completed: false,
      completedAt: null,
      lastWatchedAt: '2026-03-10T11:00:00Z',
      lectureId: 2,
      progressPercent: 28,
      watchedSeconds: 540,
    },
    'enrollment-101-lesson-3': {
      completed: false,
      completedAt: null,
      lastWatchedAt: null,
      lectureId: 3,
      progressPercent: 0,
      watchedSeconds: 0,
    },
  },
  nextLessonId: 'enrollment-101-lesson-3',
  resumeAtSeconds: 540,
};

const testStreamResponse: ProtectedLectureStream = {
  expiresAt: 1_770_000_000,
  hlsKeyUrl: '/api/v1/lectures/2/hls-key',
  hlsUrl: 'https://example.com/api/v1/lectures/2/playback/test-device-id/master.m3u8',
  playbackSessionToken: 'test-session',
};

const testQuiz: StudentQuiz = {
  description: '강의 핵심 확인',
  id: 301,
  lectureId: 2,
  passScore: 80,
  questions: [
    {
      explanation: null,
      id: 401,
      mediaType: 'IMAGE',
      mediaUrl: 'https://example.com/question-image.png',
      options: [
        {
          id: 501,
          mediaType: null,
          mediaUrl: null,
          optionText: '오답',
          sortOrder: 0,
        },
        {
          id: 502,
          mediaType: 'IMAGE',
          mediaUrl: 'https://example.com/option-image.png',
          optionText: '정답',
          sortOrder: 1,
        },
      ],
      questionText: '첫 번째 질문',
      questionType: 'SINGLE',
      sortOrder: 0,
    },
  ],
  session: null,
  title: '복부초음파 기초 2강 확인 문제',
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

const originalCanPlayType = Object.getOwnPropertyDescriptor(
  HTMLMediaElement.prototype,
  'canPlayType',
)?.value as HTMLMediaElement['canPlayType'];
const originalPlay = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'play')
  ?.value as HTMLMediaElement['play'];

beforeEach(() => {
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve(undefined));
  fetchStudentQuizMock.mockResolvedValue(null);
  saveStudentQuizSessionMock.mockResolvedValue({
    answers: {},
    currentQuestionIndex: 0,
    elapsedSeconds: 0,
    flaggedQuestionIds: [],
    status: 'IN_PROGRESS',
  });
  submitStudentQuizMock.mockResolvedValue({
    id: 9001,
    passScore: 80,
    passed: true,
    results: [],
    score: 100,
    submittedAt: '2026-03-10T12:00:00Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  testState.isHlsSupported = true;
  createdHlsConfigs.length = 0;
  HTMLMediaElement.prototype.canPlayType = originalCanPlayType;
  HTMLMediaElement.prototype.play = originalPlay;
});

describe('PlayerPage', () => {
  it('renders the full player view and requests a protected stream', async () => {
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(testSnapshot);
    fetchLectureStreamMock.mockResolvedValue(testStreamResponse);

    renderPlayerPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 2강' }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchLectureStreamMock).toHaveBeenCalledWith(2, 'test-device-id');
    });

    const latestConfig = createdHlsConfigs.at(-1);
    expect(latestConfig?.['loader']).toBeTypeOf('function');
    expect(latestConfig?.['xhrSetup']).toBeTypeOf('function');

    const xhrMock = {
      setRequestHeader: vi.fn(),
      withCredentials: false,
    };

    (latestConfig?.['xhrSetup'] as ((xhr: typeof xhrMock, url: string) => void) | undefined)?.(
      xhrMock,
      testStreamResponse.hlsKeyUrl,
    );

    expect(xhrMock.withCredentials).toBe(true);
    expect(xhrMock.setRequestHeader).toHaveBeenCalledWith(
      'X-Playback-Session-Token',
      'test-session',
    );
    expect(xhrMock.setRequestHeader).toHaveBeenCalledWith('X-Playback-Device-Id', 'test-device-id');

    xhrMock.setRequestHeader.mockClear();

    (latestConfig?.['xhrSetup'] as ((xhr: typeof xhrMock, url: string) => void) | undefined)?.(
      xhrMock,
      'https://example.com/api/v1/lectures/2/playback/test-device-id/segment-001.ts',
    );

    expect(xhrMock.setRequestHeader).toHaveBeenCalledWith(
      'X-Playback-Session-Token',
      'test-session',
    );
    expect(xhrMock.setRequestHeader).toHaveBeenCalledWith('X-Playback-Device-Id', 'test-device-id');

    expect(screen.getByText('내 강의')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '커리큘럼' })).toBeInTheDocument();
    expect(screen.getAllByText('1단계 학습')).toHaveLength(1);
    expect(screen.queryByText(/강의 완료/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /이전/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /다음/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '재생 설정' })).toBeInTheDocument();
  });

  it('moves to the next lesson from the player controls', async () => {
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(testSnapshot);
    fetchLectureStreamMock.mockImplementation((lectureId) =>
      Promise.resolve({
        ...testStreamResponse,
        hlsKeyUrl: `/api/v1/lectures/${String(lectureId)}/hls-key`,
        hlsUrl: `https://example.com/api/v1/lectures/${String(lectureId)}/playback/test-device-id/master.m3u8`,
      }),
    );

    renderPlayerPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 2강' }),
    ).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /다음/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: '복부초음파 기초 3강' }),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(fetchLectureStreamMock).toHaveBeenCalledWith(3, 'test-device-id');
    });
  });

  it('opens the settings panel with speed and quality options', async () => {
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(testSnapshot);
    fetchLectureStreamMock.mockResolvedValue(testStreamResponse);

    renderPlayerPage();

    fireEvent.click(await screen.findByRole('button', { name: '재생 설정' }));

    expect(await screen.findByRole('dialog', { name: '재생 설정 패널' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1.25x' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '720p' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1080p' })).toBeInTheDocument();
  });

  it('shows an unsupported browser notice when HLS playback is unavailable', async () => {
    testState.isHlsSupported = false;
    HTMLMediaElement.prototype.canPlayType = vi.fn(() => '' as CanPlayTypeResult);
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(testSnapshot);

    renderPlayerPage();

    expect(
      await screen.findByText('현재 브라우저에서는 스트리밍을 재생할 수 없습니다.'),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchLectureStreamMock).not.toHaveBeenCalled();
    });
  });

  it('allows entering the player even when the lesson has no linked video', async () => {
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue({
      ...testSnapshot,
      currentLessonId: 'enrollment-101-lesson-2',
      lessonPlaybackById: {
        ...testSnapshot.lessonPlaybackById,
        'enrollment-101-lesson-2': {
          lectureId: 2,
          mimeType: null,
          posterUrl: null,
        },
      },
    });

    renderPlayerPage();

    expect(await screen.findByText('이 강의는 영상 없이 제공되는 강의입니다.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: '복부초음파 기초 2강' }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchLectureStreamMock).not.toHaveBeenCalled();
    });
  });

  it('renders and submits the lecture quiz after the lesson is completed', async () => {
    const completedSnapshot: LearningPlayerSnapshot = {
      ...testSnapshot,
      curriculumTrack: {
        ...testSnapshot.curriculumTrack,
        sections: testSnapshot.curriculumTrack.sections.map((section) => ({
          ...section,
          lessons: section.lessons.map((lesson) =>
            lesson.id === 'enrollment-101-lesson-2'
              ? { ...lesson, hasQuiz: true, quizAttempted: false }
              : lesson,
          ),
        })),
      },
      lessonProgressByLessonId: {
        ...testSnapshot.lessonProgressByLessonId,
        'enrollment-101-lesson-2': {
          completed: true,
          completedAt: '2026-03-10T12:00:00Z',
          lastWatchedAt: '2026-03-10T12:00:00Z',
          lectureId: 2,
          progressPercent: 100,
          watchedSeconds: 1920,
        },
      },
    };

    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(completedSnapshot);
    fetchLectureStreamMock.mockResolvedValue(testStreamResponse);
    fetchStudentQuizMock.mockResolvedValue(testQuiz);
    submitStudentQuizMock.mockResolvedValue({
      id: 9002,
      passScore: 80,
      passed: true,
      results: [
        {
          correct: true,
          correctOptionIds: [502],
          explanation: '정답 해설입니다.',
          questionId: 401,
          questionText: '첫 번째 질문',
          submittedOptionIds: [502],
        },
      ],
      score: 100,
      submittedAt: '2026-03-10T12:30:00Z',
    });

    renderPlayerPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 2강' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('이 강의 확인 문제')).not.toBeInTheDocument();

    cleanup();
    renderPlayerPage('/mypage/learning/101/lesson/enrollment-101-lesson-2__quiz');

    expect(
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 2강 확인 문제' }),
    ).toBeInTheDocument();
    expect(await screen.findByAltText('1번 문항 미디어')).toBeInTheDocument();
    expect(await screen.findByAltText('1번 문항 2번 보기 미디어')).toBeInTheDocument();
    fireEvent.click(await screen.findByLabelText('2. 정답'));
    fireEvent.click(screen.getByRole('button', { name: '정답 제출' }));

    await waitFor(() => {
      expect(submitStudentQuizMock).toHaveBeenCalledWith(301, {
        answers: {
          401: [502],
        },
      });
    });

    expect(await screen.findByText('채점 결과')).toBeInTheDocument();
    expect(screen.getByText('정답')).toBeInTheDocument();
    expect(screen.getByText(/정답 해설입니다/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '문제 네비게이터' })).toBeInTheDocument();
  });
});
