/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import type {
  ChangeEvent as ReactChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Hls from 'hls.js/light';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  cancelMyLecturePracticum,
  fetchLectureStream,
  moveMyLecturePracticum,
  reserveMyLecturePracticum,
  refreshLectureStreamCookies,
  saveLectureProgress,
  sendLectureProgressBeacon,
  updateMyOfflineScheduleAbsence,
} from '@/api/mypage';
import { downloadProgramResourceFile } from '@/api/resources';
import {
  fetchProblemVideoStream,
  fetchStudentProblemAttemptReport,
  fetchStudentProblem,
  refreshProblemVideoStreamCookies,
  saveStudentProblemSession,
  startStudentProblemSession,
  submitStudentProblem,
} from '@/api/studentProblems';
import iconArrowDownToLine from '@/assets/icons/lucide_arrow-down-to-line.svg';
import iconArrowLeft from '@/assets/icons/lucide_arrow-left.svg';
import iconBookmark from '@/assets/icons/lucide_bookmark.svg';
import iconPracticumCalendar from '@/assets/icons/lucide_calendar.svg';
import iconCheck from '@/assets/icons/lucide_check.svg';
import iconChevronDown from '@/assets/icons/lucide_chevron-down.svg';
import iconResultRetryNeeded from '@/assets/icons/lucide_clipboard-x.svg';
import iconFolderOpen from '@/assets/icons/lucide_folder-open.svg';
import iconFullscreen from '@/assets/icons/lucide_fullscreen.svg';
import iconPlay from '@/assets/icons/lucide_play.svg';
import iconRefreshCcw from '@/assets/icons/lucide_refresh-ccw.svg';
import iconVolume from '@/assets/icons/lucide_volume-2.svg';
import iconPracticumClose from '@/assets/icons/lucide_x.svg';
import iconCurrentLessonIndicator from '@/assets/icons/player-current-indicator.svg';
import iconResultPassCheck from '@/assets/icons/player-result-pass-check.svg';
import Modal from '@/components/overlay/Modal/Modal';
import ProblemReportModal from '@/components/problemReport/ProblemReportModal';
import { resolveProblemTargetScore } from '@/components/problemReport/problemReportUtils';
import ProgramQnaPanel from '@/components/qna/ProgramQnaPanel';
import Button from '@/components/ui/Button/Button';
import { getPlayerMockQueryKeySegment } from '@/mocks/player/runtime';
import {
  myEnrollmentPracticumQueryKey,
  myLearningPlayerQueryKey,
  useMyEnrollmentPracticumQuery,
  useMyLearningPlayerSnapshotQuery,
} from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type {
  LearningPlayerLessonProgress,
  LearningPlayerResourceAttachment,
  ProtectedLectureStream,
} from '@/types/mypage';
import type { PracticumReservation, PracticumSlot } from '@/types/practicum';
import type {
  StudentProblem,
  StudentProblemAttemptReport,
  StudentProblemAttemptResult,
} from '@/types/studentProblems';
import { classNames } from '@/utils/classNames';
import { getOrCreatePlaybackDeviceId } from '@/utils/playbackDeviceId';
import {
  calendarWeekdays,
  formatDate,
  formatMonthLabel,
  formatTimeRange,
  getSlotDateKey,
  toDateInputValue,
  toMonthValue,
} from '@/utils/practicumCalendar';

import {
  flattenLessons,
  flattenPlayerItems,
  formatDateRange,
  formatSeconds,
  getDefaultPlayerItemId,
} from '../LearningPage/learningShared';

import {
  buildFixedPlayerCalendarCells,
  buildMonthValue,
  buildPlaybackRequestPrefix,
  buildOfflineScheduleEntries,
  buildQualityOptions,
  clampQuestionIndex,
  createProtectedHlsLoader,
  formatPlaybackWatermarkText,
  formatPracticumModalDate,
  formatQuizQuestionLabel,
  formatResourceFileSize,
  formatResourceFileTypeLabel,
  formatResourceUpdatedDate,
  formatSelectedQuizAnswerLabel,
  getLessonMetaItems,
  getLessonSummaryActionLabel,
  getMonthYear,
  getOfflineSidebarState,
  getPracticumDefaultMonthValue,
  getPracticumDefaultSelectedDate,
  getPracticumReservationKind,
  getQuizSidebarStatusLabel,
  isPracticumSlotReservable,
  normalizeProtectedHlsKeyUrl,
  normalizeQuizAnswers,
  resolveLessonResourceAttachments,
  resolvePracticumLessonBadgeLabel,
  resolvePracticumSidebarState,
  resolveQuizElapsedSeconds,
  shiftMonthValue,
  shiftMonthYear,
  sortPracticumSlots,
} from './PlayerPage.helpers';
import type { OfflineScheduleEntry, PendingPracticumSlot } from './PlayerPage.helpers';
import styles from './PlayerPage.module.scss';
import {
  DEFAULT_QUALITY_OPTIONS,
  LESSON_TYPE_LABELS,
  MONTH_OPTIONS,
  PLAYER_CONTROLS_AUTO_HIDE_MS,
  PLAYER_LESSON_TYPE_LABELS,
  PLAYBACK_SPEED_OPTIONS,
  PROBLEM_SESSION_SAVE_INTERVAL_SECONDS,
  PROGRESS_EXIT_SAVE_MIN_DELTA_SECONDS,
  PROGRESS_SAVE_INTERVAL_SECONDS,
  PROGRESS_SAVE_MIN_DELTA_SECONDS,
} from './PlayerPage.types';
import type {
  LessonStatusStyle,
  PlayerIconStyle,
  QualityOption,
  QuizClockAnchor,
  QuizSidebarPanel,
  SettingsPanel,
  SidebarPanel,
} from './PlayerPage.types';

const buildPlayerIconStyle = (iconSrc: string): PlayerIconStyle => ({
  '--player-icon': `url("${iconSrc}")`,
});

const playerArrowLeftIconStyle = buildPlayerIconStyle(iconArrowLeft);
const playerChevronDownIconStyle = buildPlayerIconStyle(iconChevronDown);
const playerPlayIconStyle = buildPlayerIconStyle(iconPlay);
const playerVolumeIconStyle = buildPlayerIconStyle(iconVolume);
const playerFullscreenIconStyle = buildPlayerIconStyle(iconFullscreen);
const playerFolderOpenIconStyle = buildPlayerIconStyle(iconFolderOpen);
const playerCurrentLessonIndicatorStyle = buildPlayerIconStyle(iconCurrentLessonIndicator);
const playerArrowDownToLineIconStyle = buildPlayerIconStyle(iconArrowDownToLine);
const playerRefreshCcwIconStyle = buildPlayerIconStyle(iconRefreshCcw);
const playerResultPassCheckIconStyle = buildPlayerIconStyle(iconResultPassCheck);
const playerResultRetryNeededIconStyle = buildPlayerIconStyle(iconResultRetryNeeded);

const PLAYBACK_WATERMARK_POSITIONS = [
  'bottom-right',
  'top-left',
  'center',
  'bottom-left',
  'top-right',
] as const;
const PLAYBACK_WATERMARK_POSITION_INTERVAL_MS = 37_000;
const PLAYBACK_WATERMARK_CLOCK_INTERVAL_MS = 30_000;
const PLAYBACK_WATERMARK_EMPHASIS_INTERVAL_MS = 120_000;
const PLAYBACK_WATERMARK_EMPHASIS_DURATION_MS = 2_600;
const formatPlaybackWatermarkTimestamp = (date: Date) => {
  const padTwoDigits = (value: number) => String(value).padStart(2, '0');

  return `${padTwoDigits(date.getFullYear() % 100)}${padTwoDigits(date.getMonth() + 1)}${padTwoDigits(
    date.getDate(),
  )} ${padTwoDigits(date.getHours())}:${padTwoDigits(date.getMinutes())}`;
};

const formatQuizPercent = (value: number): string => {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const resolvePlaybackCookieRefreshDelayMs = (expiresAt: number): number => {
  const refreshBeforeExpiryMs = 60_000;
  const minimumDelayMs = 30_000;
  return Math.max(minimumDelayMs, expiresAt * 1000 - Date.now() - refreshBeforeExpiryMs);
};

interface QuizProtectedVideoProps {
  alt: string;
  className: string;
  deviceId: string;
  lectureId: number;
  videoId: number;
}

const QuizProtectedVideo = ({
  alt,
  className,
  deviceId,
  lectureId,
  videoId,
}: QuizProtectedVideoProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [watermarkClock, setWatermarkClock] = useState(new Date());
  const [cookieExpiresAt, setCookieExpiresAt] = useState<number | null>(null);
  const [watermarkPositionIndex, setWatermarkPositionIndex] = useState(0);
  const [isWatermarkEmphasized, setIsWatermarkEmphasized] = useState(false);
  const streamQuery = useQuery<ProtectedLectureStream>({
    queryKey: [
      'problem-video-stream',
      lectureId,
      videoId,
      deviceId,
      getPlayerMockQueryKeySegment(),
    ],
    queryFn: () => fetchProblemVideoStream(lectureId, videoId, deviceId),
    retry: false,
  });
  const stream = streamQuery.data ?? null;
  const watermarkText = formatPlaybackWatermarkText(stream?.playbackWatermarkText);
  const watermarkTimestamp = formatPlaybackWatermarkTimestamp(watermarkClock);
  const watermarkCompactText = watermarkText ? `${watermarkText} · ${watermarkTimestamp}` : '';
  const watermarkPosition =
    PLAYBACK_WATERMARK_POSITIONS[watermarkPositionIndex % PLAYBACK_WATERMARK_POSITIONS.length];

  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      setCookieExpiresAt(stream?.expiresAt ?? null);
    }, 0);

    return () => {
      window.clearTimeout(syncTimer);
    };
  }, [stream?.expiresAt, stream?.playbackSessionToken]);

  useEffect(() => {
    if (!stream?.playbackSessionToken || cookieExpiresAt === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshProblemVideoStreamCookies(
        lectureId,
        videoId,
        deviceId,
        stream.playbackSessionToken,
      )
        .then((response) => {
          setCookieExpiresAt(response.expiresAt);
        })
        .catch(() => {
          setCookieExpiresAt(null);
        });
    }, resolvePlaybackCookieRefreshDelayMs(cookieExpiresAt));

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [cookieExpiresAt, deviceId, lectureId, stream?.playbackSessionToken, videoId]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setWatermarkPositionIndex(0);
      setWatermarkClock(new Date());
      setIsWatermarkEmphasized(false);
    }, 0);

    if (!stream?.playbackWatermarkText) {
      return () => {
        window.clearTimeout(resetTimer);
      };
    }

    const positionTimer = window.setInterval(() => {
      setWatermarkPositionIndex((current) => current + 1);
    }, PLAYBACK_WATERMARK_POSITION_INTERVAL_MS);
    const clockTimer = window.setInterval(() => {
      setWatermarkClock(new Date());
    }, PLAYBACK_WATERMARK_CLOCK_INTERVAL_MS);
    let emphasisTimeoutId: number | null = null;
    const emphasisTimer = window.setInterval(() => {
      setIsWatermarkEmphasized(true);
      if (emphasisTimeoutId !== null) {
        window.clearTimeout(emphasisTimeoutId);
      }
      emphasisTimeoutId = window.setTimeout(() => {
        setIsWatermarkEmphasized(false);
      }, PLAYBACK_WATERMARK_EMPHASIS_DURATION_MS);
    }, PLAYBACK_WATERMARK_EMPHASIS_INTERVAL_MS);

    return () => {
      window.clearTimeout(resetTimer);
      window.clearInterval(positionTimer);
      window.clearInterval(clockTimer);
      window.clearInterval(emphasisTimer);
      if (emphasisTimeoutId !== null) {
        window.clearTimeout(emphasisTimeoutId);
      }
    };
  }, [stream?.playbackSessionToken, stream?.playbackWatermarkText]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const playbackSessionToken = stream?.playbackSessionToken ?? '';
    const selectedHlsKeyUrl = normalizeProtectedHlsKeyUrl(stream?.hlsKeyUrl ?? '');
    const selectedStreamUrl = stream?.hlsUrl ?? '';
    const playbackRequestPrefix = buildPlaybackRequestPrefix(selectedStreamUrl);

    if (!videoElement || !selectedStreamUrl || !Hls.isSupported()) {
      return;
    }

    const ProtectedLoader = createProtectedHlsLoader(selectedHlsKeyUrl);
    const hls = new Hls({
      enableWorker: true,
      loader: ProtectedLoader,
      xhrSetup: (xhr, url) => {
        xhr.withCredentials = true;
        const isKeyRequest = url === selectedHlsKeyUrl;
        const isProtectedPlaybackRequest =
          playbackRequestPrefix !== null && url.startsWith(playbackRequestPrefix);

        if (isKeyRequest || isProtectedPlaybackRequest) {
          xhr.setRequestHeader('X-Playback-Session-Token', playbackSessionToken);
          xhr.setRequestHeader('X-Playback-Device-Id', deviceId);
        }
      },
    });
    hls.loadSource(selectedStreamUrl);
    hls.attachMedia(videoElement);

    return () => {
      videoElement.removeAttribute('src');
      hls.destroy();
    };
  }, [deviceId, stream?.hlsKeyUrl, stream?.hlsUrl, stream?.playbackSessionToken]);

  return (
    <div className={classNames(styles['quizVideoFrame'], className)}>
      <video
        aria-label={alt}
        className={styles['quizVideoElement']}
        controls
        controlsList='nodownload noremoteplayback'
        disablePictureInPicture
        disableRemotePlayback
        playsInline
        preload='metadata'
        ref={videoRef}
      />
      {streamQuery.isLoading ? (
        <div className={styles['quizVideoOverlay']}>영상 준비 중</div>
      ) : null}
      {streamQuery.isError ? (
        <div className={styles['quizVideoOverlay']}>영상을 불러오지 못했습니다.</div>
      ) : null}
      {watermarkCompactText ? (
        <>
          <div
            aria-hidden='true'
            className={styles['playbackWatermark']}
            data-position={watermarkPosition}
          >
            {watermarkCompactText}
          </div>
          <div
            aria-hidden='true'
            className={styles['playbackWatermarkEmphasis']}
            data-visible={isWatermarkEmphasized}
          >
            {watermarkCompactText}
          </div>
        </>
      ) : null}
    </div>
  );
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
  const hasPracticumLesson = useMemo(() => {
    return lessons.some((lesson) => lesson.deliveryType === 'practicum');
  }, [lessons]);
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
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<SettingsPanel | null>(null);
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<SidebarPanel>('curriculum');
  const [activeQuizSidebarPanel, setActiveQuizSidebarPanel] =
    useState<QuizSidebarPanel>('curriculum');
  const [isQnaDetailActive, setIsQnaDetailActive] = useState(false);
  const [isQuizQnaDetailActive, setIsQuizQnaDetailActive] = useState(false);
  const [mediaDurationSeconds, setMediaDurationSeconds] = useState(0);
  const [currentPlaybackSeconds, setCurrentPlaybackSeconds] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [arePlayerControlsVisible, setArePlayerControlsVisible] = useState(true);
  const [playbackWatermarkPositionIndex, setPlaybackWatermarkPositionIndex] = useState(0);
  const [playbackWatermarkClock, setPlaybackWatermarkClock] = useState(() => new Date());
  const [isPlaybackWatermarkEmphasized, setIsPlaybackWatermarkEmphasized] = useState(false);
  const [lecturePlaybackCookieExpiresAt, setLecturePlaybackCookieExpiresAt] = useState<
    number | null
  >(null);
  const [progressSaveError, setProgressSaveError] = useState<string | null>(null);
  const [lessonProgressByLessonId, setLessonProgressByLessonId] = useState<
    Partial<Record<string, LearningPlayerLessonProgress>>
  >({});
  const [expandedCurriculumSectionIds, setExpandedCurriculumSectionIds] = useState<Set<string>>(
    new Set(),
  );
  const [quizAttemptedLessonIds, setQuizAttemptedLessonIds] = useState<Set<string>>(new Set());
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number[]>>({});
  const [quizFlaggedQuestionIds, setQuizFlaggedQuestionIds] = useState<Set<number>>(new Set());
  const [quizCurrentQuestionIndex, setQuizCurrentQuestionIndex] = useState(0);
  const [isQuizQuestionListExpanded, setIsQuizQuestionListExpanded] = useState(true);
  const [quizClockAnchor, setQuizClockAnchor] = useState<QuizClockAnchor | null>(null);
  const [quizClockNowMs, setQuizClockNowMs] = useState(() => Date.now());
  const [quizElapsedSeconds, setQuizElapsedSeconds] = useState(0);
  const [isQuizSessionStartLocked, setIsQuizSessionStartLocked] = useState(false);
  const [quizAttemptResult, setQuizAttemptResult] = useState<StudentProblemAttemptResult | null>(
    null,
  );
  const [problemReport, setProblemReport] = useState<StudentProblemAttemptReport | null>(null);
  const [quizReviewMode, setQuizReviewMode] = useState(false);
  const [pendingPracticumSlot, setPendingPracticumSlot] = useState<PendingPracticumSlot | null>(
    null,
  );
  const [practicumMonthValue, setPracticumMonthValue] = useState(() => toMonthValue(new Date()));
  const [practicumSelectedDateValue, setPracticumSelectedDateValue] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [isPracticumMonthPickerOpen, setIsPracticumMonthPickerOpen] = useState(false);
  const [offlineCalendarMonthValue, setOfflineCalendarMonthValue] = useState(() =>
    toMonthValue(new Date()),
  );
  const [isOfflineMonthPickerOpen, setIsOfflineMonthPickerOpen] = useState(false);
  const hlsRef = useRef<Hls | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const practicumMonthPickerRef = useRef<HTMLDivElement | null>(null);
  const offlineMonthPickerRef = useRef<HTMLDivElement | null>(null);
  const curriculumSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const lastSavedProgressRef = useRef<Record<number, number>>({});
  const saveInFlightRef = useRef<Record<number, boolean>>({});
  const progressTimerRef = useRef<number | null>(null);
  const playerControlsHideTimerRef = useRef<number | null>(null);
  const quizElapsedTimerRef = useRef<number | null>(null);
  const quizSessionDirtyRef = useRef(false);
  const quizSessionSaveInFlightRef = useRef(false);
  const quizAutoSubmitTriggeredRef = useRef(false);
  const quizSessionStartLockedRef = useRef(false);
  const defaultPlayerItemId = getDefaultPlayerItemId(snapshot, playerItems);
  const resolvedItemId = playerItems.some((item) => item.id === params.lessonId)
    ? params.lessonId
    : defaultPlayerItemId;
  const selectedItem = resolvedItemId
    ? playerItems.find((item) => item.id === resolvedItemId) || null
    : null;
  const selectedLesson = selectedItem?.lesson ?? null;

  const clearPlayerControlsHideTimer = useCallback(() => {
    if (playerControlsHideTimerRef.current !== null) {
      window.clearTimeout(playerControlsHideTimerRef.current);
      playerControlsHideTimerRef.current = null;
    }
  }, []);

  const schedulePlayerControlsHide = useCallback(() => {
    clearPlayerControlsHideTimer();

    if (!isVideoPlaying || activeSettingsPanel !== null) {
      return;
    }

    playerControlsHideTimerRef.current = window.setTimeout(() => {
      setArePlayerControlsVisible(false);
      playerControlsHideTimerRef.current = null;
    }, PLAYER_CONTROLS_AUTO_HIDE_MS);
  }, [activeSettingsPanel, clearPlayerControlsHideTimer, isVideoPlaying]);

  const revealPlayerControls = useCallback(() => {
    setArePlayerControlsVisible(true);
    schedulePlayerControlsHide();
  }, [schedulePlayerControlsHide]);

  const hidePlayerControlsForPlayback = useCallback(() => {
    clearPlayerControlsHideTimer();

    if (!isVideoPlaying || activeSettingsPanel !== null) {
      setArePlayerControlsVisible(true);
      return;
    }

    setArePlayerControlsVisible(false);
  }, [activeSettingsPanel, clearPlayerControlsHideTimer, isVideoPlaying]);
  const releaseQuizSessionStartLock = useCallback(() => {
    quizSessionStartLockedRef.current = false;
    setIsQuizSessionStartLocked(false);
  }, []);
  const completedLessonIds = useMemo(() => {
    const lessonIds = new Set(snapshot?.completedLessonIds ?? []);
    Object.entries(lessonProgressByLessonId)
      .filter(([lessonId, progress]) => {
        if (progress?.completed !== true) {
          return false;
        }
        const lesson = lessons.find((item) => item.id === lessonId);
        return lesson?.deliveryType !== 'offline';
      })
      .forEach(([lessonId]) => {
        lessonIds.add(lessonId);
      });
    return lessonIds;
  }, [lessonProgressByLessonId, lessons, snapshot?.completedLessonIds]);
  const lockedLessonIds = useMemo(() => {
    return new Set<string>();
  }, []);
  const selectedSource = selectedLesson
    ? snapshot?.lessonPlaybackById[selectedLesson.id] || null
    : null;
  const selectedItemLocked = selectedLesson ? lockedLessonIds.has(selectedLesson.id) : false;
  const isQuizLesson = selectedLesson?.deliveryType === 'problem';
  const isPracticumLesson = selectedLesson?.deliveryType === 'practicum';
  const isResourceLesson = selectedLesson?.deliveryType === 'resource';
  const isQuizMode = Boolean(selectedItem) && isQuizLesson && !selectedItemLocked;
  const isLessonItem = selectedItem?.kind === 'lesson';
  const selectedLectureId = selectedSource?.lectureId ?? null;
  const selectedLessonProgress = selectedLesson
    ? (lessonProgressByLessonId[selectedLesson.id] ?? null)
    : null;
  const selectedLessonHasStream =
    isLessonItem &&
    !selectedItemLocked &&
    selectedLesson?.deliveryType === 'online' &&
    selectedSource?.mimeType === 'application/x-mpegURL';
  const shouldResumeCurrentLesson =
    isLessonItem &&
    !selectedItemLocked &&
    selectedLesson?.id === snapshot?.currentLessonId &&
    (snapshot?.resumeAtSeconds || 0) > 0;
  const totalLessonCount = lessons.length;
  const completedLessonCount = completedLessonIds.size;
  const completedRatio =
    totalLessonCount > 0 ? Math.round((completedLessonCount / totalLessonCount) * 100) : 0;
  const isUnsupportedPlayback = isLessonItem && selectedLessonHasStream && !supportsHlsPlayback;
  const curriculumPanelTitle =
    enrollmentState?.programTitle || snapshot?.curriculumTrack.title || '프로그램';
  const activeLectureId =
    enrollmentState?.active &&
    isLessonItem &&
    !selectedItemLocked &&
    selectedLesson?.deliveryType === 'online' &&
    selectedSource !== null &&
    selectedSource.mimeType === 'application/x-mpegURL'
      ? selectedSource.lectureId
      : null;
  const lectureStreamQuery = useQuery<ProtectedLectureStream>({
    queryKey: ['lecture-stream', activeLectureId, playbackDeviceId, getPlayerMockQueryKeySegment()],
    queryFn: () => fetchLectureStream(activeLectureId as number, playbackDeviceId),
    enabled: activeLectureId !== null && supportsHlsPlayback,
    retry: false,
  });
  const protectedStream = lectureStreamQuery.data ?? null;
  const playbackWatermarkText = formatPlaybackWatermarkText(protectedStream?.playbackWatermarkText);
  const playbackWatermarkTimestamp = formatPlaybackWatermarkTimestamp(playbackWatermarkClock);
  const playbackWatermarkCompactText = playbackWatermarkText
    ? `${playbackWatermarkText} · ${playbackWatermarkTimestamp}`
    : '';
  const playbackWatermarkDetailText = playbackWatermarkCompactText;
  const playbackWatermarkPosition =
    PLAYBACK_WATERMARK_POSITIONS[
      playbackWatermarkPositionIndex % PLAYBACK_WATERMARK_POSITIONS.length
    ];
  const quizQuery = useQuery<StudentProblem | null>({
    queryKey: ['student-problem', selectedLectureId],
    queryFn: () => fetchStudentProblem(selectedLectureId as number),
    enabled: selectedLectureId !== null && isQuizMode,
    retry: false,
  });
  const practicumOverviewQuery = useMyEnrollmentPracticumQuery(
    isValidEnrollmentId ? resolvedEnrollmentId : null,
    isValidEnrollmentId && hasPracticumLesson,
  );

  useEffect(() => {
    setLecturePlaybackCookieExpiresAt(protectedStream?.expiresAt ?? null);
  }, [protectedStream?.expiresAt, protectedStream?.playbackSessionToken]);

  useEffect(() => {
    if (
      activeLectureId === null ||
      !protectedStream?.playbackSessionToken ||
      lecturePlaybackCookieExpiresAt === null
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshLectureStreamCookies(
        activeLectureId,
        playbackDeviceId,
        protectedStream.playbackSessionToken,
      )
        .then((response) => {
          setLecturePlaybackCookieExpiresAt(response.expiresAt);
        })
        .catch(() => {
          setLecturePlaybackCookieExpiresAt(null);
        });
    }, resolvePlaybackCookieRefreshDelayMs(lecturePlaybackCookieExpiresAt));

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeLectureId,
    lecturePlaybackCookieExpiresAt,
    playbackDeviceId,
    protectedStream?.playbackSessionToken,
  ]);
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
    }) => saveStudentProblemSession(quizId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제 풀이 상태를 저장하지 못했습니다.',
        variant: 'error',
      });
    },
  });
  const applyQuizSession = useCallback(
    (session: NonNullable<StudentProblem['session']>) => {
      const nowMs = Date.now();
      const nextClockAnchor: QuizClockAnchor = {
        elapsedSeconds: session.elapsedSeconds,
        receivedAtMs: nowMs,
        remainingSeconds: session.remainingSeconds,
        startedAt: session.startedAt,
      };

      setQuizAnswers(session.answers);
      setQuizFlaggedQuestionIds(new Set(session.flaggedQuestionIds));
      setQuizCurrentQuestionIndex(
        clampQuestionIndex(session.currentQuestionIndex, quizQuery.data?.questions.length ?? 0),
      );
      setQuizClockAnchor(nextClockAnchor);
      setQuizClockNowMs(nowMs);
      setQuizElapsedSeconds(
        resolveQuizElapsedSeconds(
          nextClockAnchor,
          quizQuery.data?.timeLimitSeconds ?? selectedLesson?.problemTimeLimitSeconds ?? null,
          nowMs,
          session.elapsedSeconds,
        ),
      );
      setQuizAttemptResult(null);
      setQuizReviewMode(false);
      quizSessionDirtyRef.current = false;
      quizAutoSubmitTriggeredRef.current = false;
    },
    [
      quizQuery.data?.questions.length,
      quizQuery.data?.timeLimitSeconds,
      selectedLesson?.problemTimeLimitSeconds,
    ],
  );
  const startQuizSessionMutation = useMutation({
    mutationFn: (quizId: number) => startStudentProblemSession(quizId),
    onError: (error: unknown) => {
      releaseQuizSessionStartLock();
      showToast({
        message: error instanceof Error ? error.message : '문제 풀이를 시작하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (session) => {
      if (session.status === 'SUBMITTED') {
        setQuizClockAnchor(null);
        setQuizReviewMode(false);
        queryClient.setQueryData<StudentProblem | null>(
          ['student-problem', selectedLectureId],
          (current) => (current ? { ...current, session } : current),
        );
        showToast({
          message: '이미 제출한 문제입니다.',
          variant: 'info',
        });
        releaseQuizSessionStartLock();
        return;
      }

      applyQuizSession(session);
      queryClient.setQueryData<StudentProblem | null>(
        ['student-problem', selectedLectureId],
        (current) => (current ? { ...current, latestAttempt: null, session } : current),
      );
      showToast({
        message: '문제 풀이를 시작했습니다.',
        variant: 'success',
      });
    },
  });
  const submitQuizMutation = useMutation({
    mutationFn: ({
      answers,
      elapsedSeconds,
      quizId,
    }: {
      answers: Record<number, number[]>;
      elapsedSeconds: number;
      quizId: number;
    }) => submitStudentProblem(quizId, { answers, elapsedSeconds }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제 제출에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (result) => {
      if (selectedLesson?.id) {
        setQuizAttemptedLessonIds((current) => new Set([...current, selectedLesson.id]));
      }
      releaseQuizSessionStartLock();
      quizSessionDirtyRef.current = false;
      void queryClient.invalidateQueries({
        queryKey: myLearningPlayerQueryKey(resolvedEnrollmentId),
      });
      queryClient.setQueryData<StudentProblem | null>(
        ['student-problem', selectedLectureId],
        (current) =>
          current
            ? {
                ...current,
                latestAttempt: result,
                session: current.session
                  ? {
                      ...current.session,
                      answers: normalizeQuizAnswers(quizAnswers),
                      elapsedSeconds: Math.max(0, quizEffectiveElapsedSeconds),
                      remainingSeconds: 0,
                      status: 'SUBMITTED',
                    }
                  : current.session,
              }
            : current,
      );
      setQuizAttemptResult(result);
      setQuizReviewMode(false);
      showToast({
        message: result.passed ? '문제를 통과했습니다.' : '문제 제출을 완료했습니다.',
        variant: 'success',
      });
    },
  });
  const printProblemReportMutation = useMutation({
    mutationFn: fetchStudentProblemAttemptReport,
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '결과 리포트를 불러오지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (report) => {
      setProblemReport(report);
    },
  });
  const reservePracticumMutation = useMutation({
    mutationFn: ({ lectureId, startAt }: { lectureId: number; startAt: string }) =>
      reserveMyLecturePracticum(resolvedEnrollmentId, startAt, lectureId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 예약에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setPendingPracticumSlot(null);
      await queryClient.invalidateQueries({
        queryKey: myEnrollmentPracticumQueryKey(resolvedEnrollmentId),
      });
      showToast({
        message: '실습 예약을 완료했습니다.',
        variant: 'success',
      });
    },
  });
  const cancelPracticumMutation = useMutation({
    mutationFn: (reservationId: number) =>
      cancelMyLecturePracticum(resolvedEnrollmentId, reservationId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 예약 취소에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setPendingPracticumSlot(null);
      await queryClient.invalidateQueries({
        queryKey: myEnrollmentPracticumQueryKey(resolvedEnrollmentId),
      });
      showToast({
        message: '실습 예약을 취소했습니다.',
        variant: 'success',
      });
    },
  });
  const movePracticumMutation = useMutation({
    mutationFn: ({ reservationId, startAt }: { reservationId: number; startAt: string }) =>
      moveMyLecturePracticum(resolvedEnrollmentId, reservationId, startAt),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 예약 일정을 변경하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setPendingPracticumSlot(null);
      await queryClient.invalidateQueries({
        queryKey: myEnrollmentPracticumQueryKey(resolvedEnrollmentId),
      });
      showToast({
        message: '실습 예약 일정을 변경했습니다.',
        variant: 'success',
      });
    },
  });
  const offlineAttendanceMutation = useMutation({
    mutationFn: ({ absent, ruleId }: { absent: boolean; ruleId: number }) =>
      updateMyOfflineScheduleAbsence(resolvedEnrollmentId, ruleId, absent),
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error ? error.message : '오프라인 참석 상태를 저장하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: myLearningPlayerQueryKey(resolvedEnrollmentId),
      });
      showToast({
        message: variables.absent
          ? '오프라인 강의를 불참으로 표시했습니다.'
          : '불참 표시를 취소했습니다.',
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
  const playerDurationSeconds =
    mediaDurationSeconds > 0
      ? mediaDurationSeconds
      : Math.max(0, (selectedLesson?.durationMinutes ?? 0) * 60);
  const playerProgressRatio =
    playerDurationSeconds > 0
      ? Math.min(100, Math.max(0, (currentPlaybackSeconds / playerDurationSeconds) * 100))
      : 0;
  const shouldShowPlayerPoster = Boolean(selectedSource?.posterUrl) && !hasStartedPlayback;
  const qnaContext = snapshot?.qnaContext ?? null;
  const qnaProgramId = enrollmentState?.programId ?? qnaContext?.programId ?? null;
  const resourceProgramId = enrollmentState?.programId ?? null;
  const practicumLectures = useMemo(() => {
    return practicumOverviewQuery.data?.lectures ?? [];
  }, [practicumOverviewQuery.data?.lectures]);
  const selectedPracticumLecture =
    selectedLectureId === null
      ? null
      : (practicumLectures.find((lecture) => lecture.lectureId === selectedLectureId) ?? null);
  const practicumCurrentReservation = selectedPracticumLecture?.currentReservation ?? null;
  const practicumLectureByLectureId = useMemo(() => {
    return new Map(practicumLectures.map((lecture) => [lecture.lectureId, lecture]));
  }, [practicumLectures]);
  const selectedPracticumReservations = useMemo(() => {
    return selectedPracticumLecture?.currentReservations ?? [];
  }, [selectedPracticumLecture?.currentReservations]);
  const scheduledPracticumReservations = useMemo(() => {
    return selectedPracticumReservations.filter(
      (reservation) => getPracticumReservationKind(reservation) === 'scheduled',
    );
  }, [selectedPracticumReservations]);
  const noShowPracticumReservations = useMemo(() => {
    return selectedPracticumReservations.filter(
      (reservation) => getPracticumReservationKind(reservation) === 'noshow',
    );
  }, [selectedPracticumReservations]);
  const practicumReservationDateKeys = useMemo(() => {
    return new Set(
      scheduledPracticumReservations.map((reservation) => getSlotDateKey(reservation.startAt)),
    );
  }, [scheduledPracticumReservations]);
  const practicumReservationsByDate = useMemo(() => {
    const grouped = new Map<string, PracticumReservation[]>();

    scheduledPracticumReservations.forEach((reservation) => {
      const dateKey = getSlotDateKey(reservation.startAt);
      const current = grouped.get(dateKey);
      if (current) {
        current.push(reservation);
      } else {
        grouped.set(dateKey, [reservation]);
      }
    });

    return grouped;
  }, [scheduledPracticumReservations]);
  const practicumNoShowReservationsByDate = useMemo(() => {
    const grouped = new Map<string, PracticumReservation[]>();

    noShowPracticumReservations.forEach((reservation) => {
      const dateKey = getSlotDateKey(reservation.startAt);
      const current = grouped.get(dateKey);
      if (current) {
        current.push(reservation);
      } else {
        grouped.set(dateKey, [reservation]);
      }
    });

    return grouped;
  }, [noShowPracticumReservations]);
  const practicumCalendarCells = useMemo(() => {
    return buildFixedPlayerCalendarCells(practicumMonthValue);
  }, [practicumMonthValue]);
  const practicumSlotsByDate = useMemo(() => {
    const grouped = new Map<string, PracticumSlot[]>();

    sortPracticumSlots(selectedPracticumLecture?.slots ?? []).forEach((slot) => {
      const dateKey = getSlotDateKey(slot.startAt);
      const current = grouped.get(dateKey);
      if (current) {
        current.push(slot);
      } else {
        grouped.set(dateKey, [slot]);
      }
    });

    return grouped;
  }, [selectedPracticumLecture]);
  const practicumSelectedDate = practicumSelectedDateValue.startsWith(practicumMonthValue)
    ? practicumSelectedDateValue
    : `${practicumMonthValue}-01`;
  const practicumSelectedDateSlots = practicumSlotsByDate.get(practicumSelectedDate) ?? [];
  const selectedPendingPracticumStartAt = pendingPracticumSlot?.slot.startAt ?? null;
  const currentPracticumReservationKind = practicumCurrentReservation
    ? getPracticumReservationKind(practicumCurrentReservation)
    : null;
  const activeScheduledReservation =
    practicumCurrentReservation && currentPracticumReservationKind === 'scheduled'
      ? practicumCurrentReservation
      : null;
  const isPracticumMutationPending =
    reservePracticumMutation.isPending ||
    cancelPracticumMutation.isPending ||
    movePracticumMutation.isPending;
  const updatePracticumMonth = useCallback((nextMonthValue: string) => {
    setPracticumMonthValue(nextMonthValue);
    setPracticumSelectedDateValue((current) =>
      current.startsWith(nextMonthValue) ? current : `${nextMonthValue}-01`,
    );
  }, []);
  const updateOfflineMonth = useCallback((nextMonthValue: string) => {
    setOfflineCalendarMonthValue(nextMonthValue);
  }, []);
  const practicumSidebarStatesByLessonId = useMemo(() => {
    const entries = lessons
      .filter((lesson) => lesson.deliveryType === 'practicum')
      .map((lesson) => {
        const lectureId =
          snapshot?.lessonPlaybackById[lesson.id]?.lectureId ?? lesson.lectureId ?? null;
        const sidebarState =
          lectureId === null
            ? null
            : resolvePracticumSidebarState(practicumLectureByLectureId.get(lectureId) ?? null);
        return [lesson.id, sidebarState] as const;
      });

    return new Map(entries);
  }, [lessons, practicumLectureByLectureId, snapshot?.lessonPlaybackById]);
  const isOfflineLesson = selectedLesson?.deliveryType === 'offline';
  const lessonResourceAttachments = useMemo(
    () => resolveLessonResourceAttachments(snapshot, selectedLesson),
    [selectedLesson, snapshot],
  );
  const offlineScheduleEntries = useMemo(
    () => buildOfflineScheduleEntries(selectedLesson),
    [selectedLesson],
  );
  const offlineScheduleEntriesByDate = useMemo(() => {
    const grouped = new Map<string, OfflineScheduleEntry[]>();

    offlineScheduleEntries.forEach((entry) => {
      if (!entry.date) {
        return;
      }

      const current = grouped.get(entry.date);

      if (current) {
        current.push(entry);
      } else {
        grouped.set(entry.date, [entry]);
      }
    });

    return grouped;
  }, [offlineScheduleEntries]);
  const firstOfflineDate =
    offlineScheduleEntries.find((entry) => entry.date)?.date ?? selectedLesson?.startDate ?? null;
  const offlineCalendarCells = useMemo(() => {
    return buildFixedPlayerCalendarCells(offlineCalendarMonthValue);
  }, [offlineCalendarMonthValue]);

  useEffect(() => {
    if (!selectedPracticumLecture) {
      return;
    }

    const defaultMonthValue = getPracticumDefaultMonthValue(selectedPracticumLecture);
    setPracticumMonthValue(defaultMonthValue);
    setPracticumSelectedDateValue(
      getPracticumDefaultSelectedDate(selectedPracticumLecture, defaultMonthValue),
    );
  }, [selectedPracticumLecture]);

  useEffect(() => {
    if (!isOfflineLesson) {
      return;
    }

    setOfflineCalendarMonthValue(
      firstOfflineDate ? firstOfflineDate.slice(0, 7) : toMonthValue(new Date()),
    );
    setIsOfflineMonthPickerOpen(false);
  }, [firstOfflineDate, isOfflineLesson, selectedLesson?.id]);

  const quizQuestions = useMemo(() => quizQuery.data?.questions ?? [], [quizQuery.data?.questions]);
  const quizTimeLimitSeconds =
    quizQuery.data?.timeLimitSeconds ?? selectedLesson?.problemTimeLimitSeconds ?? null;
  const quizEffectiveElapsedSeconds = resolveQuizElapsedSeconds(
    quizClockAnchor,
    quizTimeLimitSeconds,
    quizClockNowMs,
    quizElapsedSeconds,
  );
  const quizRemainingSeconds =
    quizTimeLimitSeconds && quizTimeLimitSeconds > 0
      ? Math.max(0, quizTimeLimitSeconds - quizEffectiveElapsedSeconds)
      : null;
  const resolvedQuizQuestionIndex = clampQuestionIndex(
    quizCurrentQuestionIndex,
    quizQuestions.length,
  );
  const currentQuizQuestion = quizQuestions[resolvedQuizQuestionIndex] ?? null;
  const quizRemainingTimeLabel =
    quizRemainingSeconds !== null ? formatSeconds(quizRemainingSeconds) : '없음';
  const quizSessionStatus = quizClockAnchor
    ? 'IN_PROGRESS'
    : (quizQuery.data?.session?.status ?? null);
  const isQuizSessionActive = quizSessionStatus === 'IN_PROGRESS' && !quizAttemptResult;
  const shouldShowQuizStartPrompt =
    Boolean(quizQuery.data) &&
    !quizQuery.data?.session &&
    !quizQuery.data?.latestAttempt &&
    !quizAttemptResult;
  const shouldShowSubmittedWithoutResult =
    quizQuery.data?.session?.status === 'SUBMITTED' && !quizAttemptResult;
  const canRetakeQuiz = quizQuery.data?.retakeAllowed ?? false;
  const shouldShowQuizQuestion =
    Boolean(currentQuizQuestion) &&
    (isQuizSessionActive || Boolean(quizAttemptResult && quizReviewMode));
  const shouldShowQuizResultPage = Boolean(quizAttemptResult && !quizReviewMode);
  const shouldShowQuizQuestionNavigator =
    isQuizQuestionListExpanded && Boolean(isQuizSessionActive || quizAttemptResult);
  const shouldShowQuizNavigatorEmptyText =
    isQuizQuestionListExpanded && !isQuizSessionActive && !quizAttemptResult;
  const currentQuizResult = currentQuizQuestion
    ? (quizAttemptResult?.results.find((result) => result.questionId === currentQuizQuestion.id) ??
      null)
    : null;
  const quizQuestionById = useMemo(() => {
    return new Map(quizQuestions.map((question) => [question.id, question]));
  }, [quizQuestions]);
  const quizResultReviewIndex = clampQuestionIndex(
    quizCurrentQuestionIndex,
    quizAttemptResult?.results.length ?? quizQuestions.length,
  );
  const currentQuizReviewResult = quizAttemptResult?.results[quizResultReviewIndex] ?? null;
  const currentQuizReviewQuestion = currentQuizReviewResult
    ? (quizQuestionById.get(currentQuizReviewResult.questionId) ?? null)
    : null;
  const quizResultTotalCount = quizAttemptResult?.results.length ?? quizQuestions.length;
  const quizResultCorrectCount =
    quizAttemptResult?.correctCount ??
    quizAttemptResult?.results.filter((result) => result.correct).length ??
    0;
  const quizResultWrongCount =
    quizAttemptResult?.wrongCount ??
    (quizAttemptResult
      ? Math.max(0, quizAttemptResult.results.length - quizResultCorrectCount)
      : 0);
  const quizResultCorrectRate =
    quizAttemptResult?.correctRate ??
    (quizResultTotalCount > 0
      ? Math.round((quizResultCorrectCount / quizResultTotalCount) * 100)
      : 0);
  const quizResultTargetScore = quizAttemptResult
    ? resolveProblemTargetScore(
        quizAttemptResult.passScore ?? quizQuery.data?.passScore,
        quizAttemptResult.passCorrectCount,
        quizResultTotalCount,
      )
    : 0;

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
    if (!isQuizMode || !quizQuery.data || !isQuizSessionActive) {
      return;
    }

    if (quizRemainingSeconds === 0) {
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
          elapsedSeconds: Math.max(0, quizEffectiveElapsedSeconds),
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
        if (lesson.problemAttempted ?? lesson.quizAttempted) {
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
    setIsQuizQuestionListExpanded(true);
    setQuizClockAnchor(null);
    setQuizClockNowMs(Date.now());
    setQuizElapsedSeconds(0);
    quizSessionDirtyRef.current = false;
    quizAutoSubmitTriggeredRef.current = false;
    releaseQuizSessionStartLock();
    setQuizAttemptResult(null);
    setQuizReviewMode(false);
  }, [releaseQuizSessionStartLock, selectedItem?.id]);

  useEffect(() => {
    if (!quizQuery.data || !isQuizMode) {
      return;
    }

    const session = quizQuery.data.session;
    if (session?.status === 'IN_PROGRESS') {
      applyQuizSession(session);
      return;
    }

    const latestAttempt = quizQuery.data.latestAttempt ?? null;
    const submittedAnswers =
      latestAttempt?.results.reduce<Record<number, number[]>>((answers, result) => {
        answers[result.questionId] = result.submittedOptionIds;
        return answers;
      }, {}) ?? {};
    setQuizAnswers(session?.answers ?? submittedAnswers);
    setQuizFlaggedQuestionIds(new Set(session?.flaggedQuestionIds ?? []));
    setQuizCurrentQuestionIndex(
      clampQuestionIndex(session?.currentQuestionIndex ?? 0, quizQuery.data.questions.length),
    );
    setQuizClockAnchor(null);
    setQuizClockNowMs(Date.now());
    setQuizElapsedSeconds(session?.elapsedSeconds ?? 0);
    setQuizAttemptResult(latestAttempt);
    setQuizReviewMode(false);
    quizSessionDirtyRef.current = false;
    quizAutoSubmitTriggeredRef.current = false;
    releaseQuizSessionStartLock();
  }, [applyQuizSession, isQuizMode, quizQuery.data, releaseQuizSessionStartLock]);

  useEffect(() => {
    if (!isQuizMode || !quizQuery.data || !isQuizSessionActive) {
      return;
    }

    const updateQuizClock = () => {
      const nowMs = Date.now();
      setQuizClockNowMs(nowMs);
      setQuizElapsedSeconds((current) =>
        resolveQuizElapsedSeconds(quizClockAnchor, quizTimeLimitSeconds, nowMs, current),
      );
    };

    updateQuizClock();
    const timerId = window.setInterval(updateQuizClock, 1000);
    quizElapsedTimerRef.current = timerId;

    return () => {
      window.clearInterval(timerId);
      quizElapsedTimerRef.current = null;
    };
  }, [isQuizMode, isQuizSessionActive, quizClockAnchor, quizQuery.data, quizTimeLimitSeconds]);

  useEffect(() => {
    if (
      !isQuizMode ||
      !quizQuery.data ||
      !isQuizSessionActive ||
      submitQuizMutation.isPending ||
      quizRemainingSeconds !== 0 ||
      quizAutoSubmitTriggeredRef.current
    ) {
      return;
    }

    quizAutoSubmitTriggeredRef.current = true;
    submitQuizMutation.mutate({
      answers: normalizeQuizAnswers(quizAnswers),
      elapsedSeconds: Math.max(0, quizEffectiveElapsedSeconds),
      quizId: quizQuery.data.id,
    });
  }, [
    isQuizMode,
    isQuizSessionActive,
    quizAnswers,
    quizEffectiveElapsedSeconds,
    quizQuery.data,
    quizRemainingSeconds,
    submitQuizMutation,
  ]);

  useEffect(() => {
    if (!isQuizMode || !quizQuery.data || !isQuizSessionActive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void persistQuizSession(true);
    }, PROBLEM_SESSION_SAVE_INTERVAL_SECONDS * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isQuizMode, isQuizSessionActive, quizQuery.data]);

  useEffect(() => {
    if (!isQuizMode || !quizQuery.data || !isQuizSessionActive) {
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
    quizAnswers,
    quizCurrentQuestionIndex,
    quizFlaggedQuestionIds,
    isQuizSessionActive,
    quizQuery.data,
  ]);

  useEffect(() => {
    if (!isQuizMode || !quizQuery.data || !isQuizSessionActive) {
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
  }, [isQuizMode, isQuizSessionActive, quizQuery.data]);

  useEffect(() => {
    setProgressSaveError(null);
    setMediaDurationSeconds(0);
    setCurrentPlaybackSeconds(0);
    setIsVideoPlaying(false);
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
    setActiveSettingsPanel(null);
  }, [selectedLesson?.id]);

  useEffect(() => {
    setActiveSidebarPanel('curriculum');
  }, [selectedItem?.id]);

  useEffect(() => {
    setExpandedCurriculumSectionIds(
      new Set(snapshot?.curriculumTrack.sections.map((section) => section.id) ?? []),
    );
  }, [snapshot?.curriculumTrack.sections]);

  const toggleCurriculumSection = useCallback(
    (sectionId: string) => {
      const willOpen = !expandedCurriculumSectionIds.has(sectionId);

      setExpandedCurriculumSectionIds((current) => {
        const next = new Set(current);

        if (next.has(sectionId)) {
          next.delete(sectionId);
        } else {
          next.add(sectionId);
        }

        return next;
      });

      if (willOpen) {
        window.setTimeout(() => {
          curriculumSectionRefs.current[sectionId]?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }, 180);
      }
    },
    [expandedCurriculumSectionIds],
  );

  useEffect(() => {
    if (!activeSettingsPanel) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!settingsPanelRef.current?.contains(event.target as Node)) {
        setActiveSettingsPanel(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveSettingsPanel(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activeSettingsPanel]);

  useEffect(() => {
    if (!isPracticumMonthPickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!practicumMonthPickerRef.current?.contains(event.target as Node)) {
        setIsPracticumMonthPickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPracticumMonthPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isPracticumMonthPickerOpen]);

  useEffect(() => {
    if (!isOfflineMonthPickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!offlineMonthPickerRef.current?.contains(event.target as Node)) {
        setIsOfflineMonthPickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOfflineMonthPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOfflineMonthPickerOpen]);

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
    setPlaybackWatermarkPositionIndex(0);
    setPlaybackWatermarkClock(new Date());
    setIsPlaybackWatermarkEmphasized(false);

    if (!protectedStream?.playbackWatermarkText) {
      return;
    }

    const positionTimer = window.setInterval(() => {
      setPlaybackWatermarkPositionIndex((current) => current + 1);
    }, PLAYBACK_WATERMARK_POSITION_INTERVAL_MS);
    const clockTimer = window.setInterval(() => {
      setPlaybackWatermarkClock(new Date());
    }, PLAYBACK_WATERMARK_CLOCK_INTERVAL_MS);
    let emphasisTimeoutId: number | null = null;
    const emphasisTimer = window.setInterval(() => {
      setIsPlaybackWatermarkEmphasized(true);
      if (emphasisTimeoutId !== null) {
        window.clearTimeout(emphasisTimeoutId);
      }
      emphasisTimeoutId = window.setTimeout(() => {
        setIsPlaybackWatermarkEmphasized(false);
      }, PLAYBACK_WATERMARK_EMPHASIS_DURATION_MS);
    }, PLAYBACK_WATERMARK_EMPHASIS_INTERVAL_MS);

    return () => {
      window.clearInterval(positionTimer);
      window.clearInterval(clockTimer);
      window.clearInterval(emphasisTimer);
      if (emphasisTimeoutId !== null) {
        window.clearTimeout(emphasisTimeoutId);
      }
    };
  }, [protectedStream?.playbackSessionToken, protectedStream?.playbackWatermarkText]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const playbackSessionToken = protectedStream?.playbackSessionToken ?? '';
    const selectedHlsKeyUrl = normalizeProtectedHlsKeyUrl(protectedStream?.hlsKeyUrl ?? '');
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
      setCurrentPlaybackSeconds(videoElement.currentTime || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentPlaybackSeconds(videoElement.currentTime || 0);
    };

    const handleVolumeChange = () => {
      setIsVideoMuted(videoElement.muted || videoElement.volume === 0);
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
      setIsVideoPlaying(false);
      setArePlayerControlsVisible(true);
    };

    const handlePlay = () => {
      setHasStartedPlayback(true);
      setIsVideoPlaying(true);
      scheduleProgressTimer();
    };

    const handleEnded = () => {
      clearProgressTimer();
      setIsVideoPlaying(false);
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
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('volumechange', handleVolumeChange);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('ended', handleEnded);
    window.addEventListener('pagehide', handlePageHide);
    handleVolumeChange();

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
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('volumechange', handleVolumeChange);
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

  useEffect(() => {
    setHasStartedPlayback(false);
  }, [selectedLesson?.id]);

  useEffect(() => {
    if (!selectedLessonHasStream) {
      clearPlayerControlsHideTimer();
      setArePlayerControlsVisible(true);
      return;
    }

    if (!isVideoPlaying || activeSettingsPanel !== null) {
      clearPlayerControlsHideTimer();
      setArePlayerControlsVisible(true);
      return;
    }

    setArePlayerControlsVisible(true);
    schedulePlayerControlsHide();

    return clearPlayerControlsHideTimer;
  }, [
    activeSettingsPanel,
    clearPlayerControlsHideTimer,
    isVideoPlaying,
    schedulePlayerControlsHide,
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

  const togglePlayback = () => {
    const videoElement = videoRef.current;

    if (!videoElement || !selectedLessonHasStream) {
      return;
    }

    if (videoElement.paused || videoElement.ended) {
      void videoElement.play();
      return;
    }

    videoElement.pause();
  };

  const toggleMute = () => {
    const videoElement = videoRef.current;

    if (!videoElement || !selectedLessonHasStream) {
      return;
    }

    videoElement.muted = !videoElement.muted;
    setIsVideoMuted(videoElement.muted || videoElement.volume === 0);
    revealPlayerControls();
  };

  const openPracticumReservationModal = (slot: PracticumSlot) => {
    if (!selectedPracticumLecture?.eligible || !isPracticumSlotReservable(slot)) {
      return;
    }

    setPendingPracticumSlot({
      mode: activeScheduledReservation ? 'move' : 'reserve',
      slot,
    });
  };

  const confirmPracticumReservation = () => {
    if (!pendingPracticumSlot || !selectedPracticumLecture) {
      return;
    }

    if (pendingPracticumSlot.mode === 'move' && activeScheduledReservation) {
      movePracticumMutation.mutate({
        reservationId: activeScheduledReservation.id,
        startAt: pendingPracticumSlot.slot.startAt,
      });
      return;
    }

    reservePracticumMutation.mutate({
      lectureId: selectedPracticumLecture.lectureId,
      startAt: pendingPracticumSlot.slot.startAt,
    });
  };

  const seekToPlaybackSeconds = (nextPlaybackSeconds: number) => {
    const videoElement = videoRef.current;
    const clampedPlaybackSeconds = Math.min(
      Math.max(nextPlaybackSeconds, 0),
      playerDurationSeconds || nextPlaybackSeconds,
    );

    setCurrentPlaybackSeconds(clampedPlaybackSeconds);

    if (!videoElement || !selectedLessonHasStream) {
      return;
    }

    try {
      videoElement.currentTime = clampedPlaybackSeconds;
    } catch {
      // 일부 브라우저는 메타데이터 준비 전 seek를 거부할 수 있습니다.
    }
  };

  const handleTimelineChange = (event: ReactChangeEvent<HTMLInputElement>) => {
    seekToPlaybackSeconds(Number(event.currentTarget.value));
    revealPlayerControls();
  };

  const handlePlayerFrameKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== ' ' && event.code !== 'Space') {
      return;
    }

    const eventTarget = event.target;

    if (
      eventTarget instanceof HTMLElement &&
      eventTarget.closest('button, a, input, select, textarea')
    ) {
      return;
    }

    event.preventDefault();
    revealPlayerControls();
    togglePlayback();
  };

  const handlePlayerFrameClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const eventTarget = event.target;

    if (
      eventTarget instanceof HTMLElement &&
      eventTarget.closest('button, a, input, select, textarea, [role="dialog"]')
    ) {
      return;
    }

    revealPlayerControls();
    togglePlayback();
  };

  const handlePlayerFrameMouseLeave = () => {
    hidePlayerControlsForPlayback();
  };

  const requestPlayerFullscreen = () => {
    const videoElement = videoRef.current;

    if (!videoElement?.parentElement?.requestFullscreen) {
      return;
    }

    void videoElement.parentElement.requestFullscreen();
  };

  const updateQuizAnswer = (
    questionId: number,
    optionId: number,
    questionType: StudentProblem['questions'][number]['questionType'],
  ) => {
    quizSessionDirtyRef.current = true;
    setQuizFlaggedQuestionIds((current) => {
      if (!current.has(questionId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(questionId);
      return next;
    });
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
    if (isQuizSessionActive) {
      quizSessionDirtyRef.current = true;
    }
    setQuizCurrentQuestionIndex(clampQuestionIndex(nextQuestionIndex, questionCount));
  };

  const setQuizFlaggedQuestion = (questionId: number, flagged: boolean) => {
    quizSessionDirtyRef.current = true;
    setIsQuizQuestionListExpanded(true);
    if (flagged) {
      setQuizAnswers((current) => {
        if (!(questionId in current)) {
          return current;
        }

        const { [questionId]: _removedAnswer, ...next } = current;
        return next;
      });
    }
    setQuizFlaggedQuestionIds((current) => {
      const next = new Set(current);
      if (flagged) {
        next.add(questionId);
      } else {
        next.delete(questionId);
      }
      return next;
    });
  };

  const handleQuizStart = () => {
    const problem = quizQuery.data;
    if (!problem || startQuizSessionMutation.isPending || quizSessionStartLockedRef.current) {
      return;
    }

    quizSessionStartLockedRef.current = true;
    setIsQuizSessionStartLocked(true);
    startQuizSessionMutation.mutate(problem.id);
  };

  const handleQuizSubmit = () => {
    const problem = quizQuery.data;
    if (!problem) {
      return;
    }

    if (quizRemainingSeconds === 0) {
      showToast({
        message: '제한시간이 종료되어 제출할 수 없습니다.',
        variant: 'error',
      });
      return;
    }

    const unansweredQuestion = problem.questions.find((question) => {
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
      elapsedSeconds: Math.max(0, quizEffectiveElapsedSeconds),
      quizId: problem.id,
    });
  };

  const renderQuizMedia = (
    mediaType: StudentProblem['questions'][number]['mediaType'],
    mediaVideoId: number | null | undefined,
    mediaPreviewUrl: string | null | undefined,
    mediaUrl: string | null,
    alt: string,
    className: string,
  ) => {
    const resolvedMediaUrl = mediaPreviewUrl || mediaUrl;

    if (!mediaType || (!resolvedMediaUrl && !mediaVideoId)) {
      return null;
    }

    if (mediaType === 'VIDEO') {
      if (selectedLectureId && mediaVideoId) {
        return (
          <QuizProtectedVideo
            alt={alt}
            className={className}
            deviceId={playbackDeviceId}
            lectureId={selectedLectureId}
            videoId={mediaVideoId}
          />
        );
      }
      return (
        <video className={className} controls preload='metadata'>
          <source src={resolvedMediaUrl ?? undefined} />
        </video>
      );
    }

    if (!resolvedMediaUrl) {
      return null;
    }
    return <img alt={alt} className={className} src={resolvedMediaUrl} />;
  };

  const formatQuizOptionLabels = (
    question: StudentProblem['questions'][number] | null,
    optionIds: number[],
  ) => {
    if (!question || optionIds.length === 0) {
      return '-';
    }

    const optionLabelById = new Map(
      question.options.map((option, optionIndex) => [
        option.id,
        `${String(optionIndex + 1)}. ${option.optionText}`,
      ]),
    );

    return optionIds
      .map((optionId) => optionLabelById.get(optionId) ?? String(optionId))
      .join(', ');
  };

  const formatQuizQuestionTypeLabel = (
    questionType: StudentProblem['questions'][number]['questionType'] | undefined,
  ) => {
    if (questionType === 'MULTIPLE') {
      return '복수 선택';
    }

    if (questionType === 'TRUE_FALSE') {
      return '진위형';
    }

    return '단일 선택';
  };

  const renderPracticumLegend = () => (
    <div className={styles['practicumCalendarLegend']} aria-label='실습 예약 상태'>
      <span data-tone='available'>예약가능</span>
      <span data-tone='reserved'>예약됨</span>
      <span data-tone='disabled'>예약불가</span>
    </div>
  );

  const renderPracticumPanel = () => {
    if (!isPracticumLesson) {
      return null;
    }

    const practicumSidebarState = resolvePracticumSidebarState(selectedPracticumLecture);
    return (
      <section className={styles['notesPanel']}>
        <span className={styles['srOnly']}>{practicumSidebarState?.label ?? '예약 확인'}</span>

        {practicumOverviewQuery.isLoading ? (
          <p className={styles['notesHint']}>실습 예약 정보를 불러오는 중입니다.</p>
        ) : null}

        {practicumOverviewQuery.isError ? (
          <p className={styles['errorText']}>
            {practicumOverviewQuery.error instanceof Error
              ? practicumOverviewQuery.error.message
              : '실습 예약 정보를 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!practicumOverviewQuery.isLoading &&
        !practicumOverviewQuery.isError &&
        selectedLectureId === null ? (
          <p className={styles['notesHint']}>실습 강의 정보를 아직 연결하지 못했습니다.</p>
        ) : null}

        {!practicumOverviewQuery.isLoading &&
        !practicumOverviewQuery.isError &&
        selectedPracticumLecture ? (
          <div className={styles['practicumWorkspace']}>
            <section className={styles['practicumCalendarPanel']}>
              <div className={styles['practicumCalendarHeader']}>
                <div className={styles['practicumMonthPicker']} ref={practicumMonthPickerRef}>
                  <button
                    aria-label='이전 달'
                    className={styles['practicumMonthNavButton']}
                    onClick={() => {
                      updatePracticumMonth(shiftMonthValue(practicumMonthValue, -1));
                    }}
                    type='button'
                  >
                    ‹
                  </button>
                  <button
                    aria-expanded={isPracticumMonthPickerOpen}
                    className={styles['practicumMonthTrigger']}
                    onClick={() => {
                      setIsPracticumMonthPickerOpen((current) => !current);
                    }}
                    type='button'
                  >
                    {formatMonthLabel(practicumMonthValue)}
                  </button>
                  <button
                    aria-label='다음 달'
                    className={styles['practicumMonthNavButton']}
                    onClick={() => {
                      updatePracticumMonth(shiftMonthValue(practicumMonthValue, 1));
                    }}
                    type='button'
                  >
                    ›
                  </button>

                  {isPracticumMonthPickerOpen ? (
                    <div className={styles['practicumMonthPopover']} role='dialog'>
                      <div className={styles['practicumMonthPopoverHeader']}>
                        <button
                          aria-label='이전 연도'
                          className={styles['practicumMonthYearButton']}
                          onClick={() => {
                            updatePracticumMonth(shiftMonthYear(practicumMonthValue, -1));
                          }}
                          type='button'
                        >
                          ‹
                        </button>
                        <strong>{`${String(getMonthYear(practicumMonthValue))}년`}</strong>
                        <button
                          aria-label='다음 연도'
                          className={styles['practicumMonthYearButton']}
                          onClick={() => {
                            updatePracticumMonth(shiftMonthYear(practicumMonthValue, 1));
                          }}
                          type='button'
                        >
                          ›
                        </button>
                      </div>
                      <div className={styles['practicumMonthGrid']}>
                        {MONTH_OPTIONS.map((month) => {
                          const monthValue = buildMonthValue(
                            getMonthYear(practicumMonthValue),
                            month,
                          );

                          return (
                            <button
                              className={styles['practicumMonthOption']}
                              data-selected={monthValue === practicumMonthValue}
                              key={month}
                              onClick={() => {
                                updatePracticumMonth(monthValue);
                                setIsPracticumMonthPickerOpen(false);
                              }}
                              type='button'
                            >
                              {`${String(month)}월`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className={styles['practicumCalendarWeekdays']}>
                {calendarWeekdays.map((weekday) => (
                  <span className={styles['practicumCalendarWeekday']} key={weekday}>
                    {weekday}
                  </span>
                ))}
              </div>

              <div className={styles['practicumCalendarGrid']}>
                {practicumCalendarCells.map((cell, index) => {
                  if (!cell.date) {
                    return (
                      <div
                        className={styles['practicumCalendarEmptyCell']}
                        key={`practicum-empty-${String(index)}`}
                      />
                    );
                  }

                  const date = cell.date;
                  const daySlots = practicumSlotsByDate.get(date) ?? [];
                  const dayReservations = practicumReservationsByDate.get(date) ?? [];
                  const dayNoShowReservations = practicumNoShowReservationsByDate.get(date) ?? [];
                  const reservableSlots = daySlots.filter((slot) =>
                    isPracticumSlotReservable(slot),
                  );
                  const availableCount = reservableSlots.length;
                  const previewReservation = [...dayReservations].sort(
                    (left, right) => Date.parse(left.startAt) - Date.parse(right.startAt),
                  )[0];
                  const previewNoShowReservation = [...dayNoShowReservations].sort(
                    (left, right) => Date.parse(left.startAt) - Date.parse(right.startAt),
                  )[0];
                  const dayStatus = previewReservation
                    ? 'reserved'
                    : previewNoShowReservation
                      ? 'noshow'
                      : availableCount > 0
                        ? 'available'
                        : daySlots.length > 0
                          ? 'disabled'
                          : 'empty';

                  return (
                    <button
                      className={styles['practicumCalendarDay']}
                      data-has-items={
                        availableCount > 0 ||
                        dayReservations.length > 0 ||
                        dayNoShowReservations.length > 0
                      }
                      data-reserved={practicumReservationDateKeys.has(date)}
                      data-selected={date === practicumSelectedDate}
                      data-status={dayStatus}
                      key={date}
                      onClick={() => {
                        setPracticumSelectedDateValue(date);
                        const firstReservableSlot = reservableSlots[0];

                        if (firstReservableSlot) {
                          openPracticumReservationModal(firstReservableSlot);
                        }
                      }}
                      type='button'
                    >
                      <div className={styles['practicumCalendarDayHeader']}>
                        <span className={styles['practicumCalendarDayNumber']}>
                          {Number(date.split('-')[2])}
                        </span>
                        {previewReservation ? (
                          <span className={styles['practicumCalendarDayReservation']}>예약됨</span>
                        ) : previewNoShowReservation ? (
                          <span className={styles['practicumCalendarDayNoShow']}>불참</span>
                        ) : availableCount ? (
                          <span className={styles['practicumCalendarDayCount']}>예약가능</span>
                        ) : daySlots.length ? (
                          <span className={styles['practicumCalendarDayUnavailable']}>
                            예약불가
                          </span>
                        ) : null}
                      </div>

                      <div className={styles['practicumCalendarPreviewList']}>
                        {previewReservation ? (
                          <span className={styles['practicumCalendarPreviewReserved']}>
                            {formatTimeRange(previewReservation.startAt, previewReservation.endAt)}
                          </span>
                        ) : previewNoShowReservation ? (
                          <span className={styles['practicumCalendarPreviewNoShow']}>
                            {formatTimeRange(
                              previewNoShowReservation.startAt,
                              previewNoShowReservation.endAt,
                            )}
                          </span>
                        ) : availableCount ? (
                          <span className={styles['practicumCalendarPreviewOpen']}>
                            {`${String(availableCount)}개 예약 가능`}
                          </span>
                        ) : daySlots.length ? (
                          <span className={styles['practicumCalendarPreviewUnavailable']}>
                            예약불가
                          </span>
                        ) : (
                          <span className={styles['practicumCalendarPreviewEmpty']}>일정 없음</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        ) : null}

        {!practicumOverviewQuery.isLoading &&
        !practicumOverviewQuery.isError &&
        selectedLectureId !== null &&
        !selectedPracticumLecture ? (
          <div className={styles['practicumNotice']}>
            <strong className={styles['practicumNoticeTitle']}>
              실습 강의 정보를 찾지 못했습니다.
            </strong>
            <p className={styles['notesHint']}>강의 연결 상태를 확인한 뒤 다시 시도해 주세요.</p>
          </div>
        ) : null}
      </section>
    );
  };

  const renderPracticumReservationModal = () => {
    if (!pendingPracticumSlot || !selectedPracticumLecture) {
      return null;
    }

    const selectedDateLabel = formatPracticumModalDate(practicumSelectedDate);
    const modalSlots = practicumSelectedDateSlots.length
      ? practicumSelectedDateSlots
      : [pendingPracticumSlot.slot];

    return (
      <Modal
        bodyClassName={styles['practicumReservationModalBody']}
        closeButtonClassName={styles['practicumReservationModalClose']}
        closeButtonContent={<img alt='' aria-hidden='true' src={iconPracticumClose} />}
        headerClassName={styles['practicumReservationModalHeader']}
        onClose={() => {
          setPendingPracticumSlot(null);
        }}
        panelClassName={styles['practicumReservationModal']}
        title='실습 예약'
        titleClassName={styles['practicumReservationModalTitle']}
      >
        <div className={styles['practicumReservationModalContent']}>
          <p className={styles['practicumReservationModalQuestion']}>
            선택한 일정으로 예약하시겠습니까?
          </p>
          <div className={styles['practicumReservationDateCard']}>
            <img
              alt=''
              aria-hidden='true'
              className={styles['practicumReservationCalendarIcon']}
              src={iconPracticumCalendar}
            />
            <span>선택 날짜</span>
            <strong>{selectedDateLabel}</strong>
          </div>
          <div className={styles['practicumReservationTimeGroup']}>
            <p className={styles['practicumReservationTimeLabel']}>예약 가능 시간</p>
            <div className={styles['practicumReservationTimeGrid']}>
              {modalSlots.map((slot) => {
                const isSelected = slot.startAt === selectedPendingPracticumStartAt;
                const isDisabled = !isPracticumSlotReservable(slot);

                return (
                  <button
                    className={styles['practicumReservationTimeButton']}
                    data-selected={isSelected}
                    disabled={isDisabled}
                    key={slot.startAt}
                    onClick={() => {
                      if (!isDisabled) {
                        setPendingPracticumSlot((current) =>
                          current ? { ...current, slot } : current,
                        );
                      }
                    }}
                    type='button'
                  >
                    {formatTimeRange(slot.startAt, slot.endAt)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles['practicumReservationModalActions']}>
            <button
              className={styles['practicumReservationCancelButton']}
              onClick={() => {
                setPendingPracticumSlot(null);
              }}
              type='button'
            >
              취소
            </button>
            <button
              className={styles['practicumReservationConfirmButton']}
              disabled={isPracticumMutationPending}
              onClick={confirmPracticumReservation}
              type='button'
            >
              {isPracticumMutationPending
                ? pendingPracticumSlot.mode === 'move'
                  ? '변경 중...'
                  : '예약 중...'
                : pendingPracticumSlot.mode === 'move'
                  ? '변경하기'
                  : '예약하기'}
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  const renderProblemReportModal = () => {
    return (
      <ProblemReportModal
        onClose={() => {
          setProblemReport(null);
        }}
        report={problemReport}
      />
    );
  };

  const renderOfflineSchedulePanel = () => {
    if (!selectedLesson || selectedLesson.deliveryType !== 'offline') {
      return null;
    }

    if (!firstOfflineDate) {
      return (
        <div className={styles['playerPlaceholder']}>
          <div className={styles['playerOverlayCopy']}>
            <p className={styles['overlayTitle']}>오프라인 강의 일정이 아직 등록되지 않았습니다.</p>
            <p className={styles['overlayDescription']}>
              관리자에서 일정을 등록하면 이 영역에서 바로 확인할 수 있습니다.
            </p>
          </div>
        </div>
      );
    }

    const primaryOfflineEntry = offlineScheduleEntries[0] ?? null;
    const attendanceStatusLabel = primaryOfflineEntry?.absent
      ? '불참'
      : primaryOfflineEntry?.attendanceCompleted
        ? '참석 처리됨'
        : '참석 예정';
    const attendanceDescription = primaryOfflineEntry?.absent
      ? null
      : primaryOfflineEntry?.attendanceCompleted
        ? '일정 종료 후 진도율에 반영되었습니다.'
        : '불참 표시 없으면 자동 참석';
    const prerequisiteVideoLabel = selectedLessonHasStream
      ? selectedLessonProgress?.completed
        ? '선행 영상 완료'
        : '선행 영상 미완료'
      : null;

    return (
      <div className={styles['offlineScheduleWorkspace']}>
        <section
          className={classNames(styles['practicumCalendarPanel'], styles['offlineCalendarPanel'])}
        >
          <div
            className={classNames(
              styles['practicumCalendarHeader'],
              styles['offlineCalendarHeader'],
            )}
          >
            <div className={styles['practicumMonthPicker']} ref={offlineMonthPickerRef}>
              <button
                aria-label='이전 달'
                className={styles['practicumMonthNavButton']}
                onClick={() => {
                  updateOfflineMonth(shiftMonthValue(offlineCalendarMonthValue, -1));
                }}
                type='button'
              >
                ‹
              </button>
              <button
                aria-expanded={isOfflineMonthPickerOpen}
                className={styles['practicumMonthTrigger']}
                onClick={() => {
                  setIsOfflineMonthPickerOpen((current) => !current);
                }}
                type='button'
              >
                {formatMonthLabel(offlineCalendarMonthValue)}
              </button>
              <button
                aria-label='다음 달'
                className={styles['practicumMonthNavButton']}
                onClick={() => {
                  updateOfflineMonth(shiftMonthValue(offlineCalendarMonthValue, 1));
                }}
                type='button'
              >
                ›
              </button>

              {isOfflineMonthPickerOpen ? (
                <div className={styles['practicumMonthPopover']} role='dialog'>
                  <div className={styles['practicumMonthPopoverHeader']}>
                    <button
                      aria-label='이전 연도'
                      className={styles['practicumMonthYearButton']}
                      onClick={() => {
                        updateOfflineMonth(shiftMonthYear(offlineCalendarMonthValue, -1));
                      }}
                      type='button'
                    >
                      ‹
                    </button>
                    <strong>{`${String(getMonthYear(offlineCalendarMonthValue))}년`}</strong>
                    <button
                      aria-label='다음 연도'
                      className={styles['practicumMonthYearButton']}
                      onClick={() => {
                        updateOfflineMonth(shiftMonthYear(offlineCalendarMonthValue, 1));
                      }}
                      type='button'
                    >
                      ›
                    </button>
                  </div>
                  <div className={styles['practicumMonthGrid']}>
                    {MONTH_OPTIONS.map((month) => {
                      const monthValue = buildMonthValue(
                        getMonthYear(offlineCalendarMonthValue),
                        month,
                      );

                      return (
                        <button
                          className={styles['practicumMonthOption']}
                          data-selected={monthValue === offlineCalendarMonthValue}
                          key={month}
                          onClick={() => {
                            updateOfflineMonth(monthValue);
                            setIsOfflineMonthPickerOpen(false);
                          }}
                          type='button'
                        >
                          {`${String(month)}월`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            {primaryOfflineEntry ? (
              <div className={styles['offlineScheduleSummary']} aria-label='오프라인 일정 요약'>
                <strong>
                  {formatDate(primaryOfflineEntry.date ?? firstOfflineDate)}
                  {primaryOfflineEntry.timeLabel ? ` · ${primaryOfflineEntry.timeLabel}` : ''}
                </strong>
                <span>{primaryOfflineEntry.location ?? '장소 안내 예정'}</span>
              </div>
            ) : null}
          </div>

          {primaryOfflineEntry ? (
            <div className={styles['offlineAttendancePanel']}>
              <div className={styles['offlineAttendanceMain']}>
                <span
                  className={styles['offlineAttendanceBadge']}
                  data-tone={
                    primaryOfflineEntry.absent
                      ? 'absent'
                      : primaryOfflineEntry.attendanceCompleted
                        ? 'completed'
                        : 'scheduled'
                  }
                >
                  {attendanceStatusLabel}
                </span>
                {prerequisiteVideoLabel ? (
                  <span
                    className={styles['offlineAttendanceBadge']}
                    data-tone={selectedLessonProgress?.completed ? 'completed' : 'pending'}
                  >
                    {prerequisiteVideoLabel}
                  </span>
                ) : null}
                {attendanceDescription ? (
                  <span className={styles['offlineAttendanceHelp']}>{attendanceDescription}</span>
                ) : null}
              </div>
              <Button
                disabled={offlineAttendanceMutation.isPending}
                onClick={() => {
                  if (!primaryOfflineEntry.ruleId) {
                    showToast({
                      message:
                        '오프라인 일정 정보가 갱신되지 않았습니다. 새로고침 후 다시 시도해 주세요.',
                      variant: 'error',
                    });
                    return;
                  }
                  offlineAttendanceMutation.mutate({
                    absent: !primaryOfflineEntry.absent,
                    ruleId: primaryOfflineEntry.ruleId,
                  });
                }}
                size='sm'
                type='button'
                variant={primaryOfflineEntry.absent ? 'secondary' : 'primary'}
              >
                {offlineAttendanceMutation.isPending
                  ? '저장 중...'
                  : primaryOfflineEntry.absent
                    ? '불참 취소'
                    : '불참으로 표시'}
              </Button>
            </div>
          ) : null}

          <div className={styles['practicumCalendarWeekdays']}>
            {calendarWeekdays.map((weekday) => (
              <span className={styles['practicumCalendarWeekday']} key={weekday}>
                {weekday}
              </span>
            ))}
          </div>

          <div className={styles['practicumCalendarGrid']}>
            {offlineCalendarCells.map((cell, index) => {
              if (!cell.date) {
                return (
                  <div
                    className={styles['practicumCalendarEmptyCell']}
                    key={`offline-empty-${String(index)}`}
                  />
                );
              }

              const dayEntries = offlineScheduleEntriesByDate.get(cell.date) ?? [];
              const previewEntries = dayEntries.slice(0, 2);

              return (
                <div
                  className={styles['practicumCalendarDay']}
                  data-has-items={dayEntries.length > 0}
                  data-reserved={dayEntries.length > 0}
                  key={cell.date}
                >
                  <div className={styles['practicumCalendarDayHeader']}>
                    <span className={styles['practicumCalendarDayNumber']}>
                      {Number(cell.date.split('-')[2])}
                    </span>
                  </div>

                  <div className={styles['practicumCalendarPreviewList']}>
                    {previewEntries.length ? (
                      previewEntries.map((entry) => (
                        <span className={styles['offlineCalendarPreviewItem']} key={entry.id}>
                          <span className={styles['offlineCalendarPreviewTime']}>
                            {entry.timeLabel ?? '오프라인 수업'}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className={styles['practicumCalendarPreviewEmpty']}>일정 없음</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  };

  const resourceDownloadMutation = useMutation({
    mutationFn: ({
      documentId,
      fileName,
      programId,
    }: {
      documentId: number;
      fileName: string;
      programId: number;
    }) => downloadProgramResourceFile(programId, documentId, fileName),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '자료 파일을 다운로드하지 못했습니다.',
        variant: 'error',
      });
    },
  });

  const handleDownloadResourceAttachment = (attachment: LearningPlayerResourceAttachment) => {
    if (!resourceProgramId) {
      showToast({
        message: '프로그램 정보를 확인하지 못해 자료를 다운로드할 수 없습니다.',
        variant: 'error',
      });
      return;
    }

    resourceDownloadMutation.mutate({
      documentId: attachment.id,
      fileName: attachment.fileName,
      programId: resourceProgramId,
    });
  };

  const handleDownloadAllResourceAttachments = () => {
    const downloadableAttachments = resourceProgramId ? lessonResourceAttachments : [];

    if (!downloadableAttachments.length) {
      showToast({
        message: '다운로드할 수 있는 첨부파일이 아직 없습니다.',
        variant: 'error',
      });
      return;
    }

    downloadableAttachments.forEach((attachment) => {
      handleDownloadResourceAttachment(attachment);
    });
  };

  const renderResourcePanel = () => {
    return (
      <div className={styles['resourceBoardViewport']}>
        <div className={styles['resourceBoard']}>
          <div className={styles['resourceBoardHeader']} aria-hidden='true'>
            <span className={styles['resourceBoardHeaderFile']}>파일</span>
            <span>크기</span>
            <span>업데이트</span>
            <span>다운로드</span>
          </div>
          {lessonResourceAttachments.length ? (
            <div className={styles['resourceBoardList']}>
              {lessonResourceAttachments.map((attachment) => (
                <article className={styles['resourceBoardRow']} key={attachment.id}>
                  <div className={styles['resourceFileCell']}>
                    <span className={styles['resourceFileType']}>
                      {formatResourceFileTypeLabel(attachment)}
                    </span>
                    <strong className={styles['resourceBoardTitle']}>
                      {attachment.title?.trim() || attachment.fileName}
                    </strong>
                  </div>
                  <span className={styles['resourceBoardSize']}>
                    {formatResourceFileSize(attachment.fileSize)}
                  </span>
                  <span className={styles['resourceBoardDate']}>
                    {formatResourceUpdatedDate(attachment.updatedAt)}
                  </span>
                  <div className={styles['resourceBoardActions']}>
                    <button
                      className={styles['resourceDownloadButton']}
                      disabled={
                        resourceDownloadMutation.isPending &&
                        resourceDownloadMutation.variables?.documentId === attachment.id
                      }
                      onClick={() => {
                        handleDownloadResourceAttachment(attachment);
                      }}
                      type='button'
                    >
                      다운로드
                      <span
                        aria-hidden='true'
                        className={styles['resourceDownloadIcon']}
                        style={playerArrowDownToLineIconStyle}
                      />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles['resourceBoardEmptyState']}>
              <span
                aria-hidden='true'
                className={styles['resourceBoardEmptyIcon']}
                style={playerFolderOpenIconStyle}
              />
              <strong>등록된 첨부파일이 없습니다.</strong>
              <span>자료가 등록되면 여기에서 확인할 수 있습니다.</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQuizQuestionNavigator = () => {
    if (!quizQuestions.length) {
      return null;
    }

    return (
      <nav aria-label='문제 문항 목록' className={styles['quizNavigatorList']}>
        {quizQuestions.map((question, index) => {
          const isCurrentQuestion = question.id === currentQuizQuestion?.id;
          const result = quizAttemptResult?.results.find((item) => item.questionId === question.id);
          const selectedOptionIds = result?.submittedOptionIds ?? quizAnswers[question.id] ?? [];
          const isFlagged = quizFlaggedQuestionIds.has(question.id);
          const selectedAnswerLabel = formatSelectedQuizAnswerLabel(question, selectedOptionIds);
          const resultStatusLabel = result ? (result.correct ? '정답' : '오답') : null;
          const sidebarStatusLabel = getQuizSidebarStatusLabel(
            selectedOptionIds,
            isFlagged,
            isCurrentQuestion,
          );
          const shouldShowSidebarStatus = isCurrentQuestion || isFlagged;
          const displayedStatusLabel =
            resultStatusLabel ??
            (shouldShowSidebarStatus
              ? sidebarStatusLabel
              : (selectedAnswerLabel ?? sidebarStatusLabel));

          return (
            <button
              className={classNames(
                styles['quizNavigatorListButton'],
                isCurrentQuestion && styles['quizNavigatorListButtonCurrent'],
              )}
              key={question.id}
              onClick={() => {
                moveToQuizQuestion(index);
              }}
              type='button'
            >
              <span className={styles['quizNavigatorStateRow']}>
                <span
                  className={classNames(
                    styles['quizNavigatorNumber'],
                    selectedOptionIds.length > 0 && styles['quizNavigatorNumberAnswered'],
                  )}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className={styles['quizNavigatorQuestionTitle']}>
                  {formatQuizQuestionLabel(index)}
                </span>
                <span
                  className={classNames(
                    styles['quizNavigatorStateBadge'],
                    (result?.correct || selectedAnswerLabel) &&
                      styles['quizNavigatorStateBadgeAnswered'],
                    result && !result.correct && styles['quizNavigatorStateBadgeWrong'],
                    !result &&
                      !selectedAnswerLabel &&
                      isFlagged &&
                      styles['quizNavigatorStateBadgeFlagged'],
                    !result &&
                      !selectedAnswerLabel &&
                      isCurrentQuestion &&
                      styles['quizNavigatorStateBadgeCurrent'],
                  )}
                >
                  {displayedStatusLabel}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    );
  };

  const renderQuizResultPanel = () => {
    if (!quizAttemptResult) {
      return null;
    }

    const reviewQuestion = currentQuizReviewQuestion;
    const reviewResult = currentQuizReviewResult;
    const correctAnswerLabel = formatQuizOptionLabels(
      reviewQuestion,
      reviewResult?.correctOptionIds ?? [],
    );
    const submittedAnswerLabel = formatQuizOptionLabels(
      reviewQuestion,
      reviewResult?.submittedOptionIds ?? [],
    );
    const explanation = reviewResult?.explanation ?? reviewQuestion?.explanation ?? null;

    return (
      <div className={styles['quizResultPage']}>
        <h2 className={styles['quizResultPageTitle']}>채점 결과</h2>

        <section className={styles['quizScorePanel']} aria-label='채점 결과 요약'>
          <div
            className={styles['quizScoreBlock']}
            data-passed={quizAttemptResult.passed ? 'true' : 'false'}
          >
            <span className={styles['quizScoreLabel']}>총점</span>
            <div className={styles['quizScoreValueRow']}>
              <strong className={styles['quizScoreValue']}>{quizAttemptResult.score}</strong>
              <span className={styles['quizScoreTotal']}>/ 100</span>
            </div>
            <span className={styles['quizScoreCaption']}>최종 점수</span>
          </div>

          <div
            className={styles['quizPassBlock']}
            data-passed={quizAttemptResult.passed ? 'true' : 'false'}
          >
            <span className={styles['quizPassIcon']} aria-hidden='true'>
              <span
                className={styles['quizPassIconGlyph']}
                style={
                  quizAttemptResult.passed
                    ? playerResultPassCheckIconStyle
                    : playerResultRetryNeededIconStyle
                }
              />
            </span>
            <strong className={styles['quizPassTitle']}>
              {quizAttemptResult.passed ? '통과' : '재도전 필요'}
            </strong>
            <span className={styles['quizPassCaption']}>
              {quizAttemptResult.passed
                ? '수고하셨습니다!'
                : `목표 점수는 ${String(quizResultTargetScore)}점입니다.`}
            </span>
          </div>

          <dl className={styles['quizResultStats']}>
            <div className={styles['quizResultStat']}>
              <dt>
                <span className={styles['quizResultStatIcon']} data-tone='correct'>
                  ✓
                </span>
                정답
              </dt>
              <dd>
                <strong>{quizResultCorrectCount}</strong>
                <span>문항</span>
              </dd>
            </div>
            <div className={styles['quizResultStat']}>
              <dt>
                <span className={styles['quizResultStatIcon']} data-tone='wrong'>
                  ×
                </span>
                오답
              </dt>
              <dd>
                <strong>{quizResultWrongCount}</strong>
                <span>문항</span>
              </dd>
            </div>
            <div className={styles['quizResultStat']}>
              <dt>
                <span className={styles['quizResultStatIcon']} data-tone='rate'>
                  !
                </span>
                정답률
              </dt>
              <dd>
                <strong>{formatQuizPercent(quizResultCorrectRate)}</strong>
                <span>%</span>
              </dd>
            </div>
          </dl>

          <div className={styles['quizResultButtonStack']}>
            <button
              className={styles['quizResultPrintButton']}
              disabled={printProblemReportMutation.isPending}
              onClick={() => {
                printProblemReportMutation.mutate(quizAttemptResult.id);
              }}
              type='button'
            >
              {printProblemReportMutation.isPending ? '불러오는 중...' : '결과 출력'}
            </button>
            {canRetakeQuiz ? (
              <button
                className={styles['quizResultRetryButton']}
                disabled={startQuizSessionMutation.isPending || isQuizSessionStartLocked}
                onClick={handleQuizStart}
                type='button'
              >
                재도전
                <span
                  aria-hidden='true'
                  className={styles['quizResultRetryIcon']}
                  style={playerRefreshCcwIconStyle}
                />
              </button>
            ) : null}
          </div>
        </section>

        <section className={styles['quizReviewPanel']} aria-label='문항 리뷰'>
          <div className={styles['quizReviewHeader']}>
            <div>
              <h3 className={styles['quizReviewTitle']}>문항 리뷰</h3>
              <p className={styles['quizReviewQuestionTitle']}>
                <span>{String(quizResultReviewIndex + 1).padStart(2, '0')}</span>
                {reviewResult?.questionText ?? reviewQuestion?.questionText ?? '문항 정보 없음'}
              </p>
            </div>

            <div className={styles['quizReviewPager']} aria-label='문항 리뷰 이동'>
              <button
                aria-label='이전 문항'
                disabled={quizResultReviewIndex === 0}
                onClick={() => {
                  moveToQuizQuestion(quizResultReviewIndex - 1);
                }}
                type='button'
              />
              <span>
                <strong>{quizResultReviewIndex + 1}</strong>
                <span>/</span>
                <span>{quizResultTotalCount}</span>
              </span>
              <button
                aria-label='다음 문항'
                disabled={quizResultReviewIndex + 1 >= quizResultTotalCount}
                onClick={() => {
                  moveToQuizQuestion(quizResultReviewIndex + 1);
                }}
                type='button'
              />
            </div>
          </div>

          <div className={styles['quizReviewTable']}>
            <div className={styles['quizReviewRow']}>
              <div className={styles['quizReviewCellLabel']}>정답</div>
              <div className={styles['quizReviewCellValue']} data-tone='correct'>
                {correctAnswerLabel}
              </div>
              <div className={styles['quizReviewCellLabel']}>선택 답안</div>
              <div className={styles['quizReviewCellValue']}>{submittedAnswerLabel}</div>
            </div>
            <div className={styles['quizReviewRow']}>
              <div className={styles['quizReviewCellLabel']}>문제 유형</div>
              <div className={styles['quizReviewCellValue']} data-span='3'>
                {reviewResult?.problemAreaName ??
                  reviewQuestion?.problemAreaName ??
                  formatQuizQuestionTypeLabel(reviewQuestion?.questionType)}
              </div>
            </div>
            <div className={styles['quizReviewExplanationRow']}>
              <div className={styles['quizReviewCellLabel']}>해설</div>
              <div className={styles['quizReviewExplanationBody']}>
                <p>{explanation || '등록된 해설이 없습니다.'}</p>
                {reviewQuestion
                  ? renderQuizMedia(
                      reviewQuestion.mediaType,
                      reviewQuestion.mediaVideoId,
                      reviewQuestion.mediaPreviewUrl,
                      reviewQuestion.mediaUrl,
                      `${String(quizResultReviewIndex + 1)}번 문항 해설 미디어`,
                      styles['quizReviewMedia'],
                    )
                  : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className={styles['page']}>
      <div className={styles['shell']}>
        <header className={styles['topBar']}>
          <div className={styles['topBarCopy']}>
            <Link className={styles['backLink']} to={routePaths.mypage}>
              <span
                aria-hidden='true'
                className={styles['backLinkIcon']}
                style={playerArrowLeftIconStyle}
              />
              <span>내 강의</span>
            </Link>
          </div>
          {enrollmentState ? (
            <div className={styles['topBarMeta']}>
              <span className={styles['topBarChip']}>진도율 {completedRatio}%</span>
              <span className={styles['topBarText']}>
                운영기간 {formatDateRange(enrollmentState.enrolledAt, enrollmentState.expireAt)}
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
                {!selectedItemLocked && isLessonItem && !isQuizMode ? (
                  <>
                    <section
                      className={classNames(
                        styles['stageCard'],
                        isResourceLesson && styles['resourceStageCard'],
                        isPracticumLesson && styles['practicumStageCard'],
                      )}
                    >
                      <div className={styles['stageHeader']}>
                        <div className={styles['stageCopy']}>
                          <h1 className={styles['lessonTitle']}>{selectedLesson?.title}</h1>
                          {isResourceLesson && selectedLesson?.description?.trim() ? (
                            <p className={styles['resourceStageDescription']}>
                              {selectedLesson.description}
                            </p>
                          ) : null}
                          {progressSaveError ? (
                            <p className={styles['stageProgressWarning']}>{progressSaveError}</p>
                          ) : null}
                        </div>
                        {selectedLesson && (isResourceLesson || isPracticumLesson) ? (
                          <div className={styles['stageMeta']} aria-label='현재 강의 정보'>
                            {isResourceLesson ? (
                              <button
                                className={styles['resourceDownloadAllButton']}
                                onClick={handleDownloadAllResourceAttachments}
                                type='button'
                              >
                                모두 다운로드
                                <span
                                  aria-hidden='true'
                                  className={styles['resourceDownloadIcon']}
                                  style={playerArrowDownToLineIconStyle}
                                />
                              </button>
                            ) : isPracticumLesson ? (
                              renderPracticumLegend()
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {isPracticumLesson ? (
                        renderPracticumPanel()
                      ) : (
                        <div
                          className={classNames(
                            styles['playerShell'],
                            isResourceLesson && styles['resourcePlayerShell'],
                          )}
                        >
                          <div
                            aria-label='영상 플레이어'
                            className={classNames(
                              styles['playerFrame'],
                              (isOfflineLesson || isResourceLesson) &&
                                styles['playerFrameSchedule'],
                              selectedLessonHasStream &&
                                !arePlayerControlsVisible &&
                                styles['playerFrameControlsHidden'],
                            )}
                            onFocus={selectedLessonHasStream ? revealPlayerControls : undefined}
                            onClick={selectedLessonHasStream ? handlePlayerFrameClick : undefined}
                            onKeyDown={
                              selectedLessonHasStream ? handlePlayerFrameKeyDown : undefined
                            }
                            onMouseEnter={
                              selectedLessonHasStream ? revealPlayerControls : undefined
                            }
                            onMouseLeave={
                              selectedLessonHasStream ? handlePlayerFrameMouseLeave : undefined
                            }
                            onPointerDown={
                              selectedLessonHasStream ? revealPlayerControls : undefined
                            }
                            onPointerMove={
                              selectedLessonHasStream ? revealPlayerControls : undefined
                            }
                            role={selectedLessonHasStream ? 'region' : undefined}
                            tabIndex={selectedLessonHasStream ? 0 : undefined}
                          >
                            {isOfflineLesson ? (
                              renderOfflineSchedulePanel()
                            ) : isResourceLesson ? (
                              renderResourcePanel()
                            ) : selectedLessonHasStream ? (
                              <>
                                {shouldShowPlayerPoster ? (
                                  <img
                                    alt=''
                                    className={styles['playerPosterImage']}
                                    src={selectedSource.posterUrl ?? undefined}
                                  />
                                ) : null}
                                <video
                                  className={styles['playerElement']}
                                  controlsList='nodownload noremoteplayback'
                                  disablePictureInPicture
                                  disableRemotePlayback
                                  playsInline
                                  poster={selectedSource.posterUrl ?? undefined}
                                  preload='auto'
                                  ref={videoRef}
                                />
                                {playbackWatermarkCompactText ? (
                                  <>
                                    <div
                                      aria-hidden='true'
                                      className={styles['playbackWatermark']}
                                      data-position={playbackWatermarkPosition}
                                    >
                                      {playbackWatermarkCompactText}
                                    </div>
                                    <div
                                      aria-hidden='true'
                                      className={styles['playbackWatermarkEmphasis']}
                                      data-visible={isPlaybackWatermarkEmphasized}
                                    >
                                      {playbackWatermarkDetailText}
                                    </div>
                                  </>
                                ) : null}
                              </>
                            ) : (
                              <div className={styles['playerPlaceholder']}>
                                <div className={styles['playerOverlayCopy']}>
                                  <p className={styles['overlayTitle']}>
                                    이 강의는 영상 없이 제공되는 강의입니다.
                                  </p>
                                  <p className={styles['overlayDescription']}>
                                    실습, 첨부자료, 강의 설명 중심으로 진행되며 영상이 연결되면
                                    여기에서 바로 재생할 수 있습니다.
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
                              <div className={styles['playerOverlay']} data-state='loading'>
                                <span
                                  aria-hidden='true'
                                  className={styles['playerLoadingSpinner']}
                                />
                                <div className={styles['playerOverlayCopy']}>
                                  <p className={styles['overlayTitle']}>스트리밍 준비 중</p>
                                  <p className={styles['overlayDescription']}>
                                    잠시만 기다려 주세요. 영상 재생을 준비하고 있습니다.
                                  </p>
                                </div>
                              </div>
                            ) : null}

                            {isUnsupportedPlayback ? (
                              <div className={styles['playerOverlay']} data-state='notice'>
                                <div className={styles['playerOverlayCopy']}>
                                  <p className={styles['overlayTitle']}>
                                    현재 브라우저에서는 재생이 지원되지 않습니다.
                                  </p>
                                  <p className={styles['overlayDescription']}>
                                    최신 버전의 Chrome 또는 Edge 사용을 권장합니다.
                                  </p>
                                </div>
                              </div>
                            ) : null}

                            {!isOfflineLesson && !isResourceLesson && !selectedSource ? (
                              <div className={styles['playerOverlay']} data-state='notice'>
                                <p className={styles['overlayTitle']}>
                                  재생할 강의를 찾을 수 없습니다.
                                </p>
                              </div>
                            ) : null}

                            {playerError ? (
                              <div className={styles['playerOverlay']} data-state='error'>
                                <div className={styles['playerOverlayCopy']}>
                                  <p className={styles['overlayTitle']}>
                                    영상 재생에 문제가 발생했습니다.
                                  </p>
                                  <p className={styles['overlayDescription']}>
                                    잠시 후 다시 시도해 주세요.
                                  </p>
                                </div>
                              </div>
                            ) : null}

                            {selectedLessonHasStream ? (
                              <div
                                className={styles['playerFrameControls']}
                                onClick={(event) => {
                                  event.stopPropagation();
                                }}
                                ref={settingsPanelRef}
                              >
                                <div className={styles['playerTimeline']}>
                                  <span className={styles['playerTimelineTrack']} />
                                  <span
                                    className={styles['playerTimelineBuffer']}
                                    style={{ width: '31%' }}
                                  />
                                  <span
                                    className={styles['playerTimelineFill']}
                                    style={{ width: `${String(playerProgressRatio)}%` }}
                                  />
                                  <span
                                    aria-hidden='true'
                                    className={styles['playerTimelineThumb']}
                                    style={{ left: `${String(playerProgressRatio)}%` }}
                                  />
                                  <input
                                    aria-label='재생 위치'
                                    className={styles['playerTimelineInput']}
                                    max={playerDurationSeconds || 0}
                                    min={0}
                                    onChange={handleTimelineChange}
                                    step={1}
                                    type='range'
                                    value={Math.min(currentPlaybackSeconds, playerDurationSeconds)}
                                  />
                                </div>
                                <div className={styles['playerControlRow']}>
                                  <div className={styles['playerPrimaryControls']}>
                                    <button
                                      aria-label={isVideoPlaying ? '멈춤' : '재생'}
                                      className={styles['playerIconButton']}
                                      onClick={togglePlayback}
                                      title={isVideoPlaying ? '멈춤' : '재생'}
                                      type='button'
                                    >
                                      <span
                                        aria-hidden='true'
                                        className={classNames(
                                          styles['playerControlIcon'],
                                          isVideoPlaying && styles['playerPauseIcon'],
                                        )}
                                        style={isVideoPlaying ? undefined : playerPlayIconStyle}
                                      />
                                    </button>
                                    <button
                                      aria-label={isVideoMuted ? '음소거 해제' : '음소거'}
                                      className={styles['playerIconButton']}
                                      onClick={toggleMute}
                                      title={isVideoMuted ? '음소거 해제' : '음소거'}
                                      type='button'
                                    >
                                      <span
                                        aria-hidden='true'
                                        className={styles['playerControlIcon']}
                                        style={playerVolumeIconStyle}
                                      />
                                      {isVideoMuted ? (
                                        <span
                                          aria-hidden='true'
                                          className={styles['playerMuteSlash']}
                                        />
                                      ) : null}
                                    </button>
                                    <span className={styles['playerTimeText']}>
                                      {formatSeconds(Math.floor(currentPlaybackSeconds))} /{' '}
                                      {formatSeconds(playerDurationSeconds || 45 * 60)}
                                    </span>
                                  </div>
                                  <div className={styles['playerSecondaryControls']}>
                                    <div className={styles['settingsAnchor']}>
                                      <button
                                        aria-expanded={activeSettingsPanel === 'speed'}
                                        aria-haspopup='dialog'
                                        aria-label='재생 설정'
                                        className={styles['playerTextButton']}
                                        onClick={() => {
                                          setActiveSettingsPanel((current) =>
                                            current === 'speed' ? null : 'speed',
                                          );
                                        }}
                                        type='button'
                                      >
                                        {playbackRate}x
                                      </button>
                                      {activeSettingsPanel === 'speed' ? (
                                        <div
                                          aria-label='재생 속도 설정 패널'
                                          className={classNames(
                                            styles['settingsPanel'],
                                            styles['settingsPanelSpeed'],
                                          )}
                                          role='dialog'
                                        >
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
                                                  setActiveSettingsPanel(null);
                                                }}
                                                type='button'
                                              >
                                                {speedOption}x
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                    <div className={styles['settingsAnchor']}>
                                      <button
                                        aria-expanded={activeSettingsPanel === 'quality'}
                                        aria-haspopup='dialog'
                                        aria-label='화질 설정'
                                        className={styles['playerTextButton']}
                                        onClick={() => {
                                          setActiveSettingsPanel((current) =>
                                            current === 'quality' ? null : 'quality',
                                          );
                                        }}
                                        type='button'
                                      >
                                        화질 {selectedQualityLabel}
                                      </button>
                                      {activeSettingsPanel === 'quality' ? (
                                        <div
                                          aria-label='화질 설정 패널'
                                          className={classNames(
                                            styles['settingsPanel'],
                                            styles['settingsPanelQuality'],
                                          )}
                                          role='dialog'
                                        >
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
                                                  setActiveSettingsPanel(null);
                                                }}
                                                type='button'
                                              >
                                                {quality.label}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                    <button
                                      aria-label='전체화면'
                                      className={styles['playerIconButton']}
                                      onClick={requestPlayerFullscreen}
                                      type='button'
                                    >
                                      <span
                                        aria-hidden='true'
                                        className={styles['playerControlIcon']}
                                        style={playerFullscreenIconStyle}
                                      />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </section>
                  </>
                ) : null}

                {isQuizMode ? (
                  <section
                    className={classNames(
                      styles['stageCard'],
                      styles['quizStageCard'],
                      shouldShowQuizResultPage && styles['quizResultStageCard'],
                    )}
                  >
                    {!shouldShowQuizResultPage ? (
                      <div className={classNames(styles['stageHeader'], styles['quizStageHeader'])}>
                        <div className={styles['stageCopy']}>
                          <h1 className={styles['lessonTitle']}>{selectedLesson?.title}</h1>
                        </div>
                        <div className={styles['quizTimerCard']} aria-label='현재 강의 정보'>
                          {selectedLesson ? (
                            <span className={styles['srOnly']}>
                              {LESSON_TYPE_LABELS[selectedLesson.deliveryType]}
                            </span>
                          ) : null}
                          <span className={styles['quizTimerLabel']}>
                            <span aria-hidden='true' className={styles['quizTimerIcon']} />
                            남은 시간
                          </span>
                          <span className={styles['quizTimerValue']}>{quizRemainingTimeLabel}</span>
                        </div>
                      </div>
                    ) : null}

                    <section
                      className={classNames(
                        styles['quizWorkspace'],
                        shouldShowQuizResultPage && styles['quizResultWorkspace'],
                      )}
                    >
                      {quizQuery.isLoading ? (
                        <p className={styles['quizMutedText']}>문제 정보를 불러오는 중입니다.</p>
                      ) : quizQuery.isError ? (
                        <p className={styles['quizErrorText']}>
                          {quizQuery.error instanceof Error
                            ? quizQuery.error.message
                            : '문제 정보를 불러오지 못했습니다.'}
                        </p>
                      ) : !quizQuery.data ? (
                        <p className={styles['quizMutedText']}>
                          이 강의에는 등록된 문제가 없습니다.
                        </p>
                      ) : (
                        <>
                          {shouldShowQuizStartPrompt ? (
                            <section className={styles['quizStartCard']}>
                              <div className={styles['quizResultHeader']}>
                                <div>
                                  <strong className={styles['quizResultTitle']}>
                                    문제 풀이를 시작할까요?
                                  </strong>
                                  <p className={styles['quizMutedText']}>
                                    시작하면 제한시간이 흐르고, 남은 시간이 끝나면 현재 저장된
                                    답안으로 자동 제출됩니다.
                                  </p>
                                </div>
                                <Button
                                  disabled={
                                    startQuizSessionMutation.isPending || isQuizSessionStartLocked
                                  }
                                  onClick={handleQuizStart}
                                  size='sm'
                                  type='button'
                                >
                                  {startQuizSessionMutation.isPending || isQuizSessionStartLocked
                                    ? '시작 중...'
                                    : '시작하기'}
                                </Button>
                              </div>
                              <div className={styles['quizStartMetaGrid']}>
                                <div className={styles['quizStartMetaItem']}>
                                  <span>제한시간</span>
                                  <strong>{quizRemainingTimeLabel}</strong>
                                </div>
                                <div className={styles['quizStartMetaItem']}>
                                  <span>문항수</span>
                                  <strong>{String(quizQuestions.length)}문항</strong>
                                </div>
                                <div className={styles['quizStartMetaItem']}>
                                  <span>통과 기준</span>
                                  <strong>
                                    {String(quizQuery.data?.passCorrectCount ?? 0)}
                                    문항 이상
                                  </strong>
                                </div>
                              </div>
                            </section>
                          ) : null}

                          {shouldShowQuizQuestion && currentQuizQuestion ? (
                            <section className={styles['quizQuestionCard']}>
                              <div className={styles['quizQuestionHeader']}>
                                <span className={styles['quizQuestionEyebrow']}>
                                  Question {String(resolvedQuizQuestionIndex + 1).padStart(2, '0')}
                                </span>
                                <strong className={styles['quizQuestionTitle']}>
                                  {currentQuizQuestion.questionText}
                                </strong>
                                {currentQuizResult ? (
                                  <span
                                    className={classNames(
                                      styles['quizResultState'],
                                      currentQuizResult.correct && styles['quizResultStateCorrect'],
                                    )}
                                  >
                                    {currentQuizResult.correct ? 'O' : 'X'}
                                  </span>
                                ) : null}
                              </div>
                              <div
                                className={classNames(
                                  styles['quizQuestionBody'],
                                  !(
                                    currentQuizQuestion.mediaType &&
                                    (currentQuizQuestion.mediaPreviewUrl ||
                                      currentQuizQuestion.mediaUrl)
                                  ) && styles['quizQuestionBodyTextOnly'],
                                )}
                              >
                                <div className={styles['quizOptionList']}>
                                  {currentQuizQuestion.options.map((option, optionIndex) => {
                                    const selectedOptionIds =
                                      quizAnswers[currentQuizQuestion.id] ?? [];
                                    const submittedOptionIds =
                                      currentQuizResult?.submittedOptionIds ?? selectedOptionIds;
                                    const checked = quizReviewMode
                                      ? submittedOptionIds.includes(option.id)
                                      : selectedOptionIds.includes(option.id);

                                    return (
                                      <label
                                        className={classNames(
                                          styles['quizOptionRow'],
                                          checked && styles['quizOptionRowSelected'],
                                        )}
                                        data-checked={checked ? 'true' : 'false'}
                                        data-type={currentQuizQuestion.questionType}
                                        key={option.id}
                                      >
                                        <input
                                          checked={checked}
                                          aria-label={`${String(optionIndex + 1)}. ${option.optionText}`}
                                          disabled={quizReviewMode}
                                          name={`problem-question-${String(currentQuizQuestion.id)}`}
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
                                        <span
                                          aria-hidden='true'
                                          className={styles['quizOptionIndicator']}
                                        />
                                        <div className={styles['quizOptionContent']}>
                                          <span className={styles['quizOptionLabel']}>
                                            {optionIndex + 1}. {option.optionText}
                                          </span>
                                          {renderQuizMedia(
                                            option.mediaType,
                                            option.mediaVideoId,
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

                                {renderQuizMedia(
                                  currentQuizQuestion.mediaType,
                                  currentQuizQuestion.mediaVideoId,
                                  currentQuizQuestion.mediaPreviewUrl,
                                  currentQuizQuestion.mediaUrl,
                                  `${String(resolvedQuizQuestionIndex + 1)}번 문항 미디어`,
                                  styles['quizMediaImage'],
                                )}
                              </div>

                              {quizReviewMode && currentQuizResult ? (
                                <div className={styles['quizReviewSummary']}>
                                  {currentQuizResult.explanation ? (
                                    <details className={styles['quizExplanationDetails']}>
                                      <summary>해설 보기</summary>
                                      <p className={styles['quizResultExplanation']}>
                                        {currentQuizResult.explanation}
                                      </p>
                                    </details>
                                  ) : null}
                                </div>
                              ) : null}

                              <div className={styles['quizControlBar']}>
                                {!quizReviewMode ? (
                                  <label
                                    className={styles['quizFlagToggleBottom']}
                                    data-checked={
                                      quizFlaggedQuestionIds.has(currentQuizQuestion.id)
                                        ? 'true'
                                        : 'false'
                                    }
                                  >
                                    <input
                                      checked={quizFlaggedQuestionIds.has(currentQuizQuestion.id)}
                                      onChange={(event) => {
                                        setQuizFlaggedQuestion(
                                          currentQuizQuestion.id,
                                          event.currentTarget.checked,
                                        );
                                      }}
                                      type='checkbox'
                                    />
                                    <img
                                      alt=''
                                      aria-hidden='true'
                                      className={styles['quizFlagToggleIcon']}
                                      src={iconBookmark}
                                    />
                                    <span>나중에 풀기</span>
                                  </label>
                                ) : (
                                  <span aria-hidden='true' />
                                )}
                                <div className={styles['quizControlNavigation']}>
                                  <button
                                    className={styles['quizNavButton']}
                                    disabled={resolvedQuizQuestionIndex === 0}
                                    onClick={() => {
                                      moveToQuizQuestion(resolvedQuizQuestionIndex - 1);
                                    }}
                                    type='button'
                                  >
                                    이전
                                  </button>
                                  <span className={styles['quizQuestionCounter']}>
                                    <strong>{resolvedQuizQuestionIndex + 1}</strong>
                                    <span>/</span>
                                    <span>{quizQuestions.length}</span>
                                  </span>
                                  <button
                                    className={styles['quizNavButton']}
                                    disabled={resolvedQuizQuestionIndex + 1 >= quizQuestions.length}
                                    onClick={() => {
                                      moveToQuizQuestion(resolvedQuizQuestionIndex + 1);
                                    }}
                                    type='button'
                                  >
                                    다음
                                  </button>
                                </div>
                                {quizReviewMode ? (
                                  <button
                                    className={classNames(
                                      styles['quizSubmitButton'],
                                      styles['quizSubmitButtonSecondary'],
                                    )}
                                    onClick={() => {
                                      setQuizReviewMode(false);
                                    }}
                                    type='button'
                                  >
                                    결과로 돌아가기
                                  </button>
                                ) : (
                                  <button
                                    className={styles['quizSubmitButton']}
                                    disabled={
                                      submitQuizMutation.isPending || quizRemainingSeconds === 0
                                    }
                                    onClick={handleQuizSubmit}
                                    type='button'
                                  >
                                    {submitQuizMutation.isPending ? '제출 중...' : '최종 제출'}
                                  </button>
                                )}
                              </div>
                            </section>
                          ) : !shouldShowQuizStartPrompt && !quizAttemptResult ? (
                            <p className={styles['quizMutedText']}>
                              {shouldShowSubmittedWithoutResult
                                ? '이미 제출한 문제입니다. 결과 정보를 불러오지 못했습니다.'
                                : '등록된 문제가 없습니다.'}
                            </p>
                          ) : null}

                          {shouldShowQuizResultPage ? renderQuizResultPanel() : null}
                        </>
                      )}
                    </section>
                  </section>
                ) : null}
              </section>

              {isQuizMode ? (
                <aside
                  className={classNames(
                    styles['quizNavigatorPanel'],
                    activeQuizSidebarPanel === 'qna' && styles['curriculumPanelQna'],
                    activeQuizSidebarPanel === 'qna' &&
                      isQuizQnaDetailActive &&
                      styles['quizNavigatorPanelQnaDetail'],
                  )}
                >
                  <div className={styles['curriculumHeader']}>
                    <div className={styles['curriculumHeaderCopy']}>
                      <h2 className={styles['curriculumTitle']}>{curriculumPanelTitle}</h2>
                    </div>
                    {activeQuizSidebarPanel === 'qna' && isQuizQnaDetailActive ? null : (
                      <div className={styles['panelSwitchRow']}>
                        <button
                          aria-label='프로그램 패널'
                          className={classNames(
                            styles['panelSwitchButton'],
                            activeQuizSidebarPanel === 'curriculum' &&
                              styles['panelSwitchButtonActive'],
                          )}
                          onClick={() => {
                            setIsQuizQnaDetailActive(false);
                            setActiveQuizSidebarPanel('curriculum');
                          }}
                          type='button'
                        >
                          <span className={styles['panelSwitchLabel']}>목록</span>
                        </button>
                        <button
                          aria-label='Q&A 패널'
                          className={classNames(
                            styles['panelSwitchButton'],
                            activeQuizSidebarPanel === 'qna' && styles['panelSwitchButtonActive'],
                          )}
                          onClick={() => {
                            setIsQuizQnaDetailActive(false);
                            setActiveQuizSidebarPanel('qna');
                          }}
                          type='button'
                        >
                          <span className={styles['panelSwitchLabel']}>Q&amp;A</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {activeQuizSidebarPanel === 'curriculum' ? (
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
                      <div className={styles['curriculumPanelContent']}>
                        <div className={styles['curriculumBody']}>
                          {snapshot.curriculumTrack.sections.map((section) => {
                            const isSectionOpen = expandedCurriculumSectionIds.has(section.id);

                            return (
                              <section
                                className={classNames(
                                  styles['sectionBlock'],
                                  isSectionOpen && styles['sectionBlockOpen'],
                                )}
                                key={section.id}
                                ref={(node) => {
                                  curriculumSectionRefs.current[section.id] = node;
                                }}
                              >
                                <button
                                  aria-expanded={isSectionOpen}
                                  className={styles['sectionHeader']}
                                  onClick={() => {
                                    toggleCurriculumSection(section.id);
                                  }}
                                  type='button'
                                >
                                  <h3 className={styles['sectionTitle']}>{section.title}</h3>
                                  <span className={styles['sectionToggle']}>
                                    <span
                                      aria-hidden='true'
                                      className={styles['sectionToggleIcon']}
                                      style={playerChevronDownIconStyle}
                                    />
                                  </span>
                                </button>

                                <div
                                  className={styles['sectionContent']}
                                  aria-hidden={!isSectionOpen}
                                >
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
                                      const isProblemCompleted = quizAttemptedLessonIds.has(
                                        lesson.id,
                                      );
                                      const practicumSidebarState =
                                        lesson.deliveryType === 'practicum'
                                          ? (practicumSidebarStatesByLessonId.get(lesson.id) ??
                                            null)
                                          : null;
                                      const practicumLessonBadgeLabel =
                                        lesson.deliveryType === 'practicum'
                                          ? resolvePracticumLessonBadgeLabel(
                                              practicumLectureByLectureId.get(
                                                snapshot?.lessonPlaybackById[lesson.id]
                                                  ?.lectureId ??
                                                  lesson.lectureId ??
                                                  -1,
                                              ) ?? null,
                                            )
                                          : null;
                                      const offlineSidebarState = getOfflineSidebarState(lesson);
                                      const lessonSummaryActionLabel = getLessonSummaryActionLabel(
                                        lesson,
                                        practicumSidebarState?.label ?? null,
                                      );
                                      const lessonActionLabel =
                                        lesson.deliveryType === 'problem' && isProblemCompleted
                                          ? '문제 완료'
                                          : lessonSummaryActionLabel;
                                      const lessonMetaItems = getLessonMetaItems(lesson);
                                      const isItemCompleted =
                                        lesson.deliveryType === 'problem'
                                          ? isProblemCompleted
                                          : isCompleted;
                                      const isLocked = lockedLessonIds.has(lesson.id);

                                      return (
                                        <div
                                          className={classNames(
                                            styles['lessonLinkGroup'],
                                            isCurrent &&
                                              lesson.deliveryType === 'problem' &&
                                              styles['lessonLinkGroupExpanded'],
                                          )}
                                          key={item.id}
                                        >
                                          <Link
                                            className={classNames(
                                              styles['lessonLink'],
                                              isCurrent && styles['lessonLinkCurrent'],
                                              isLocked && styles['lessonLinkLocked'],
                                            )}
                                            tabIndex={isSectionOpen ? undefined : -1}
                                            to={routePaths.learningLesson(
                                              String(resolvedEnrollmentId),
                                              item.id,
                                            )}
                                          >
                                            <span
                                              aria-hidden='true'
                                              className={classNames(
                                                styles['lessonStatusIcon'],
                                                isItemCompleted &&
                                                  styles['lessonStatusIconCompleted'],
                                                isCurrent &&
                                                  !isItemCompleted &&
                                                  styles['lessonStatusIconCurrent'],
                                                isLocked && styles['lessonStatusIconLocked'],
                                              )}
                                              style={
                                                isItemCompleted
                                                  ? completedStatusStyle
                                                  : isCurrent
                                                    ? playerCurrentLessonIndicatorStyle
                                                    : undefined
                                              }
                                            />
                                            <div className={styles['lessonLinkBody']}>
                                              <div className={styles['lessonBadgeRow']}>
                                                <span className={styles['lessonTypeBadge']}>
                                                  {PLAYER_LESSON_TYPE_LABELS[lesson.deliveryType]}
                                                </span>
                                                {practicumSidebarState ? (
                                                  <span
                                                    className={styles['lessonPracticumBadge']}
                                                    data-tone={practicumSidebarState.tone}
                                                  >
                                                    {practicumLessonBadgeLabel ??
                                                      practicumSidebarState.label}
                                                  </span>
                                                ) : null}
                                                {offlineSidebarState ? (
                                                  <span
                                                    className={styles['lessonPracticumBadge']}
                                                    data-tone={offlineSidebarState.tone}
                                                  >
                                                    {offlineSidebarState.label}
                                                  </span>
                                                ) : null}
                                              </div>
                                              <div className={styles['lessonTitleRow']}>
                                                <strong className={styles['lessonLinkTitle']}>
                                                  {item.title}
                                                </strong>
                                                {lesson.deliveryType !== 'problem' ? (
                                                  <span className={styles['lessonSummaryAction']}>
                                                    {lessonActionLabel}
                                                  </span>
                                                ) : isProblemCompleted ? (
                                                  <span
                                                    className={styles['lessonSummaryAction']}
                                                    data-tone='completed'
                                                  >
                                                    {lessonActionLabel}
                                                  </span>
                                                ) : null}
                                              </div>
                                              {lessonMetaItems.length ? (
                                                <div className={styles['lessonLinkMeta']}>
                                                  {lessonMetaItems.map((metaItem) => (
                                                    <span
                                                      className={styles['lessonLinkDuration']}
                                                      key={`${item.id}-${metaItem}`}
                                                    >
                                                      {metaItem}
                                                    </span>
                                                  ))}
                                                </div>
                                              ) : null}
                                            </div>
                                          </Link>

                                          {isCurrent && lesson.deliveryType === 'problem' ? (
                                            <div className={styles['quizLessonDropdown']}>
                                              {shouldShowQuizQuestionNavigator
                                                ? renderQuizQuestionNavigator()
                                                : null}
                                              {shouldShowQuizNavigatorEmptyText ? (
                                                <p className={styles['quizNavigatorEmptyText']}>
                                                  문제 풀이를 시작하면 문항 목록이 표시됩니다.
                                                </p>
                                              ) : null}
                                              {lesson.latestProblemAttemptId ? (
                                                <Button
                                                  className={styles['quizLessonReportButton']}
                                                  disabled={printProblemReportMutation.isPending}
                                                  onClick={() => {
                                                    if (!lesson.latestProblemAttemptId) {
                                                      return;
                                                    }
                                                    printProblemReportMutation.mutate(
                                                      lesson.latestProblemAttemptId,
                                                    );
                                                  }}
                                                  size='sm'
                                                  type='button'
                                                  variant='primary'
                                                >
                                                  {printProblemReportMutation.isPending
                                                    ? '불러오는 중...'
                                                    : '결과 출력'}
                                                </Button>
                                              ) : null}
                                            </div>
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </section>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {!isQuizQnaDetailActive ? (
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
                      ) : null}
                      <div className={styles['curriculumPanelContent']}>
                        <div className={styles['qnaPanelBody']}>
                          <ProgramQnaPanel
                            allowReplies={false}
                            answerSource='adminOnly'
                            boardLayout='compact'
                            detailDisplay='questionAndAnswers'
                            enabled
                            exclusiveWriteMode
                            hideBoardTitle
                            onCompactDetailActiveChange={setIsQuizQnaDetailActive}
                            programId={qnaProgramId}
                            programThreadCount={qnaContext?.programThreadCount ?? null}
                            showBoardSummary={false}
                            title={curriculumPanelTitle}
                            variant='board'
                          />
                        </div>
                      </div>
                    </>
                  )}
                </aside>
              ) : (
                <aside
                  className={classNames(
                    styles['curriculumPanel'],
                    activeSidebarPanel === 'qna' && styles['curriculumPanelQna'],
                    activeSidebarPanel === 'qna' &&
                      isQnaDetailActive &&
                      styles['curriculumPanelQnaDetail'],
                  )}
                >
                  <div className={styles['curriculumHeader']}>
                    <div className={styles['curriculumHeaderCopy']}>
                      <h2 className={styles['curriculumTitle']}>{curriculumPanelTitle}</h2>
                    </div>
                    {activeSidebarPanel === 'qna' && isQnaDetailActive ? null : (
                      <div className={styles['panelSwitchRow']}>
                        <button
                          aria-label='프로그램 패널'
                          className={classNames(
                            styles['panelSwitchButton'],
                            activeSidebarPanel === 'curriculum' &&
                              styles['panelSwitchButtonActive'],
                          )}
                          onClick={() => {
                            setIsQnaDetailActive(false);
                            setActiveSidebarPanel('curriculum');
                          }}
                          type='button'
                        >
                          <span className={styles['panelSwitchLabel']}>목록</span>
                        </button>
                        <button
                          aria-label='Q&A 패널'
                          className={classNames(
                            styles['panelSwitchButton'],
                            activeSidebarPanel === 'qna' && styles['panelSwitchButtonActive'],
                          )}
                          onClick={() => {
                            setIsQnaDetailActive(false);
                            setActiveSidebarPanel('qna');
                          }}
                          type='button'
                        >
                          <span className={styles['panelSwitchLabel']}>Q&A</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {activeSidebarPanel === 'curriculum' ? (
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
                  ) : null}

                  {activeSidebarPanel === 'curriculum' ? (
                    <div className={styles['curriculumPanelContent']}>
                      <div className={styles['curriculumBody']}>
                        {snapshot.curriculumTrack.sections.map((section) => {
                          const isSectionOpen = expandedCurriculumSectionIds.has(section.id);

                          return (
                            <section
                              className={classNames(
                                styles['sectionBlock'],
                                isSectionOpen && styles['sectionBlockOpen'],
                              )}
                              key={section.id}
                              ref={(node) => {
                                curriculumSectionRefs.current[section.id] = node;
                              }}
                            >
                              <button
                                aria-expanded={isSectionOpen}
                                className={styles['sectionHeader']}
                                onClick={() => {
                                  toggleCurriculumSection(section.id);
                                }}
                                type='button'
                              >
                                <h3 className={styles['sectionTitle']}>{section.title}</h3>
                                <span className={styles['sectionToggle']}>
                                  <span
                                    aria-hidden='true'
                                    className={styles['sectionToggleIcon']}
                                    style={playerChevronDownIconStyle}
                                  />
                                </span>
                              </button>

                              <div
                                className={styles['sectionContent']}
                                aria-hidden={!isSectionOpen}
                              >
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
                                    const isProblemCompleted = quizAttemptedLessonIds.has(
                                      lesson.id,
                                    );
                                    const practicumSidebarState =
                                      lesson.deliveryType === 'practicum'
                                        ? (practicumSidebarStatesByLessonId.get(lesson.id) ?? null)
                                        : null;
                                    const practicumLessonBadgeLabel =
                                      lesson.deliveryType === 'practicum'
                                        ? resolvePracticumLessonBadgeLabel(
                                            practicumLectureByLectureId.get(
                                              snapshot?.lessonPlaybackById[lesson.id]?.lectureId ??
                                                lesson.lectureId ??
                                                -1,
                                            ) ?? null,
                                          )
                                        : null;
                                    const offlineSidebarState = getOfflineSidebarState(lesson);
                                    const lessonSummaryActionLabel = getLessonSummaryActionLabel(
                                      lesson,
                                      practicumSidebarState?.label ?? null,
                                    );
                                    const lessonActionLabel =
                                      lesson.deliveryType === 'problem' && isProblemCompleted
                                        ? '문제 완료'
                                        : lessonSummaryActionLabel;
                                    const lessonMetaItems = getLessonMetaItems(lesson);
                                    const isItemCompleted =
                                      lesson.deliveryType === 'problem'
                                        ? isProblemCompleted
                                        : isCompleted;
                                    const isLocked = lockedLessonIds.has(lesson.id);
                                    const linkContent = (
                                      <>
                                        <span
                                          aria-hidden='true'
                                          className={classNames(
                                            styles['lessonStatusIcon'],
                                            isItemCompleted && styles['lessonStatusIconCompleted'],
                                            isCurrent &&
                                              !isItemCompleted &&
                                              styles['lessonStatusIconCurrent'],
                                            isLocked && styles['lessonStatusIconLocked'],
                                          )}
                                          style={
                                            isItemCompleted
                                              ? completedStatusStyle
                                              : isCurrent
                                                ? playerCurrentLessonIndicatorStyle
                                                : undefined
                                          }
                                        />
                                        <div className={styles['lessonLinkBody']}>
                                          <div className={styles['lessonBadgeRow']}>
                                            <span className={styles['lessonTypeBadge']}>
                                              {PLAYER_LESSON_TYPE_LABELS[lesson.deliveryType]}
                                            </span>
                                            {practicumSidebarState ? (
                                              <span
                                                className={styles['lessonPracticumBadge']}
                                                data-tone={practicumSidebarState.tone}
                                              >
                                                {practicumLessonBadgeLabel ??
                                                  practicumSidebarState.label}
                                              </span>
                                            ) : null}
                                            {offlineSidebarState ? (
                                              <span
                                                className={styles['lessonPracticumBadge']}
                                                data-tone={offlineSidebarState.tone}
                                              >
                                                {offlineSidebarState.label}
                                              </span>
                                            ) : null}
                                          </div>
                                          <div className={styles['lessonTitleRow']}>
                                            <strong className={styles['lessonLinkTitle']}>
                                              {item.title}
                                            </strong>
                                            <span
                                              className={styles['lessonSummaryAction']}
                                              data-tone={
                                                lesson.deliveryType === 'problem' &&
                                                isProblemCompleted
                                                  ? 'completed'
                                                  : undefined
                                              }
                                            >
                                              {lessonActionLabel}
                                            </span>
                                          </div>
                                          {lessonMetaItems.length ? (
                                            <div className={styles['lessonLinkMeta']}>
                                              {lessonMetaItems.map((metaItem) => (
                                                <span
                                                  className={styles['lessonLinkDuration']}
                                                  key={`${item.id}-${metaItem}`}
                                                >
                                                  {metaItem}
                                                </span>
                                              ))}
                                            </div>
                                          ) : null}
                                        </div>
                                      </>
                                    );

                                    return (
                                      <Link
                                        className={classNames(
                                          styles['lessonLink'],
                                          isCurrent && styles['lessonLinkCurrent'],
                                        )}
                                        key={item.id}
                                        tabIndex={isSectionOpen ? undefined : -1}
                                        to={routePaths.learningLesson(
                                          String(resolvedEnrollmentId),
                                          item.id,
                                        )}
                                      >
                                        {linkContent}
                                      </Link>
                                    );
                                  })}
                                </div>
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <>
                      {!isQnaDetailActive ? (
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
                      ) : null}
                      <div className={styles['curriculumPanelContent']}>
                        <div className={styles['qnaPanelBody']}>
                          <ProgramQnaPanel
                            allowReplies={false}
                            answerSource='adminOnly'
                            boardLayout='compact'
                            detailDisplay='questionAndAnswers'
                            enabled
                            exclusiveWriteMode
                            hideBoardTitle
                            onCompactDetailActiveChange={setIsQnaDetailActive}
                            programId={qnaProgramId}
                            programThreadCount={qnaContext?.programThreadCount ?? null}
                            showBoardSummary={false}
                            title={curriculumPanelTitle}
                            variant='board'
                          />
                        </div>
                      </div>
                    </>
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
      {renderPracticumReservationModal()}
      {renderProblemReportModal()}
    </div>
  );
};

export default PlayerPage;
