/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/restrict-template-expressions */
import type { CSSProperties } from 'react';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Hls from 'hls.js/light';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { fetchLectureStream, saveLectureProgress, sendLectureProgressBeacon } from '@/api/mypage';
import { fetchStudentQuiz, saveStudentQuizSession, submitStudentQuiz } from '@/api/studentQuizzes';
import iconCheck from '@/assets/icons/icon_check.png';
import iconNextPlay from '@/assets/icons/icon_next_play_48.png';
import iconBack from '@/assets/icons/icons8-왼쪽-64.png';
import ProgramCommunityPanel from '@/components/community/ProgramCommunityPanel';
import Button from '@/components/ui/Button/Button';
import {
  myLearningPlayerQueryKey,
  useMyLearningPlayerSnapshotQuery,
} from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type { LearningPlayerLessonProgress, ProtectedLectureStream } from '@/types/mypage';
import type { StudentQuiz, StudentQuizAttemptResult } from '@/types/studentQuizzes';
import { classNames } from '@/utils/classNames';
import { getOrCreatePlaybackDeviceId } from '@/utils/playbackDeviceId';

import {
  flattenLessons,
  flattenPlayerItems,
  formatDateRange,
  formatSeconds,
  getDefaultPlayerItemId,
} from '../LearningPage/learningShared';

import styles from './PlayerPage.module.scss';

type LessonStatusStyle = CSSProperties & {
  '--lesson-check-icon'?: string;
};

interface QualityOption {
  label: string;
  levelIndex: number | 'auto';
}

type SidebarPanel = 'community' | 'curriculum';

const PLAYBACK_SPEED_OPTIONS = [0.8, 1, 1.25, 1.5] as const;
const DEFAULT_QUALITY_OPTIONS: QualityOption[] = [{ label: '자동', levelIndex: 'auto' }];
const PROGRESS_SAVE_INTERVAL_SECONDS = 30;
const PROGRESS_SAVE_MIN_DELTA_SECONDS = 20;
const PROGRESS_EXIT_SAVE_MIN_DELTA_SECONDS = 5;
const QUIZ_SESSION_SAVE_INTERVAL_SECONDS = 10;

type HlsLoaderConstructor = typeof Hls.DefaultConfig.loader;
type HlsLoaderInstance = InstanceType<HlsLoaderConstructor>;

const formatQualityLabel = (level: {
  height?: number;
  width?: number;
  bitrate?: number;
  name?: string;
}) => {
  if (level.name) {
    return level.name;
  }

  if (level.height) {
    return `${String(level.height)}p`;
  }

  if (level.width) {
    return `${String(level.width)}px`;
  }

  if (level.bitrate) {
    return `${String(Math.round(level.bitrate / 1000))}kbps`;
  }

  return '수동';
};

const buildQualityOptions = (
  levels: Array<{ bitrate?: number; height?: number; name?: string; width?: number }>,
) => {
  const dedupedByLabel = new Map<string, QualityOption>();

  levels.forEach((level, index) => {
    const label = formatQualityLabel(level);
    dedupedByLabel.set(label, { label, levelIndex: index });
  });

  return [...DEFAULT_QUALITY_OPTIONS, ...dedupedByLabel.values()];
};

const createProtectedHlsLoader = (hlsKeyUrl: string): HlsLoaderConstructor => {
  const DefaultLoader = Hls.DefaultConfig.loader;

  return class ProtectedHlsLoader extends DefaultLoader {
    override load: HlsLoaderInstance['load'] = (context, config, callbacks) => {
      const nextContext =
        'type' in context && context.type === 'key'
          ? {
              ...context,
              url: hlsKeyUrl,
            }
          : context;

      super.load(nextContext, config, callbacks);
    };
  };
};

const buildPlaybackRequestPrefix = (streamUrl: string): string | null => {
  try {
    const parsed = new URL(streamUrl, window.location.origin);
    const marker = '/api/v1/lectures/';
    const playbackMarker = '/playback/';

    if (!parsed.pathname.includes(marker) || !parsed.pathname.includes(playbackMarker)) {
      return null;
    }

    const lastSlashIndex = parsed.pathname.lastIndexOf('/');
    if (lastSlashIndex < 0) {
      return null;
    }

    return `${parsed.origin}${parsed.pathname.slice(0, lastSlashIndex + 1)}`;
  } catch {
    return null;
  }
};

const normalizeQuizAnswers = (answers: Record<number, number[]>) => {
  return Object.fromEntries(
    Object.entries(answers).map(([questionId, optionIds]) => {
      const uniqueSortedOptionIds = [...new Set(optionIds)].sort((left, right) => left - right);
      return [Number(questionId), uniqueSortedOptionIds];
    }),
  ) as Record<number, number[]>;
};

const clampQuestionIndex = (index: number, questionCount: number) => {
  if (questionCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), questionCount - 1);
};

const PlayerPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const params = useParams<{ enrollmentId: string; lessonId: string }>();
  const resolvedEnrollmentId = Number(params.enrollmentId ?? '');
  const isValidEnrollmentId = Number.isInteger(resolvedEnrollmentId) && resolvedEnrollmentId > 0;
  const playerSnapshotQuery = useMyLearningPlayerSnapshotQuery(
    isValidEnrollmentId ? resolvedEnrollmentId : null,
    isValidEnrollmentId,
  );
  const snapshot = playerSnapshotQuery.data;
  const enrollmentState = snapshot?.enrollment;
  const lessons = useMemo(
    () => flattenLessons(snapshot?.curriculumTrack.sections ?? []),
    [snapshot?.curriculumTrack.sections],
  );
  const playerItems = useMemo(
    () => flattenPlayerItems(snapshot?.curriculumTrack.sections ?? []),
    [snapshot?.curriculumTrack.sections],
  );
  const playbackDeviceId = useMemo(() => getOrCreatePlaybackDeviceId(), []);
  const completedStatusStyle = useMemo<LessonStatusStyle>(() => {
    return {
      '--lesson-check-icon': `url(${iconCheck})`,
    };
  }, []);
  const supportsHlsPlayback = Hls.isSupported();
  const [playbackErrorsByLessonId, setPlaybackErrorsByLessonId] = useState<
    Record<string, string | undefined>
  >({});
  const [playbackRate, setPlaybackRate] = useState<(typeof PLAYBACK_SPEED_OPTIONS)[number]>(1);
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>(DEFAULT_QUALITY_OPTIONS);
  const [selectedQualityLevel, setSelectedQualityLevel] = useState<number | 'auto'>('auto');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<SidebarPanel>('curriculum');
  const [mediaDurationSeconds, setMediaDurationSeconds] = useState(0);
  const [progressSaveError, setProgressSaveError] = useState<string | null>(null);
  const [lessonProgressByLessonId, setLessonProgressByLessonId] = useState<
    Partial<Record<string, LearningPlayerLessonProgress>>
  >({});
  const [quizAttemptedLessonIds, setQuizAttemptedLessonIds] = useState<Set<string>>(new Set());
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number[]>>({});
  const [quizFlaggedQuestionIds, setQuizFlaggedQuestionIds] = useState<Set<number>>(new Set());
  const [quizCurrentQuestionIndex, setQuizCurrentQuestionIndex] = useState(0);
  const [quizElapsedSeconds, setQuizElapsedSeconds] = useState(0);
  const [showFlaggedOnlyQuestions, setShowFlaggedOnlyQuestions] = useState(false);
  const [quizAttemptResult, setQuizAttemptResult] = useState<StudentQuizAttemptResult | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const lastSavedProgressRef = useRef<Record<number, number>>({});
  const saveInFlightRef = useRef<Record<number, boolean>>({});
  const progressTimerRef = useRef<number | null>(null);
  const quizElapsedTimerRef = useRef<number | null>(null);
  const quizSessionDirtyRef = useRef(false);
  const quizSessionSaveInFlightRef = useRef(false);
  const defaultPlayerItemId = getDefaultPlayerItemId(snapshot, playerItems);
  const resolvedItemId = playerItems.some((item) => item.id === params.lessonId)
    ? params.lessonId
    : defaultPlayerItemId;
  const selectedItem = resolvedItemId
    ? playerItems.find((item) => item.id === resolvedItemId) || null
    : null;
  const selectedLesson = selectedItem?.lesson ?? null;
  const selectedItemIndex = selectedItem
    ? playerItems.findIndex((item) => item.id === selectedItem.id)
    : -1;
  const previousItem = selectedItemIndex > 0 ? playerItems[selectedItemIndex - 1] : null;
  const nextItem =
    selectedItemIndex >= 0 && selectedItemIndex + 1 < playerItems.length
      ? playerItems[selectedItemIndex + 1]
      : null;
  const completedLessonIds = useMemo(() => {
    return new Set(
      Object.entries(lessonProgressByLessonId)
        .filter(([, progress]) => progress?.completed === true)
        .map(([lessonId]) => lessonId),
    );
  }, [lessonProgressByLessonId]);
  const selectedSource = selectedLesson
    ? snapshot?.lessonPlaybackById[selectedLesson.id] || null
    : null;
  const isQuizItem = selectedItem?.kind === 'quiz';
  const isQuizLesson = selectedLesson?.deliveryType === 'quiz';
  const isQuizMode = Boolean(selectedItem) && (isQuizItem || isQuizLesson);
  const isLessonItem = selectedItem?.kind === 'lesson';
  const selectedLectureId = selectedSource?.lectureId ?? null;
  const selectedLessonHasStream =
    isLessonItem && selectedSource?.mimeType === 'application/x-mpegURL';
  const selectedLessonProgress = selectedLesson
    ? lessonProgressByLessonId[selectedLesson.id]
    : null;
  const isSelectedLessonCompleted = selectedLessonProgress?.completed === true;
  const shouldResumeCurrentLesson =
    isLessonItem &&
    selectedLesson?.id === snapshot?.currentLessonId &&
    (snapshot?.resumeAtSeconds || 0) > 0;
  const totalLessonCount = lessons.length;
  const completedLessonCount = completedLessonIds.size;
  const completedRatio =
    totalLessonCount > 0 ? Math.round((completedLessonCount / totalLessonCount) * 100) : 0;
  const isUnsupportedPlayback = isLessonItem && selectedLessonHasStream && !supportsHlsPlayback;
  const activeLectureId =
    enrollmentState?.active &&
    isLessonItem &&
    selectedSource !== null &&
    selectedSource.mimeType === 'application/x-mpegURL'
      ? selectedSource.lectureId
      : null;
  const lectureStreamQuery = useQuery<ProtectedLectureStream>({
    queryKey: ['lecture-stream', activeLectureId, playbackDeviceId],
    queryFn: () => fetchLectureStream(activeLectureId as number, playbackDeviceId),
    enabled: activeLectureId !== null && supportsHlsPlayback,
    retry: false,
  });
  const protectedStream = lectureStreamQuery.data ?? null;
  const quizQuery = useQuery<StudentQuiz | null>({
    queryKey: ['student-quiz', selectedLectureId],
    queryFn: () => fetchStudentQuiz(selectedLectureId as number),
    enabled:
      selectedLectureId !== null &&
      isQuizMode &&
      (isQuizLesson || (isQuizItem && isSelectedLessonCompleted)),
    retry: false,
  });
  const saveQuizSessionMutation = useMutation({
    mutationFn: ({
      payload,
      quizId,
    }: {
      quizId: number;
      payload: {
        answers: Record<number, number[]>;
        currentQuestionIndex: number;
        elapsedSeconds: number;
        flaggedQuestionIds: number[];
      };
    }) => saveStudentQuizSession(quizId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제 풀이 상태를 저장하지 못했습니다.',
        variant: 'error',
      });
    },
  });
  const submitQuizMutation = useMutation({
    mutationFn: ({ answers, quizId }: { answers: Record<number, number[]>; quizId: number }) =>
      submitStudentQuiz(quizId, { answers }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '퀴즈 제출에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (result) => {
      if (selectedLesson?.id) {
        setQuizAttemptedLessonIds((current) => new Set([...current, selectedLesson.id]));
      }
      quizSessionDirtyRef.current = false;
      void queryClient.invalidateQueries({
        queryKey: myLearningPlayerQueryKey(resolvedEnrollmentId),
      });
      void queryClient.invalidateQueries({
        queryKey: ['student-quiz', selectedLectureId],
      });
      setQuizAttemptResult(result);
      showToast({
        message: result.passed ? '퀴즈를 통과했습니다.' : '퀴즈 제출을 완료했습니다.',
        variant: 'success',
      });
    },
  });
  const streamLoading = lectureStreamQuery.isLoading;
  const streamErrorMessage = lectureStreamQuery.isError
    ? lectureStreamQuery.error instanceof Error
      ? lectureStreamQuery.error.message
      : '보호된 스트리밍 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
    : null;
  const playerError =
    (selectedLesson ? playbackErrorsByLessonId[selectedLesson.id] : null) || streamErrorMessage;
  const selectedQualityLabel =
    qualityOptions.find((quality) => quality.levelIndex === selectedQualityLevel)?.label || '자동';
  const communityContext = snapshot?.communityContext ?? null;
  const communityProgramId = enrollmentState?.programId ?? communityContext?.programId ?? null;
  const selectedLectureThreadCount =
    selectedLectureId !== null && selectedLectureId === communityContext?.currentLectureId
      ? communityContext.currentLectureThreadCount
      : null;

  const persistProgress = useEffectEvent(
    async (
      nextWatchedSeconds: number,
      force = false,
      minDeltaSeconds = PROGRESS_SAVE_MIN_DELTA_SECONDS,
    ) => {
      if (!selectedSource || !selectedLesson || !isValidEnrollmentId || !selectedLessonHasStream) {
        return;
      }

      const lectureId = selectedSource.lectureId;
      const lessonId = selectedLesson.id;
      const normalizedSeconds = Math.max(0, Math.floor(nextWatchedSeconds));
      const lastSavedSeconds = lastSavedProgressRef.current[lectureId] ?? 0;

      if (!force && normalizedSeconds < lastSavedSeconds + minDeltaSeconds) {
        return;
      }
      if (saveInFlightRef.current[lectureId]) {
        return;
      }

      saveInFlightRef.current[lectureId] = true;
      try {
        const response = await saveLectureProgress(
          resolvedEnrollmentId,
          lectureId,
          normalizedSeconds,
        );
        lastSavedProgressRef.current[lectureId] = response.watchedSeconds;
        setLessonProgressByLessonId((previous) => {
          const fallbackDurationSeconds =
            mediaDurationSeconds > 0
              ? mediaDurationSeconds
              : Math.max(0, (selectedLesson.durationMinutes ?? 0) * 60);
          const progressPercent = response.completed
            ? 100
            : fallbackDurationSeconds > 0
              ? Math.min(100, Math.round((response.watchedSeconds / fallbackDurationSeconds) * 100))
              : previous[lessonId]?.progressPercent || 0;

          return {
            ...previous,
            [lessonId]: {
              completed: response.completed,
              completedAt: response.completedAt,
              lastWatchedAt: response.lastWatchedAt,
              lectureId,
              progressPercent,
              watchedSeconds: response.watchedSeconds,
            },
          };
        });
        setProgressSaveError(null);
      } catch (error) {
        if (error instanceof Error) {
          setProgressSaveError(error.message);
        } else {
          setProgressSaveError('학습 진도를 저장하지 못했습니다.');
        }
      } finally {
        saveInFlightRef.current[lectureId] = false;
      }
    },
  );

  const queueProgressBeacon = useEffectEvent((nextWatchedSeconds: number) => {
    if (!selectedSource || !isValidEnrollmentId || !selectedLessonHasStream) {
      return false;
    }

    const lectureId = selectedSource.lectureId;
    const normalizedSeconds = Math.max(0, Math.floor(nextWatchedSeconds));
    const lastSavedSeconds = lastSavedProgressRef.current[lectureId] ?? 0;

    if (normalizedSeconds < lastSavedSeconds + PROGRESS_EXIT_SAVE_MIN_DELTA_SECONDS) {
      return false;
    }

    const queued = sendLectureProgressBeacon(resolvedEnrollmentId, lectureId, normalizedSeconds);

    if (queued) {
      lastSavedProgressRef.current[lectureId] = normalizedSeconds;
      setProgressSaveError(null);
    }

    return queued;
  });

  const persistQuizSession = useEffectEvent(async (force = false) => {
    if (!isQuizMode || !quizQuery.data || quizAttemptResult) {
      return;
    }

    if (!force && !quizSessionDirtyRef.current) {
      return;
    }

    if (quizSessionSaveInFlightRef.current) {
      return;
    }

    quizSessionSaveInFlightRef.current = true;

    try {
      await saveQuizSessionMutation.mutateAsync({
        payload: {
          answers: normalizeQuizAnswers(quizAnswers),
          currentQuestionIndex: clampQuestionIndex(
            quizCurrentQuestionIndex,
            quizQuery.data.questions.length,
          ),
          elapsedSeconds: Math.max(0, quizElapsedSeconds),
          flaggedQuestionIds: [...quizFlaggedQuestionIds].sort((left, right) => left - right),
        },
        quizId: quizQuery.data.id,
      });
      quizSessionDirtyRef.current = false;
    } finally {
      quizSessionSaveInFlightRef.current = false;
    }
  });

  useEffect(() => {
    const initialProgress: Record<number, number> = {};
    Object.values(snapshot?.lessonProgressByLessonId ?? {}).forEach((progress) => {
      initialProgress[progress.lectureId] = progress.watchedSeconds;
    });
    lastSavedProgressRef.current = initialProgress;
    setLessonProgressByLessonId(snapshot?.lessonProgressByLessonId ?? {});
  }, [snapshot?.lessonProgressByLessonId]);

  useEffect(() => {
    const nextAttemptedLessonIds = new Set<string>();

    snapshot?.curriculumTrack.sections.forEach((section) => {
      section.lessons.forEach((lesson) => {
        if (lesson.quizAttempted) {
          nextAttemptedLessonIds.add(lesson.id);
        }
      });
    });

    setQuizAttemptedLessonIds(nextAttemptedLessonIds);
  }, [snapshot?.curriculumTrack.sections]);

  useEffect(() => {
    setQuizAnswers({});
    setQuizFlaggedQuestionIds(new Set());
    setQuizCurrentQuestionIndex(0);
    setQuizElapsedSeconds(0);
    setShowFlaggedOnlyQuestions(false);
    quizSessionDirtyRef.current = false;
    setQuizAttemptResult(null);
  }, [selectedItem?.id]);

  useEffect(() => {
    if (!quizQuery.data || !isQuizMode || quizAttemptResult) {
      return;
    }

    const session = quizQuery.data.session;
    setQuizAnswers(session?.answers ?? {});
    setQuizFlaggedQuestionIds(new Set(session?.flaggedQuestionIds ?? []));
    setQuizCurrentQuestionIndex(
      clampQuestionIndex(session?.currentQuestionIndex ?? 0, quizQuery.data.questions.length),
    );
    setQuizElapsedSeconds(session?.elapsedSeconds ?? 0);
    quizSessionDirtyRef.current = false;
  }, [isQuizMode, quizAttemptResult, quizQuery.data]);

  useEffect(() => {
    if (!isQuizMode || !quizQuery.data || quizAttemptResult) {
      return;
    }

    const timerId = window.setInterval(() => {
      setQuizElapsedSeconds((current) => current + 1);
    }, 1000);
    quizElapsedTimerRef.current = timerId;

    return () => {
      window.clearInterval(timerId);
      quizElapsedTimerRef.current = null;
    };
  }, [isQuizMode, quizAttemptResult, quizQuery.data]);

  useEffect(() => {
    if (!isQuizMode || !quizQuery.data || quizAttemptResult) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void persistQuizSession(true);
    }, QUIZ_SESSION_SAVE_INTERVAL_SECONDS * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isQuizMode, persistQuizSession, quizAttemptResult, quizQuery.data]);

  useEffect(() => {
    if (!isQuizMode || !quizQuery.data || quizAttemptResult) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistQuizSession();
    }, 600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    isQuizMode,
    persistQuizSession,
    quizAnswers,
    quizAttemptResult,
    quizCurrentQuestionIndex,
    quizFlaggedQuestionIds,
    quizQuery.data,
  ]);

  useEffect(() => {
    if (!isQuizMode || !quizQuery.data || quizAttemptResult) {
      return;
    }

    const flushQuizSession = () => {
      void persistQuizSession(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushQuizSession();
      }
    };

    window.addEventListener('pagehide', flushQuizSession);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushQuizSession);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isQuizMode, persistQuizSession, quizAttemptResult, quizQuery.data]);

  useEffect(() => {
    setProgressSaveError(null);
    setMediaDurationSeconds(0);
    if (!selectedSource || !selectedLessonHasStream) {
      return;
    }
  }, [selectedLessonHasStream, selectedSource]);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    videoElement.playbackRate = playbackRate;
  }, [playbackRate, selectedLesson?.id, protectedStream?.hlsUrl]);

  useEffect(() => {
    setIsSettingsOpen(false);
  }, [selectedLesson?.id]);

  useEffect(() => {
    setActiveSidebarPanel('curriculum');
  }, [selectedItem?.id]);

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!settingsPanelRef.current?.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    if (
      isValidEnrollmentId &&
      snapshot &&
      playerItems.length > 0 &&
      params.lessonId !== resolvedItemId
    ) {
      void navigate(routePaths.learningLesson(String(resolvedEnrollmentId), resolvedItemId || ''), {
        replace: true,
      });
    }
  }, [
    isValidEnrollmentId,
    playerItems.length,
    navigate,
    params.lessonId,
    resolvedEnrollmentId,
    resolvedItemId,
    snapshot,
  ]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const playbackSessionToken = protectedStream?.playbackSessionToken ?? '';
    const selectedHlsKeyUrl = protectedStream?.hlsKeyUrl ?? '';
    const selectedStreamUrl = protectedStream?.hlsUrl ?? '';
    const playbackRequestPrefix = buildPlaybackRequestPrefix(selectedStreamUrl);

    setQualityOptions(DEFAULT_QUALITY_OPTIONS);
    setSelectedQualityLevel('auto');
    hlsRef.current = null;

    if (!videoElement || !selectedStreamUrl || !supportsHlsPlayback || !selectedLessonHasStream) {
      return;
    }

    let hls: Hls | null = null;

    const syncResumeTime = () => {
      if (!shouldResumeCurrentLesson) {
        return;
      }

      try {
        videoElement.currentTime = snapshot?.resumeAtSeconds || 0;
      } catch {
        // currentTime은 메타데이터 준비 전 실패할 수 있으므로 조용히 무시합니다.
      }
    };

    const handleLoadedMetadata = () => {
      setMediaDurationSeconds(
        Number.isFinite(videoElement.duration) && videoElement.duration > 0
          ? Math.round(videoElement.duration)
          : 0,
      );
      syncResumeTime();
    };

    const clearProgressTimer = () => {
      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };

    const scheduleProgressTimer = () => {
      clearProgressTimer();
      progressTimerRef.current = window.setInterval(() => {
        if (videoElement.paused || videoElement.ended) {
          return;
        }
        void persistProgress(videoElement.currentTime || 0);
      }, PROGRESS_SAVE_INTERVAL_SECONDS * 1000);
    };

    const flushProgress = () => {
      if (!queueProgressBeacon(videoElement.currentTime || 0)) {
        void persistProgress(
          videoElement.currentTime || 0,
          false,
          PROGRESS_EXIT_SAVE_MIN_DELTA_SECONDS,
        );
      }
    };

    const handlePause = () => {
      clearProgressTimer();
    };

    const handlePlay = () => {
      scheduleProgressTimer();
    };

    const handleEnded = () => {
      clearProgressTimer();
      const durationSeconds =
        Number.isFinite(videoElement.duration) && videoElement.duration > 0
          ? videoElement.duration
          : videoElement.currentTime || 0;
      void persistProgress(durationSeconds, true);
    };

    const handlePageHide = () => {
      flushProgress();
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('ended', handleEnded);
    window.addEventListener('pagehide', handlePageHide);

    const ProtectedLoader = createProtectedHlsLoader(selectedHlsKeyUrl);
    hls = new Hls({
      enableWorker: true,
      loader: ProtectedLoader,
      xhrSetup: (xhr, url) => {
        xhr.withCredentials = true;

        const isKeyRequest = url === selectedHlsKeyUrl;
        const isProtectedPlaybackRequest =
          playbackRequestPrefix !== null && url.startsWith(playbackRequestPrefix);

        if (isKeyRequest || isProtectedPlaybackRequest) {
          xhr.setRequestHeader('X-Playback-Session-Token', playbackSessionToken);
          xhr.setRequestHeader('X-Playback-Device-Id', playbackDeviceId);
        }
      },
    });
    hlsRef.current = hls;
    hls.loadSource(selectedStreamUrl);
    hls.attachMedia(videoElement);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setQualityOptions(buildQualityOptions(hls.levels));
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal && selectedLesson) {
        setPlaybackErrorsByLessonId((previous) => ({
          ...previous,
          [selectedLesson.id]: '스트리밍을 재생하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        }));
      }
    });

    return () => {
      clearProgressTimer();
      flushProgress();
      hlsRef.current = null;
      videoElement.removeAttribute('src');
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('ended', handleEnded);
      window.removeEventListener('pagehide', handlePageHide);
      hls.destroy();
    };
  }, [
    isValidEnrollmentId,
    playbackDeviceId,
    protectedStream,
    protectedStream?.hlsKeyUrl,
    protectedStream?.hlsUrl,
    protectedStream?.playbackSessionToken,
    resolvedEnrollmentId,
    selectedLesson,
    shouldResumeCurrentLesson,
    snapshot,
    supportsHlsPlayback,
    selectedLessonHasStream,
  ]);

  const isLoading = playerSnapshotQuery.isLoading;
  const hasError = playerSnapshotQuery.isError;
  const errorMessage =
    playerSnapshotQuery.error instanceof Error
      ? playerSnapshotQuery.error.message
      : '온라인 수강 정보를 불러오지 못했습니다.';
  const isPlaybackBlocked =
    !enrollmentState || !enrollmentState.active || lessons.length === 0 || !selectedItem;

  const applyPlaybackRate = (nextPlaybackRate: (typeof PLAYBACK_SPEED_OPTIONS)[number]) => {
    setPlaybackRate(nextPlaybackRate);
  };

  const applyQualityLevel = (levelIndex: number | 'auto') => {
    setSelectedQualityLevel(levelIndex);

    if (!hlsRef.current) {
      return;
    }

    if (levelIndex === 'auto') {
      hlsRef.current.loadLevel = -1;
      hlsRef.current.nextLevel = -1;
      return;
    }

    hlsRef.current.loadLevel = levelIndex;
    hlsRef.current.nextLevel = levelIndex;
  };

  const updateQuizAnswer = (
    questionId: number,
    optionId: number,
    questionType: StudentQuiz['questions'][number]['questionType'],
  ) => {
    quizSessionDirtyRef.current = true;
    setQuizAnswers((current) => {
      if (questionType === 'MULTIPLE') {
        const currentOptionIds = current[questionId] ?? [];
        const nextOptionIds = currentOptionIds.includes(optionId)
          ? currentOptionIds.filter((currentOptionId) => currentOptionId !== optionId)
          : [...currentOptionIds, optionId];

        return {
          ...current,
          [questionId]: nextOptionIds,
        };
      }

      return {
        ...current,
        [questionId]: [optionId],
      };
    });
  };

  const moveToQuizQuestion = (nextQuestionIndex: number) => {
    const questionCount = quizQuery.data?.questions.length ?? 0;
    quizSessionDirtyRef.current = true;
    setQuizCurrentQuestionIndex(clampQuestionIndex(nextQuestionIndex, questionCount));
  };

  const toggleQuizFlaggedQuestion = (questionId: number) => {
    quizSessionDirtyRef.current = true;
    setQuizFlaggedQuestionIds((current) => {
      const next = new Set(current);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const quizQuestions = quizQuery.data?.questions ?? [];
  const resolvedQuizQuestionIndex = clampQuestionIndex(
    quizCurrentQuestionIndex,
    quizQuestions.length,
  );
  const currentQuizQuestion = quizQuestions[resolvedQuizQuestionIndex] ?? null;
  const answeredQuizQuestionCount = quizQuestions.filter(
    (question) => (quizAnswers[question.id] ?? []).length > 0,
  ).length;
  const flaggedQuizQuestionCount = quizQuestions.filter((question) =>
    quizFlaggedQuestionIds.has(question.id),
  ).length;
  const visibleQuizQuestions = showFlaggedOnlyQuestions
    ? quizQuestions.filter((question) => quizFlaggedQuestionIds.has(question.id))
    : quizQuestions;

  const handleQuizSubmit = () => {
    const quiz = quizQuery.data;
    if (!quiz) {
      return;
    }

    const unansweredQuestion = quiz.questions.find((question) => {
      return (quizAnswers[question.id] ?? []).length === 0;
    });

    if (unansweredQuestion) {
      showToast({
        message: '모든 문항에 답을 선택해 주세요.',
        variant: 'error',
      });
      return;
    }

    submitQuizMutation.mutate({
      answers: normalizeQuizAnswers(quizAnswers),
      quizId: quiz.id,
    });
  };

  const renderQuizMedia = (
    mediaType: StudentQuiz['questions'][number]['mediaType'],
    mediaPreviewUrl: string | null | undefined,
    mediaUrl: string | null,
    alt: string,
    className: string,
  ) => {
    const resolvedMediaUrl = mediaPreviewUrl || mediaUrl;

    if (!mediaType || !resolvedMediaUrl) {
      return null;
    }

    if (mediaType === 'VIDEO') {
      return (
        <video className={className} controls preload='metadata'>
          <source src={resolvedMediaUrl} />
        </video>
      );
    }

    return <img alt={alt} className={className} src={resolvedMediaUrl} />;
  };

  return (
    <div className={styles['page']}>
      <div className={styles['shell']}>
        <header className={styles['topBar']}>
          <div className={styles['topBarCopy']}>
            <Link className={styles['backLink']} to={routePaths.mypage}>
              <img alt='' aria-hidden='true' className={styles['backLinkIcon']} src={iconBack} />
              <span>내 강의</span>
            </Link>
          </div>
          {enrollmentState ? (
            <div className={styles['topBarMeta']}>
              <span className={styles['topBarChip']}>진도율 {completedRatio}%</span>
              <span className={styles['topBarText']}>
                {formatDateRange(enrollmentState.enrolledAt, enrollmentState.expireAt)}
              </span>
            </div>
          ) : null}
        </header>

        {!isValidEnrollmentId ? (
          <p className={styles['message']}>올바른 수강 정보가 아닙니다.</p>
        ) : null}
        {isValidEnrollmentId && isLoading ? (
          <p className={styles['message']}>온라인 수강 정보를 불러오는 중입니다.</p>
        ) : null}
        {isValidEnrollmentId && hasError ? (
          <p className={styles['errorText']}>{errorMessage}</p>
        ) : null}

        {isValidEnrollmentId && !isLoading && !hasError ? (
          !isPlaybackBlocked ? (
            <div className={styles['layout']}>
              <section className={styles['viewerColumn']}>
                {isLessonItem && !isQuizMode ? (
                  <>
                    <section className={styles['stageCard']}>
                      <div className={styles['stageHeader']}>
                        <div className={styles['stageCopy']}>
                          <h1 className={styles['lessonTitle']}>{selectedLesson?.title}</h1>
                          {progressSaveError ? (
                            <p className={styles['stageProgressWarning']}>{progressSaveError}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className={styles['playerShell']}>
                        <div className={styles['playerFrame']}>
                          {selectedLessonHasStream ? (
                            <video
                              className={styles['playerElement']}
                              controls
                              controlsList='nodownload noremoteplayback'
                              disablePictureInPicture
                              disableRemotePlayback
                              playsInline
                              poster={selectedSource.posterUrl ?? undefined}
                              preload='auto'
                              ref={videoRef}
                            />
                          ) : (
                            <div className={styles['playerPlaceholder']}>
                              <div className={styles['playerOverlayCopy']}>
                                <p className={styles['overlayTitle']}>
                                  이 강의는 영상 없이 제공되는 강의입니다.
                                </p>
                                <p className={styles['overlayDescription']}>
                                  실습, 자료, 강의 설명 중심으로 진행되며 영상이 연결되면 여기에서
                                  바로 재생할 수 있습니다.
                                </p>
                                {selectedLesson?.description ? (
                                  <p className={styles['playerPlaceholderDescription']}>
                                    {selectedLesson.description}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          )}

                          {selectedLessonHasStream && streamLoading ? (
                            <div className={styles['playerOverlay']}>
                              <p className={styles['overlayTitle']}>
                                보호된 스트리밍을 준비하고 있습니다.
                              </p>
                            </div>
                          ) : null}

                          {isUnsupportedPlayback ? (
                            <div className={styles['playerOverlay']}>
                              <div className={styles['playerOverlayCopy']}>
                                <p className={styles['overlayTitle']}>
                                  현재 브라우저에서는 스트리밍을 재생할 수 없습니다.
                                </p>
                                <p className={styles['overlayDescription']}>
                                  최신 Chrome, Edge, Firefox 또는 Safari로 접속해 주세요.
                                </p>
                              </div>
                            </div>
                          ) : null}

                          {!selectedSource ? (
                            <div className={styles['playerOverlay']}>
                              <p className={styles['overlayTitle']}>
                                재생할 강의를 찾을 수 없습니다.
                              </p>
                            </div>
                          ) : null}

                          {playerError ? (
                            <div className={styles['playerErrorBanner']}>
                              <p className={styles['playerErrorText']}>{playerError}</p>
                            </div>
                          ) : null}

                          {selectedLessonHasStream ? (
                            <div className={styles['playerFrameControls']} ref={settingsPanelRef}>
                              <div className={styles['settingsWrap']}>
                                <button
                                  aria-expanded={isSettingsOpen}
                                  aria-haspopup='dialog'
                                  aria-label='재생 설정'
                                  className={styles['settingsButton']}
                                  onClick={() => {
                                    setIsSettingsOpen((previous) => !previous);
                                  }}
                                  type='button'
                                >
                                  <svg
                                    aria-hidden='true'
                                    className={styles['settingsIcon']}
                                    fill='currentColor'
                                    viewBox='0 0 24 24'
                                  >
                                    <circle cx='12' cy='5' r='1.8' />
                                    <circle cx='12' cy='12' r='1.8' />
                                    <circle cx='12' cy='19' r='1.8' />
                                  </svg>
                                </button>

                                {isSettingsOpen ? (
                                  <div
                                    aria-label='재생 설정 패널'
                                    className={styles['settingsPanel']}
                                    role='dialog'
                                  >
                                    <section className={styles['settingsSection']}>
                                      <div className={styles['settingsSectionHeader']}>
                                        <strong className={styles['settingsTitle']}>
                                          재생 속도
                                        </strong>
                                        <span className={styles['settingsCurrentValue']}>
                                          {playbackRate}x
                                        </span>
                                      </div>
                                      <div className={styles['settingsOptionList']}>
                                        {PLAYBACK_SPEED_OPTIONS.map((speedOption) => (
                                          <button
                                            className={classNames(
                                              styles['settingsOption'],
                                              playbackRate === speedOption &&
                                                styles['settingsOptionActive'],
                                            )}
                                            key={speedOption}
                                            onClick={() => {
                                              applyPlaybackRate(speedOption);
                                            }}
                                            type='button'
                                          >
                                            {speedOption}x
                                          </button>
                                        ))}
                                      </div>
                                    </section>

                                    <section className={styles['settingsSection']}>
                                      <div className={styles['settingsSectionHeader']}>
                                        <strong className={styles['settingsTitle']}>해상도</strong>
                                        <span className={styles['settingsCurrentValue']}>
                                          {selectedQualityLabel}
                                        </span>
                                      </div>
                                      <div className={styles['settingsOptionList']}>
                                        {qualityOptions.map((quality) => (
                                          <button
                                            className={classNames(
                                              styles['settingsOption'],
                                              selectedQualityLevel === quality.levelIndex &&
                                                styles['settingsOptionActive'],
                                            )}
                                            key={`${quality.label}-${String(quality.levelIndex)}`}
                                            onClick={() => {
                                              applyQualityLevel(quality.levelIndex);
                                            }}
                                            type='button'
                                          >
                                            {quality.label}
                                          </button>
                                        ))}
                                      </div>
                                    </section>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className={styles['playerToolbar']}>
                          <div className={styles['sequenceGroup']}>
                            {previousItem ? (
                              <Button
                                className={styles['transportButton']}
                                onClick={() => {
                                  void navigate(
                                    routePaths.learningLesson(
                                      String(resolvedEnrollmentId),
                                      previousItem.id,
                                    ),
                                  );
                                }}
                                size='sm'
                                type='button'
                                variant='secondary'
                              >
                                <span className={styles['transportButtonInner']}>
                                  <span
                                    aria-hidden='true'
                                    className={classNames(
                                      styles['transportIcon'],
                                      styles['transportIconPrevious'],
                                    )}
                                    style={{ backgroundImage: `url(${iconNextPlay})` }}
                                  />
                                  <span>이전</span>
                                </span>
                              </Button>
                            ) : null}
                            {nextItem ? (
                              <Button
                                className={styles['transportButton']}
                                onClick={() => {
                                  void navigate(
                                    routePaths.learningLesson(
                                      String(resolvedEnrollmentId),
                                      nextItem.id,
                                    ),
                                  );
                                }}
                                size='sm'
                                type='button'
                                variant='secondary'
                              >
                                <span className={styles['transportButtonInner']}>
                                  <span>다음</span>
                                  <span
                                    aria-hidden='true'
                                    className={styles['transportIcon']}
                                    style={{ backgroundImage: `url(${iconNextPlay})` }}
                                  />
                                </span>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </section>
                  </>
                ) : null}

                {isQuizMode ? (
                  <section className={styles['quizWorkspace']}>
                    <div className={styles['quizWorkspaceHeader']}>
                      <div className={styles['stageCopy']}>
                        <p className={styles['stageEyebrow']}>
                          {isQuizLesson ? 'PROBLEM SOLVING' : 'QUIZ STEP'}
                        </p>
                        <h1 className={styles['lessonTitle']}>
                          {quizQuery.data?.title ?? selectedItem.title}
                        </h1>
                        <p className={styles['quizDescription']}>
                          {isQuizLesson
                            ? '문제만으로 구성된 강의입니다. 번호판과 red flag를 이용해 필요한 문제로 바로 이동할 수 있습니다.'
                            : `${selectedLesson?.title}을 마친 뒤 이어지는 확인 단계입니다.`}
                        </p>
                      </div>
                      <div className={styles['sequenceGroup']}>
                        {isQuizItem && selectedLesson ? (
                          <Button
                            onClick={() => {
                              void navigate(
                                routePaths.learningLesson(
                                  String(resolvedEnrollmentId),
                                  selectedLesson.id,
                                ),
                              );
                            }}
                            size='sm'
                            type='button'
                            variant='secondary'
                          >
                            강의로 돌아가기
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {!isQuizLesson && !isSelectedLessonCompleted ? (
                      <div className={styles['quizSummary']}>
                        <strong className={styles['quizSummaryTitle']}>
                          강의를 먼저 완료해 주세요.
                        </strong>
                        <p className={styles['quizMutedText']}>
                          퀴즈는 강의 시청 완료 후에만 열립니다.
                        </p>
                      </div>
                    ) : quizQuery.isLoading ? (
                      <p className={styles['quizMutedText']}>퀴즈 정보를 불러오는 중입니다.</p>
                    ) : quizQuery.isError ? (
                      <p className={styles['quizErrorText']}>
                        {quizQuery.error instanceof Error
                          ? quizQuery.error.message
                          : '퀴즈 정보를 불러오지 못했습니다.'}
                      </p>
                    ) : !quizQuery.data ? (
                      <p className={styles['quizMutedText']}>이 강의에는 등록된 문제가 없습니다.</p>
                    ) : (
                      <>
                        <div className={styles['quizSummary']}>
                          <div>
                            <strong className={styles['quizSummaryTitle']}>
                              총 {quizQuestions.length}문제 · 응답 완료 {answeredQuizQuestionCount}
                              개 · red flag {flaggedQuizQuestionCount}개
                            </strong>
                            {quizQuery.data.description ? (
                              <p className={styles['quizSummaryMeta']}>
                                {quizQuery.data.description}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {quizAttemptResult ? null : currentQuizQuestion ? (
                          <section className={styles['quizQuestionCard']}>
                            <div className={styles['quizQuestionHeader']}>
                              <strong className={styles['quizQuestionTitle']}>
                                문제 {resolvedQuizQuestionIndex + 1}.{' '}
                                {currentQuizQuestion.questionText}
                              </strong>
                              <span className={styles['quizQuestionType']}>
                                {currentQuizQuestion.questionType === 'MULTIPLE'
                                  ? '복수 정답'
                                  : currentQuizQuestion.questionType === 'TRUE_FALSE'
                                    ? '참/거짓'
                                    : '단일 정답'}
                              </span>
                            </div>

                            {renderQuizMedia(
                              currentQuizQuestion.mediaType,
                              currentQuizQuestion.mediaPreviewUrl,
                              currentQuizQuestion.mediaUrl,
                              `${String(resolvedQuizQuestionIndex + 1)}번 문항 미디어`,
                              styles['quizMediaImage'],
                            )}

                            <div className={styles['quizOptionList']}>
                              {currentQuizQuestion.options.map((option, optionIndex) => {
                                const selectedOptionIds = quizAnswers[currentQuizQuestion.id] ?? [];
                                const checked = selectedOptionIds.includes(option.id);

                                return (
                                  <label
                                    className={classNames(
                                      styles['quizOptionRow'],
                                      checked && styles['quizOptionRowSelected'],
                                    )}
                                    key={option.id}
                                  >
                                    <input
                                      checked={checked}
                                      aria-label={`${String(optionIndex + 1)}. ${option.optionText}`}
                                      name={`quiz-question-${String(currentQuizQuestion.id)}`}
                                      onChange={() => {
                                        updateQuizAnswer(
                                          currentQuizQuestion.id,
                                          option.id,
                                          currentQuizQuestion.questionType,
                                        );
                                      }}
                                      type={
                                        currentQuizQuestion.questionType === 'MULTIPLE'
                                          ? 'checkbox'
                                          : 'radio'
                                      }
                                    />
                                    <div className={styles['quizOptionContent']}>
                                      <span className={styles['quizOptionLabel']}>
                                        {optionIndex + 1}. {option.optionText}
                                      </span>
                                      {renderQuizMedia(
                                        option.mediaType,
                                        option.mediaPreviewUrl,
                                        option.mediaUrl,
                                        `${String(resolvedQuizQuestionIndex + 1)}번 문항 ${String(optionIndex + 1)}번 보기 미디어`,
                                        styles['quizOptionMedia'],
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>

                            <div className={styles['quizControlBar']}>
                              <Button
                                disabled={resolvedQuizQuestionIndex === 0}
                                onClick={() => {
                                  moveToQuizQuestion(resolvedQuizQuestionIndex - 1);
                                }}
                                size='sm'
                                type='button'
                                variant='secondary'
                              >
                                Prev
                              </Button>
                              <Button
                                onClick={() => {
                                  toggleQuizFlaggedQuestion(currentQuizQuestion.id);
                                }}
                                size='sm'
                                type='button'
                                variant={
                                  quizFlaggedQuestionIds.has(currentQuizQuestion.id)
                                    ? 'primary'
                                    : 'secondary'
                                }
                              >
                                {quizFlaggedQuestionIds.has(currentQuizQuestion.id)
                                  ? 'Red Flag 해제'
                                  : 'Red Flag'}
                              </Button>
                              <div className={styles['quizControlTime']}>
                                <span className={styles['quizControlTimeLabel']}>Time</span>
                                <strong>{formatSeconds(quizElapsedSeconds)}</strong>
                              </div>
                              {resolvedQuizQuestionIndex + 1 < quizQuestions.length ? (
                                <Button
                                  onClick={() => {
                                    moveToQuizQuestion(resolvedQuizQuestionIndex + 1);
                                  }}
                                  size='sm'
                                  type='button'
                                  variant='secondary'
                                >
                                  Next
                                </Button>
                              ) : (
                                <Button
                                  disabled={submitQuizMutation.isPending}
                                  onClick={handleQuizSubmit}
                                  size='sm'
                                  type='button'
                                >
                                  {submitQuizMutation.isPending ? '제출 중...' : '정답 제출'}
                                </Button>
                              )}
                            </div>
                          </section>
                        ) : (
                          <p className={styles['quizMutedText']}>등록된 문제가 없습니다.</p>
                        )}

                        {quizAttemptResult ? (
                          <div className={styles['quizResultCard']}>
                            <div className={styles['quizResultHeader']}>
                              <strong className={styles['quizResultTitle']}>채점 결과</strong>
                              <span
                                className={classNames(
                                  styles['quizResultBadge'],
                                  quizAttemptResult.passed && styles['quizResultBadgePassed'],
                                )}
                              >
                                {quizAttemptResult.score} / {quizAttemptResult.passScore}
                                {quizAttemptResult.passed ? ' 통과' : ' 재도전 필요'}
                              </span>
                            </div>

                            <div className={styles['quizResultList']}>
                              {quizAttemptResult.results.map((result, resultIndex) => {
                                const question = quizQuery.data?.questions.find(
                                  (item) => item.id === result.questionId,
                                );
                                const submittedLabels =
                                  question?.options
                                    .filter((option) =>
                                      result.submittedOptionIds.includes(option.id),
                                    )
                                    .map((option) => option.optionText) ?? [];
                                const correctLabels =
                                  question?.options
                                    .filter((option) => result.correctOptionIds.includes(option.id))
                                    .map((option) => option.optionText) ?? [];

                                return (
                                  <article
                                    className={styles['quizResultItem']}
                                    key={result.questionId}
                                  >
                                    <div className={styles['quizResultItemHeader']}>
                                      <strong className={styles['quizResultQuestion']}>
                                        {resultIndex + 1}. {result.questionText}
                                      </strong>
                                      <span
                                        className={classNames(
                                          styles['quizResultState'],
                                          result.correct && styles['quizResultStateCorrect'],
                                        )}
                                      >
                                        {result.correct ? '정답' : '오답'}
                                      </span>
                                    </div>
                                    <p className={styles['quizResultMeta']}>
                                      선택 답안: {submittedLabels.join(', ') || '-'}
                                    </p>
                                    <p className={styles['quizResultMeta']}>
                                      정답: {correctLabels.join(', ') || '-'}
                                    </p>
                                    {result.explanation ? (
                                      <p className={styles['quizResultExplanation']}>
                                        해설: {result.explanation}
                                      </p>
                                    ) : null}
                                  </article>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </section>
                ) : null}
              </section>

              {isQuizMode ? (
                <aside className={styles['quizNavigatorPanel']}>
                  <div className={styles['curriculumHeader']}>
                    <div className={styles['curriculumHeaderCopy']}>
                      <h2 className={styles['curriculumTitle']}>문제 네비게이터</h2>
                      <p className={styles['curriculumDescription']}>
                        문제 번호를 누르면 바로 이동합니다.
                      </p>
                    </div>
                    <div className={styles['progressPanel']}>
                      <div className={styles['progressSummary']}>
                        <strong className={styles['progressValue']}>
                          {answeredQuizQuestionCount}/{quizQuestions.length}
                        </strong>
                        <span className={styles['progressText']}>응답 완료</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles['quizNavigatorMeta']}>
                    <span className={styles['summaryChip']}>전체 {quizQuestions.length}</span>
                    <span className={styles['summaryChip']}>
                      응답 완료 {answeredQuizQuestionCount}
                    </span>
                    <span className={styles['summaryChip']}>
                      Red Flag {flaggedQuizQuestionCount}
                    </span>
                  </div>

                  <div className={styles['quizNavigatorActions']}>
                    <Button
                      onClick={() => {
                        setShowFlaggedOnlyQuestions((current) => !current);
                      }}
                      size='sm'
                      type='button'
                      variant={showFlaggedOnlyQuestions ? 'primary' : 'secondary'}
                    >
                      {showFlaggedOnlyQuestions ? '전체 보기' : 'Flagged만 보기'}
                    </Button>
                  </div>

                  {visibleQuizQuestions.length > 0 ? (
                    <div className={styles['quizNavigatorGrid']}>
                      {visibleQuizQuestions.map((question) => {
                        const absoluteIndex = quizQuestions.findIndex(
                          (item) => item.id === question.id,
                        );
                        const isCurrentQuestion = question.id === currentQuizQuestion?.id;
                        const isAnswered = (quizAnswers[question.id] ?? []).length > 0;
                        const isFlagged = quizFlaggedQuestionIds.has(question.id);

                        return (
                          <button
                            className={classNames(
                              styles['quizNavigatorButton'],
                              isCurrentQuestion && styles['quizNavigatorButtonCurrent'],
                              isAnswered && styles['quizNavigatorButtonAnswered'],
                              isFlagged && styles['quizNavigatorButtonFlagged'],
                            )}
                            key={question.id}
                            onClick={() => {
                              moveToQuizQuestion(absoluteIndex);
                            }}
                            type='button'
                          >
                            {absoluteIndex + 1}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className={styles['quizMutedText']}>
                      red flag로 표시한 문제가 아직 없습니다.
                    </p>
                  )}
                </aside>
              ) : (
                <aside className={styles['curriculumPanel']}>
                  <div className={styles['curriculumHeader']}>
                    <div className={styles['curriculumHeaderCopy']}>
                      <h2 className={styles['curriculumTitle']}>
                        {activeSidebarPanel === 'curriculum' ? '커리큘럼' : '커뮤니티'}
                      </h2>
                    </div>
                    <div className={styles['panelSwitchRow']}>
                      <button
                        aria-label='커리큘럼 패널'
                        className={classNames(
                          styles['panelSwitchButton'],
                          activeSidebarPanel === 'curriculum' && styles['panelSwitchButtonActive'],
                        )}
                        onClick={() => {
                          setActiveSidebarPanel('curriculum');
                        }}
                        type='button'
                      >
                        <span className={styles['panelSwitchLabel']}>목록</span>
                      </button>
                      <button
                        aria-label='커뮤니티 패널'
                        className={classNames(
                          styles['panelSwitchButton'],
                          activeSidebarPanel === 'community' && styles['panelSwitchButtonActive'],
                        )}
                        onClick={() => {
                          setActiveSidebarPanel('community');
                        }}
                        type='button'
                      >
                        <svg
                          aria-hidden='true'
                          className={styles['panelSwitchIcon']}
                          fill='none'
                          viewBox='0 0 24 24'
                        >
                          <path
                            d='M7 8.75h10M7 12h6m-6 3.25h4m7 3.25-3.6-2H7.8A2.8 2.8 0 0 1 5 13.7V7.8A2.8 2.8 0 0 1 7.8 5h8.4A2.8 2.8 0 0 1 19 7.8v10.65Z'
                            stroke='currentColor'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth='1.8'
                          />
                        </svg>
                        <span className={styles['panelSwitchLabel']}>Q&A</span>
                        <span className={styles['panelSwitchCount']}>
                          {String(snapshot.communityContext?.programThreadCount ?? 0)}
                        </span>
                      </button>
                    </div>
                  </div>

                  {activeSidebarPanel === 'curriculum' ? (
                    <>
                      <div className={styles['progressPanel']}>
                        <div className={styles['progressSummary']}>
                          <strong className={styles['progressValue']}>{completedRatio}%</strong>
                          <span className={styles['progressText']}>
                            {completedLessonCount} / {totalLessonCount} 완료
                          </span>
                        </div>
                        <div aria-hidden='true' className={styles['progressTrack']}>
                          <span
                            className={styles['progressFill']}
                            style={{ width: `${String(completedRatio)}%` }}
                          />
                        </div>
                      </div>

                      <div className={styles['curriculumBody']}>
                        {snapshot.curriculumTrack.sections.map((section) => (
                          <section className={styles['sectionBlock']} key={section.id}>
                            <div className={styles['sectionHeader']}>
                              <h3 className={styles['sectionTitle']}>{section.title}</h3>
                              <span className={styles['sectionMeta']}>{section.durationLabel}</span>
                            </div>

                            <div className={styles['lessonList']}>
                              {flattenPlayerItems([
                                {
                                  id: section.id,
                                  lessons: section.lessons,
                                  title: section.title,
                                },
                              ]).map((item) => {
                                const lesson = item.lesson;
                                const isCurrent = item.id === selectedItem.id;
                                const isCompleted = completedLessonIds.has(lesson.id);
                                const isQuizCompleted = quizAttemptedLessonIds.has(lesson.id);
                                const isItemCompleted =
                                  item.kind === 'quiz' ? isQuizCompleted : isCompleted;

                                return (
                                  <Link
                                    className={classNames(
                                      styles['lessonLink'],
                                      item.kind === 'quiz' && styles['lessonLinkQuiz'],
                                      isCurrent && styles['lessonLinkCurrent'],
                                    )}
                                    key={item.id}
                                    to={routePaths.learningLesson(
                                      String(resolvedEnrollmentId),
                                      item.id,
                                    )}
                                  >
                                    <span
                                      aria-hidden='true'
                                      className={classNames(
                                        styles['lessonStatusIcon'],
                                        item.kind === 'quiz' && styles['lessonStatusIconQuiz'],
                                        isItemCompleted && styles['lessonStatusIconCompleted'],
                                        isCurrent && styles['lessonStatusIconCurrent'],
                                      )}
                                      style={isItemCompleted ? completedStatusStyle : undefined}
                                    />
                                    <div className={styles['lessonLinkHeader']}>
                                      <strong className={styles['lessonLinkTitle']}>
                                        {item.title}
                                      </strong>
                                      <div className={styles['lessonLinkMeta']}>
                                        {item.kind === 'lesson' ? (
                                          <>
                                            <span className={styles['lessonLinkDuration']}>
                                              {lesson.deliveryType === 'quiz'
                                                ? '문제 풀이'
                                                : lesson.durationLabel}
                                            </span>
                                            {lesson.deliveryType ===
                                            'quiz' ? null : lesson.hasQuiz ? (
                                              <span className={styles['lessonLinkDuration']}>
                                                퀴즈 포함
                                              </span>
                                            ) : null}
                                          </>
                                        ) : (
                                          <span
                                            className={classNames(
                                              styles['lessonQuizBadge'],
                                              isQuizCompleted && styles['lessonQuizBadgeCompleted'],
                                            )}
                                          >
                                            {isQuizCompleted ? '퀴즈 완료' : '확인 퀴즈'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className={styles['communityPanelBody']}>
                      <ProgramCommunityPanel
                        enabled
                        lectureId={selectedLectureId}
                        lectureThreadCount={selectedLectureThreadCount}
                        programId={communityProgramId}
                        programThreadCount={communityContext?.programThreadCount ?? null}
                        title='수강 커뮤니티'
                      />
                    </div>
                  )}
                </aside>
              )}
            </div>
          ) : (
            <section className={styles['blockedCard']}>
              <h1 className={styles['blockedTitle']}>지금은 재생할 수 없습니다.</h1>
              <p className={styles['blockedDescription']}>
                수강 상태가 종료되었거나 재생 가능한 온라인 콘텐츠가 아직 준비되지 않았습니다.
              </p>
              <Link className={styles['dashboardLink']} to={routePaths.mypage}>
                내 강의로 돌아가기
              </Link>
            </section>
          )
        ) : null}
      </div>
    </div>
  );
};

export default PlayerPage;
