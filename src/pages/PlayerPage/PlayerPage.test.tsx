import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PlayerPage from '@/pages/PlayerPage/PlayerPage';
import { clearStudentSession, setStudentSession } from '@/stores/useAuthStore';
import type {
  LearningPlayerSnapshot,
  LectureProgressSaveResponse,
  ProtectedLectureStream,
} from '@/types/mypage';
import type { EnrollmentPracticumOverview, PracticumReservation } from '@/types/practicum';
import type {
  ProgramQnaPageResponse,
  ProgramQnaReplyItem,
  ProgramQnaThreadItem,
} from '@/types/programQna';
import type {
  StudentProblem,
  StudentProblemAttemptResult,
  StudentProblemSession,
} from '@/types/studentProblems';

const {
  createdHlsConfigs,
  cancelMyLecturePracticumMock,
  createProgramQnaReplyMock,
  createProgramQnaThreadMock,
  fetchLectureStreamMock,
  fetchMyEnrollmentPracticumOverviewMock,
  fetchMyLearningPlayerSnapshotMock,
  fetchProgramQnaMock,
  moveMyLecturePracticumMock,
  reserveMyLecturePracticumMock,
  fetchStudentProblemMock,
  saveStudentProblemSessionMock,
  saveLectureProgressMock,
  sendLectureProgressBeaconMock,
  startStudentProblemSessionMock,
  submitStudentProblemMock,
  updateMyOfflineScheduleAbsenceMock,
  testState,
} = vi.hoisted(() => ({
  createdHlsConfigs: [] as Array<Record<string, unknown>>,
  cancelMyLecturePracticumMock:
    vi.fn<(enrollmentId: number, reservationId: number) => Promise<void>>(),
  createProgramQnaReplyMock:
    vi.fn<
      (
        programId: number,
        threadId: number,
        payload: { content: string },
      ) => Promise<ProgramQnaReplyItem>
    >(),
  createProgramQnaThreadMock:
    vi.fn<
      (
        programId: number,
        payload: { content: string; title: string },
      ) => Promise<ProgramQnaThreadItem>
    >(),
  fetchLectureStreamMock:
    vi.fn<(lectureId: number, deviceId: string) => Promise<ProtectedLectureStream>>(),
  fetchMyEnrollmentPracticumOverviewMock:
    vi.fn<(enrollmentId: number) => Promise<EnrollmentPracticumOverview>>(),
  fetchMyLearningPlayerSnapshotMock:
    vi.fn<(enrollmentId: number) => Promise<LearningPlayerSnapshot>>(),
  fetchProgramQnaMock:
    vi.fn<
      (
        programId: number,
        options?: { page?: number; size?: number },
      ) => Promise<ProgramQnaPageResponse>
    >(),
  moveMyLecturePracticumMock:
    vi.fn<
      (enrollmentId: number, reservationId: number, slotId: number) => Promise<PracticumReservation>
    >(),
  reserveMyLecturePracticumMock:
    vi.fn<
      (enrollmentId: number, slotId: number, lectureId?: number) => Promise<PracticumReservation>
    >(),
  fetchStudentProblemMock: vi.fn<(lectureId: number) => Promise<StudentProblem | null>>(),
  saveStudentProblemSessionMock:
    vi.fn<
      (problemId: number, payload: Record<string, unknown>) => Promise<StudentProblemSession>
    >(),
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
  startStudentProblemSessionMock: vi.fn<(problemId: number) => Promise<StudentProblemSession>>(),
  submitStudentProblemMock:
    vi.fn<
      (
        problemId: number,
        payload: { answers: Record<number, number[]>; elapsedSeconds: number },
      ) => Promise<StudentProblemAttemptResult>
    >(),
  updateMyOfflineScheduleAbsenceMock:
    vi.fn<(enrollmentId: number, ruleId: number, absent: boolean) => Promise<void>>(),
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
  cancelMyLecturePracticum: (enrollmentId: number, reservationId: number) =>
    cancelMyLecturePracticumMock(enrollmentId, reservationId),
  fetchLectureStream: (lectureId: number, deviceId: string) =>
    fetchLectureStreamMock(lectureId, deviceId),
  fetchMyEnrollmentPracticumOverview: (enrollmentId: number) =>
    fetchMyEnrollmentPracticumOverviewMock(enrollmentId),
  fetchMyLearningPlayerSnapshot: (enrollmentId: number) =>
    fetchMyLearningPlayerSnapshotMock(enrollmentId),
  moveMyLecturePracticum: (enrollmentId: number, reservationId: number, slotId: number) =>
    moveMyLecturePracticumMock(enrollmentId, reservationId, slotId),
  reserveMyLecturePracticum: (enrollmentId: number, slotId: number, lectureId?: number) =>
    reserveMyLecturePracticumMock(enrollmentId, slotId, lectureId),
  saveLectureProgress: (enrollmentId: number, lectureId: number, watchedSeconds: number) =>
    saveLectureProgressMock(enrollmentId, lectureId, watchedSeconds),
  sendLectureProgressBeacon: (enrollmentId: number, lectureId: number, watchedSeconds: number) =>
    sendLectureProgressBeaconMock(enrollmentId, lectureId, watchedSeconds),
  updateMyOfflineScheduleAbsence: (enrollmentId: number, ruleId: number, absent: boolean) =>
    updateMyOfflineScheduleAbsenceMock(enrollmentId, ruleId, absent),
}));

vi.mock('@/api/studentProblems', () => ({
  fetchStudentProblem: (lectureId: number) => fetchStudentProblemMock(lectureId),
  saveStudentProblemSession: (problemId: number, payload: Record<string, unknown>) =>
    saveStudentProblemSessionMock(problemId, payload),
  startStudentProblemSession: (problemId: number) => startStudentProblemSessionMock(problemId),
  submitStudentProblem: (
    problemId: number,
    payload: { answers: Record<number, number[]>; elapsedSeconds: number },
  ) => submitStudentProblemMock(problemId, payload),
}));

vi.mock('@/api/programQna', () => ({
  createProgramQnaReply: (programId: number, threadId: number, payload: { content: string }) =>
    createProgramQnaReplyMock(programId, threadId, payload),
  createProgramQnaThread: (programId: number, payload: { content: string; title: string }) =>
    createProgramQnaThreadMock(programId, payload),
  fetchProgramQna: (programId: number, options?: { page?: number; size?: number }) =>
    fetchProgramQnaMock(programId, options),
  programQnaQueryKey: (programId: number | null) => ['programQna', programId],
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

const testResourceSnapshot: LearningPlayerSnapshot = {
  ...testSnapshot,
  currentLessonId: 'enrollment-101-lesson-2',
  curriculumTrack: {
    ...testSnapshot.curriculumTrack,
    sections: testSnapshot.curriculumTrack.sections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) =>
        lesson.id === 'enrollment-101-lesson-2'
          ? {
              ...lesson,
              deliveryType: 'resource',
              description: '첨부자료를 먼저 확인한 뒤 실습에 들어가는 강의입니다.',
              durationLabel: '첨부자료',
              durationMinutes: null,
              title: '복부초음파 기초 2강 첨부자료',
            }
          : lesson,
      ),
    })),
  },
  lessonPlaybackById: {
    ...testSnapshot.lessonPlaybackById,
    'enrollment-101-lesson-2': {
      lectureId: 2,
      mimeType: null,
      posterUrl: null,
    },
  },
  resourceAttachmentsByLessonId: {
    'enrollment-101-lesson-2': [
      {
        description: '강의 핵심 개념을 정리한 문서입니다.',
        fileName: 'abdomen-summary.pdf',
        fileSize: 2_450_000,
        fileUrl: 'https://example.com/resources/abdomen-summary.pdf',
        id: 201,
        mimeType: 'application/pdf',
        sortOrder: 0,
        title: '강의 요약 자료',
      },
      {
        description: '실습 전 점검해야 하는 항목을 정리했습니다.',
        fileName: 'abdomen-checklist.xlsx',
        fileSize: 980_000,
        fileUrl: 'https://example.com/resources/abdomen-checklist.xlsx',
        id: 202,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sortOrder: 1,
        title: '실습 체크리스트',
      },
    ],
  },
};

const testOfflineSnapshot: LearningPlayerSnapshot = {
  ...testSnapshot,
  currentLessonId: 'enrollment-101-lesson-2',
  curriculumTrack: {
    ...testSnapshot.curriculumTrack,
    sections: testSnapshot.curriculumTrack.sections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) =>
        lesson.id === 'enrollment-101-lesson-2'
          ? {
              ...lesson,
              deliveryType: 'offline',
              description: '오프라인 출석이 필요한 강의입니다.',
              durationLabel: '오프라인 강의',
              durationMinutes: null,
              offlineSchedules: [
                {
                  absent: false,
                  attendanceCompleted: false,
                  date: '2026-05-09',
                  endTime: '13:00',
                  location: '서울 강남 교육장',
                  notes: '시작 10분 전까지 입실',
                  ruleId: 9101,
                  startTime: '10:00',
                },
              ],
              startDate: '2026-05-09',
              title: '복부초음파 기초 2강 오프라인',
            }
          : lesson,
      ),
    })),
  },
  lessonPlaybackById: {
    ...testSnapshot.lessonPlaybackById,
    'enrollment-101-lesson-2': {
      lectureId: 2,
      mimeType: null,
      posterUrl: null,
    },
  },
};

const testStreamResponse: ProtectedLectureStream = {
  expiresAt: 1_770_000_000,
  hlsKeyUrl: '/api/v1/lectures/2/hls-key',
  hlsUrl: 'https://example.com/api/v1/lectures/2/playback/test-device-id/master.m3u8',
  playbackSessionToken: 'test-session',
};

const createProblemLectureSnapshot = (): LearningPlayerSnapshot => ({
  ...testSnapshot,
  curriculumTrack: {
    ...testSnapshot.curriculumTrack,
    sections: testSnapshot.curriculumTrack.sections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) =>
        lesson.id === 'enrollment-101-lesson-2'
          ? {
              ...lesson,
              deliveryType: 'problem',
              durationLabel: '문제 풀이',
              durationMinutes: null,
              problemAttempted: false,
              questionCount: 1,
              title: '복부초음파 기초 2강 문제풀이',
            }
          : lesson,
      ),
    })),
  },
  currentLessonId: 'enrollment-101-lesson-2',
  lessonPlaybackById: {
    ...testSnapshot.lessonPlaybackById,
    'enrollment-101-lesson-2': {
      lectureId: 2,
      mimeType: null,
      posterUrl: null,
    },
  },
  lessonProgressByLessonId: {
    ...testSnapshot.lessonProgressByLessonId,
    'enrollment-101-lesson-2': {
      completed: false,
      completedAt: null,
      lastWatchedAt: '2026-03-10T12:00:00Z',
      lectureId: 2,
      progressPercent: 0,
      watchedSeconds: 0,
    },
  },
});

const testQuiz: StudentProblem = {
  description: '강의 핵심 확인',
  id: 301,
  lectureId: 2,
  latestAttempt: null,
  passScore: 80,
  timeLimitSeconds: 1800,
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
  title: '복부초음파 기초 2강 문제풀이',
};

const testPracticumOverview: EnrollmentPracticumOverview = {
  active: true,
  enrolledAt: '2026-03-01T09:00:00Z',
  enrollmentId: 101,
  expireAt: '2026-09-30T14:59:59Z',
  lectures: [
    {
      blockedReason: null,
      currentReservation: {
        endAt: '2026-05-20T03:00:00Z',
        id: 7001,
        lectureId: 2,
        location: '서울 강남 실습실',
        reservedAt: '2026-05-12T01:00:00Z',
        slotId: 5001,
        startAt: '2026-05-20T02:00:00Z',
        status: 'ACTIVE',
      },
      currentReservations: [
        {
          endAt: '2026-05-20T03:00:00Z',
          id: 7001,
          lectureId: 2,
          location: '서울 강남 실습실',
          reservedAt: '2026-05-12T01:00:00Z',
          slotId: 5001,
          startAt: '2026-05-20T02:00:00Z',
          status: 'ACTIVE',
        },
      ],
      enabled: true,
      eligible: true,
      lectureCompleted: true,
      lectureId: 2,
      lectureTitle: '복부초음파 기초 2강 실습',
      sectionTitle: '1단계 학습',
      slots: [
        {
          endAt: '2026-05-20T03:00:00Z',
          full: false,
          id: 5001,
          lectureId: 2,
          location: '서울 강남 실습실',
          maxCapacity: 4,
          remainingCapacity: 3,
          reservedByMe: true,
          reservedCount: 1,
          slotStatus: 'OPEN',
          startAt: '2026-05-20T02:00:00Z',
        },
        {
          endAt: '2026-05-20T05:00:00Z',
          full: false,
          id: 5002,
          lectureId: 2,
          location: '서울 강남 실습실',
          maxCapacity: 4,
          remainingCapacity: 2,
          reservedByMe: false,
          reservedCount: 2,
          slotStatus: 'OPEN',
          startAt: '2026-05-20T04:00:00Z',
        },
      ],
    },
  ],
  programId: 2001,
  programTitle: '복부초음파 기초',
  status: 'ACTIVE',
};

const testProgramQnaResponse: ProgramQnaPageResponse = {
  content: [
    {
      answered: true,
      authorName: '홍길동',
      authorType: 'ENROLLED',
      content: '실습 예약도 여기에서 문의하면 되나요?',
      createdAt: '2026-03-10T12:00:00Z',
      id: 9101,
      mine: false,
      programId: 2001,
      programTitle: '복부초음파 기초',
      replies: [
        {
          adminReply: true,
          authorName: '관리자',
          authorType: 'ADMIN',
          content: '네, 운영 관련 문의도 이곳에서 가능합니다.',
          createdAt: '2026-03-10T13:00:00Z',
          id: 9201,
          mine: false,
          updatedAt: '2026-03-10T13:00:00Z',
        },
      ],
      replyCount: 1,
      scope: 'PROGRAM',
      title: '실습 문의',
      updatedAt: '2026-03-10T13:00:00Z',
    },
    {
      answered: true,
      authorName: '김수강',
      authorType: 'ENROLLED',
      content: '강의 자료에 있는 체크리스트는 어디서 내려받나요?',
      createdAt: '2026-03-09T12:00:00Z',
      id: 9102,
      mine: false,
      programId: 2001,
      programTitle: '복부초음파 기초',
      replies: [
        {
          adminReply: false,
          authorName: '다른 수강생',
          authorType: 'ENROLLED',
          content: '저는 자료실에서 확인했습니다.',
          createdAt: '2026-03-09T13:00:00Z',
          id: 9202,
          mine: false,
          updatedAt: '2026-03-09T13:00:00Z',
        },
      ],
      replyCount: 1,
      scope: 'PROGRAM',
      title: '자료 문의',
      updatedAt: '2026-03-09T13:00:00Z',
    },
  ],
  first: true,
  last: true,
  number: 0,
  size: 20,
  totalElements: 2,
  totalPages: 1,
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
  const practicumReservation = testPracticumOverview.lectures[0].currentReservations[0];

  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve(undefined));
  cancelMyLecturePracticumMock.mockResolvedValue(undefined);
  createProgramQnaReplyMock.mockResolvedValue(testProgramQnaResponse.content[0].replies[0]);
  createProgramQnaThreadMock.mockResolvedValue(testProgramQnaResponse.content[0]);
  fetchStudentProblemMock.mockResolvedValue(null);
  fetchMyEnrollmentPracticumOverviewMock.mockResolvedValue(testPracticumOverview);
  moveMyLecturePracticumMock.mockResolvedValue(practicumReservation);
  reserveMyLecturePracticumMock.mockResolvedValue(practicumReservation);
  fetchProgramQnaMock.mockResolvedValue(testProgramQnaResponse);
  updateMyOfflineScheduleAbsenceMock.mockResolvedValue(undefined);
  saveStudentProblemSessionMock.mockResolvedValue({
    answers: {},
    currentQuestionIndex: 0,
    elapsedSeconds: 0,
    flaggedQuestionIds: [],
    remainingSeconds: 1800,
    startedAt: '2026-03-10T12:00:00Z',
    status: 'IN_PROGRESS',
  });
  startStudentProblemSessionMock.mockResolvedValue({
    answers: {},
    currentQuestionIndex: 0,
    elapsedSeconds: 0,
    flaggedQuestionIds: [],
    remainingSeconds: 1800,
    startedAt: '2026-03-10T12:00:00Z',
    status: 'IN_PROGRESS',
  });
  submitStudentProblemMock.mockResolvedValue({
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
  clearStudentSession();
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

    await waitFor(() => {
      expect(fetchLectureStreamMock).toHaveBeenCalledWith(2, 'test-device-id');
    });
    expect(
      screen.getByRole('heading', { level: 1, name: '복부초음파 기초 2강' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('현재 강의 정보')).toHaveTextContent('동영상 강의');

    await waitFor(() => {
      expect(createdHlsConfigs.at(-1)?.['loader']).toBeTypeOf('function');
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
    expect(screen.getByRole('heading', { level: 2, name: '복부초음파 기초' })).toBeInTheDocument();
    expect(screen.getAllByText('1단계 학습')).toHaveLength(1);
    expect(screen.queryByText('이전 강의 완료 후 수강 가능')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /이전/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /다음/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '재생 설정' })).toBeInTheDocument();
    expect(screen.getByText(/운영기간/)).toBeInTheDocument();
  });

  it('opens the settings panel with speed and quality options', async () => {
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(testSnapshot);
    fetchLectureStreamMock.mockResolvedValue(testStreamResponse);

    renderPlayerPage();

    await waitFor(() => {
      expect(fetchLectureStreamMock).toHaveBeenCalledWith(2, 'test-device-id');
    });
    fireEvent.click(await screen.findByRole('button', { name: '재생 설정' }));

    expect(await screen.findByRole('dialog', { name: '재생 설정 패널' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1.25x' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '720p' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1080p' })).toBeInTheDocument();
  });

  it('renders the player q&a with the same board layout as the program detail page', async () => {
    setStudentSession({
      accessToken: 'student-token',
      displayName: '김학생',
      expiresAt: '2999-12-31T23:59:59Z',
      loginId: 'student01',
      role: 'STUDENT',
      tokenType: 'Bearer',
    });
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(testSnapshot);
    fetchLectureStreamMock.mockResolvedValue(testStreamResponse);

    renderPlayerPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Q&A 패널' }));

    await waitFor(() => {
      expect(fetchProgramQnaMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole('heading', { name: '강의 Q&A' })).not.toBeInTheDocument();
    expect(screen.queryByText('수강 Q&A')).not.toBeInTheDocument();
    expect(
      screen.queryByText('비수강생과 수강생 모두 참여할 수 있으며, 작성자 구분이 함께 표시됩니다.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('프로그램 전체 Q&A 1개')).not.toBeInTheDocument();
    expect(screen.queryByText(/총 \d+건 중 검색 결과/)).not.toBeInTheDocument();
    expect(screen.queryByText('1 / 3 완료')).not.toBeInTheDocument();
    expect(screen.queryByText('33%')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(await screen.findByText('실습 문의')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '글쓰기' }));

    expect(screen.getByRole('heading', { name: '질문 작성' })).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('제목, 내용, 작성자를 검색해 주세요.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('실습 문의')).not.toBeInTheDocument();
    expect(screen.queryByText('자료 문의')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '작성 닫기' })).toHaveLength(1);
  });

  it('shows player q&a as instructor answer read-only details', async () => {
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(testSnapshot);
    fetchLectureStreamMock.mockResolvedValue(testStreamResponse);

    renderPlayerPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Q&A 패널' }));

    const questionContent = '실습 예약도 여기에서 문의하면 되나요?';
    const answeredTitle = await screen.findByText('실습 문의');

    expect(screen.getAllByText(questionContent)).toHaveLength(1);
    fireEvent.click(answeredTitle.closest('button') as HTMLButtonElement);

    expect(screen.getAllByText(questionContent)).toHaveLength(1);
    expect(screen.getByText('네, 운영 관련 문의도 이곳에서 가능합니다.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /답글 남기기/ })).not.toBeInTheDocument();
    expect(screen.queryByText('저는 자료실에서 확인했습니다.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('자료 문의').closest('button') as HTMLButtonElement);

    expect(screen.getAllByText('미답변').length).toBeGreaterThan(0);
    expect(screen.getByText('아직 미답변입니다.')).toBeInTheDocument();
    expect(createProgramQnaReplyMock).not.toHaveBeenCalled();
  });

  it('renders resource lessons as a simple attachment board with download actions', async () => {
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(testResourceSnapshot);

    renderPlayerPage();

    expect(await screen.findByText('강의 요약 자료')).toBeInTheDocument();
    expect(fetchLectureStreamMock).not.toHaveBeenCalled();
    expect(screen.getByText('실습 체크리스트')).toBeInTheDocument();
    expect(screen.getByText('abdomen-summary.pdf')).toBeInTheDocument();
    expect(screen.getByText('abdomen-checklist.xlsx')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '다운로드' })).toHaveLength(2);
  });

  it('renders offline lessons without the selected schedule detail panel', async () => {
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(testOfflineSnapshot);

    renderPlayerPage();

    expect(await screen.findByText('2026년 5월')).toBeInTheDocument();
    expect(screen.queryByText('오프라인 강의 일정')).not.toBeInTheDocument();
    expect(
      screen.queryByText('등록된 강의 날짜와 시간을 달력에서 확인할 수 있습니다.'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('오프라인 일정 요약')).toHaveTextContent('2026. 5. 9.');
    expect(screen.getByLabelText('오프라인 일정 요약')).toHaveTextContent('10:00~13:00');
    expect(screen.getAllByText('서울 강남 교육장').length).toBeGreaterThan(0);
    expect(screen.getAllByText('일정 없음').length).toBeGreaterThan(0);
    expect(screen.getByText('참석 예정')).toBeInTheDocument();
    expect(screen.getByText('불참 표시 없으면 자동 참석')).toBeInTheDocument();
    expect(
      screen.queryByText('아무 표시를 하지 않으면 참석 예정으로 유지됩니다.'),
    ).not.toBeInTheDocument();
    expect(fetchLectureStreamMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/선택 일정/)).not.toBeInTheDocument();
    expect(screen.queryByText(/1회차/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/오프라인 강의 일정과 장소를 한눈에 확인할 수 있습니다/),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '불참으로 표시' }));

    await waitFor(() => {
      expect(updateMyOfflineScheduleAbsenceMock).toHaveBeenCalledWith(101, 9101, true);
    });
  });

  it('marks absent offline lessons in the player and curriculum list', async () => {
    fetchMyLearningPlayerSnapshotMock.mockResolvedValue({
      ...testOfflineSnapshot,
      curriculumTrack: {
        ...testOfflineSnapshot.curriculumTrack,
        sections: testOfflineSnapshot.curriculumTrack.sections.map((section) => ({
          ...section,
          lessons: section.lessons.map((lesson) =>
            lesson.id === 'enrollment-101-lesson-2'
              ? {
                  ...lesson,
                  offlineSchedules: lesson.offlineSchedules?.map((schedule) => ({
                    ...schedule,
                    absent: true,
                  })),
                }
              : lesson,
          ),
        })),
      },
    });

    renderPlayerPage();

    expect(await screen.findByText('2026년 5월')).toBeInTheDocument();
    expect(screen.getAllByText('불참').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('불참 표시됨')).not.toBeInTheDocument();
    expect(screen.queryByText('관리자 화면에는 불참으로 표시됩니다.')).not.toBeInTheDocument();
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

  it('renders and submits the problem lecture as a lesson item', async () => {
    const problemLectureSnapshot = createProblemLectureSnapshot();

    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(problemLectureSnapshot);
    fetchLectureStreamMock.mockResolvedValue(testStreamResponse);
    fetchStudentProblemMock.mockResolvedValue(testQuiz);
    submitStudentProblemMock.mockResolvedValue({
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

    await waitFor(() => {
      expect(fetchStudentProblemMock).toHaveBeenCalledWith(2);
    });
    expect(screen.queryByText('PROBLEM LECTURE')).not.toBeInTheDocument();
    expect(screen.queryByText('문제 풀이 현황')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        '문제와 보기, 등록된 이미지 또는 영상을 확인한 뒤 답을 선택해 주세요. 나중에 풀 문제는 표시해 둘 수 있습니다.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '나중에 풀기만 보기' })).not.toBeInTheDocument();
    expect(await screen.findByText('문제 풀이를 시작할까요?')).toBeInTheDocument();
    expect(screen.queryByAltText('1번 문항 미디어')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '시작하기' }));
    await waitFor(() => {
      expect(startStudentProblemSessionMock).toHaveBeenCalledWith(301);
    });
    expect(await screen.findByAltText('1번 문항 미디어')).toBeInTheDocument();
    expect(await screen.findByAltText('1번 문항 2번 보기 미디어')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: '복부초음파 기초 2강 문제풀이' }),
    ).toBeInTheDocument();
    expect(screen.getByText('남은시간 30:00')).toBeInTheDocument();
    expect(screen.getByText('문항수 1문항')).toBeInTheDocument();
    expect(screen.getByLabelText('현재 강의 정보')).toHaveTextContent('문제 풀이 강의');
    expect(screen.queryByText('문제 정보')).not.toBeInTheDocument();
    expect(screen.queryByText('강의명')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '강의 목록 패널' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '문제 목록 패널' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '문제 문항 목록' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '강의 목록 패널' }));
    expect(screen.queryByRole('navigation', { name: '문제 문항 목록' })).not.toBeInTheDocument();
    expect(screen.getAllByText('1단계 학습').length).toBeGreaterThan(0);
    const currentProblemLessonLink = screen
      .getAllByRole('link')
      .find((link) => link.textContent.includes('복부초음파 기초 2강 문제풀이'));

    if (!currentProblemLessonLink) {
      throw new Error('문제풀이 강의 링크를 찾지 못했습니다.');
    }

    fireEvent.click(currentProblemLessonLink);
    expect(screen.getByRole('navigation', { name: '문제 문항 목록' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '강의 목록 패널' }));
    fireEvent.click(screen.getByRole('button', { name: '문제 목록 패널' }));
    expect(screen.getByRole('navigation', { name: '문제 문항 목록' })).toBeInTheDocument();
    expect(screen.getAllByText('복부초음파 기초 2강 문제풀이').length).toBeGreaterThan(0);
    const correctOption = await screen.findByLabelText('2. 정답');
    fireEvent.click(correctOption);
    expect(correctOption).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: '나중에 풀기' }));
    expect(correctOption).not.toBeChecked();
    expect(screen.getByRole('button', { name: /문제 1/ })).toBeInTheDocument();
    expect(screen.queryByText('답안 입력 2번')).not.toBeInTheDocument();
    expect(screen.getAllByText('나중에 풀기').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('checkbox', { name: '나중에 풀기' }));
    fireEvent.click(correctOption);
    fireEvent.click(screen.getByRole('button', { name: '제출하기' }));

    await waitFor(() => {
      expect(submitStudentProblemMock).toHaveBeenCalledTimes(1);
    });
    const submitCall = submitStudentProblemMock.mock.calls[0];
    expect(submitCall[0]).toBe(301);
    expect(submitCall[1].answers).toEqual({ 401: [502] });
    expect(typeof submitCall[1].elapsedSeconds).toBe('number');

    expect(await screen.findByText('채점 결과')).toBeInTheDocument();
    expect(screen.getByText('100점')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('O')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다시 풀기' })).not.toBeInTheDocument();
    expect(screen.queryByText(/정답 해설입니다/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^정답:/)).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('heading', { level: 2, name: '복부초음파 기초' }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('답안 입력 2번')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '문항 다시 보기' }));
    expect(await screen.findByText('문제 1. 첫 번째 질문', { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText('2. 정답')).toBeDisabled();
    expect(screen.getByText('해설 보기')).toBeInTheDocument();
    expect(screen.queryByText('선택 답안: 정답')).not.toBeInTheDocument();
    expect(screen.queryByText(/^정답:/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '결과로 돌아가기' }));
    expect(await screen.findByText('채점 결과')).toBeInTheDocument();
  });

  it('auto submits and grades a problem lecture when the time limit expires', async () => {
    const problemLectureSnapshot = createProblemLectureSnapshot();
    const expiredQuiz: StudentProblem = {
      ...testQuiz,
      session: {
        answers: { 401: [502] },
        currentQuestionIndex: 0,
        elapsedSeconds: 1800,
        flaggedQuestionIds: [],
        remainingSeconds: 0,
        startedAt: '2026-03-10T12:00:00Z',
        status: 'IN_PROGRESS',
      },
    };

    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(problemLectureSnapshot);
    fetchStudentProblemMock.mockResolvedValue(expiredQuiz);
    submitStudentProblemMock.mockResolvedValue({
      id: 9003,
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

    expect(await screen.findByText('남은시간 00:00')).toBeInTheDocument();

    await waitFor(() => {
      expect(submitStudentProblemMock).toHaveBeenCalledTimes(1);
    });
    expect(submitStudentProblemMock.mock.calls[0][0]).toBe(301);
    expect(submitStudentProblemMock.mock.calls[0][1]).toEqual({
      answers: { 401: [502] },
      elapsedSeconds: 1800,
    });
    expect(await screen.findByText('채점 결과')).toBeInTheDocument();
  });

  it('shows the latest graded result and allows reviewing questions after reload', async () => {
    const problemLectureSnapshot = createProblemLectureSnapshot();
    const latestAttempt: StudentProblemAttemptResult = {
      id: 9004,
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
    };

    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(problemLectureSnapshot);
    fetchStudentProblemMock.mockResolvedValue({
      ...testQuiz,
      latestAttempt,
      session: {
        answers: { 401: [502] },
        currentQuestionIndex: 0,
        elapsedSeconds: 1800,
        flaggedQuestionIds: [],
        remainingSeconds: 0,
        startedAt: '2026-03-10T12:00:00Z',
        status: 'SUBMITTED',
      },
    });

    renderPlayerPage();

    expect(await screen.findByText('채점 결과')).toBeInTheDocument();
    expect(screen.getByText('100점')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '시작하기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '제출하기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다시 풀기' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '문항 다시 보기' }));
    expect(await screen.findByLabelText('2. 정답')).toBeDisabled();
    expect(screen.getByText('해설 보기')).toBeInTheDocument();
    expect(screen.queryByText('선택 답안: 정답')).not.toBeInTheDocument();
    expect(screen.queryByText(/^정답:/)).not.toBeInTheDocument();
  });

  it('renders the practicum calendar and moves an existing reservation to another slot', async () => {
    const practicumSnapshot: LearningPlayerSnapshot = {
      ...testSnapshot,
      curriculumTrack: {
        ...testSnapshot.curriculumTrack,
        sections: testSnapshot.curriculumTrack.sections.map((section) => ({
          ...section,
          lessons: section.lessons.map((lesson) =>
            lesson.id === 'enrollment-101-lesson-2'
              ? {
                  ...lesson,
                  deliveryType: 'practicum',
                  durationLabel: '실습 예약',
                  durationMinutes: null,
                  title: '복부초음파 기초 2강 실습',
                }
              : lesson,
          ),
        })),
      },
      currentLessonId: 'enrollment-101-lesson-2',
      lessonPlaybackById: {
        ...testSnapshot.lessonPlaybackById,
        'enrollment-101-lesson-2': {
          lectureId: 2,
          mimeType: null,
          posterUrl: null,
        },
      },
    };

    fetchMyLearningPlayerSnapshotMock.mockResolvedValue(practicumSnapshot);

    renderPlayerPage();

    expect(await screen.findAllByText('복부초음파 기초 2강 실습')).not.toHaveLength(0);
    expect(
      await screen.findByText(/운영 일정과 오프라인 강의를 반영한 시간만 달력에 노출합니다/),
    ).toBeInTheDocument();
    expect((await screen.findAllByText(/예정/)).length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('2026-05')).toBeInTheDocument();

    const moveButton = screen
      .getAllByRole('button', { name: '이 일정으로 변경' })
      .find((button) => !button.hasAttribute('disabled'));

    if (!moveButton) {
      throw new Error('예약 변경 버튼을 찾지 못했습니다.');
    }

    fireEvent.click(moveButton);

    await waitFor(() => {
      expect(moveMyLecturePracticumMock).toHaveBeenCalledWith(101, 7001, 5002);
    });
  });
});
