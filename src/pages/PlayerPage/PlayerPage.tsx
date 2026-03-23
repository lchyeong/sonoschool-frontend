import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import Hls from 'hls.js';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { fetchLectureStream, saveLectureProgress, sendLectureProgressBeacon } from '@/api/mypage';
import iconCheck from '@/assets/icons/icon_check.png';
import iconNextPlay from '@/assets/icons/icon_next_play_48.png';
import iconBack from '@/assets/icons/icons8-왼쪽-64.png';
import Button from '@/components/ui/Button/Button';
import { useMyLearningPlayerSnapshotQuery } from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import type { LearningPlayerLessonProgress, ProtectedLectureStream } from '@/types/mypage';
import { classNames } from '@/utils/classNames';
import { getOrCreatePlaybackDeviceId } from '@/utils/playbackDeviceId';

import {
  flattenLessons,
  formatDateRange,
  getDefaultLessonId,
} from '../LearningPage/learningShared';

import styles from './PlayerPage.module.scss';

type LessonStatusStyle = CSSProperties & {
  '--lesson-check-icon'?: string;
};

interface QualityOption {
  label: string;
  levelIndex: number | 'auto';
}

const PLAYBACK_SPEED_OPTIONS = [0.8, 1, 1.25, 1.5] as const;
const DEFAULT_QUALITY_OPTIONS: QualityOption[] = [{ label: '자동', levelIndex: 'auto' }];
const PROGRESS_SAVE_INTERVAL_SECONDS = 30;
const PROGRESS_SAVE_MIN_DELTA_SECONDS = 20;
const PROGRESS_EXIT_SAVE_MIN_DELTA_SECONDS = 5;

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

const PlayerPage = () => {
  const navigate = useNavigate();
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
  const [mediaDurationSeconds, setMediaDurationSeconds] = useState(0);
  const [progressSaveError, setProgressSaveError] = useState<string | null>(null);
  const [lessonProgressByLessonId, setLessonProgressByLessonId] = useState<
    Partial<Record<string, LearningPlayerLessonProgress>>
  >({});
  const hlsRef = useRef<Hls | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const lastSavedProgressRef = useRef<Record<number, number>>({});
  const saveInFlightRef = useRef<Record<number, boolean>>({});
  const progressTimerRef = useRef<number | null>(null);
  const defaultLessonId = getDefaultLessonId(snapshot, lessons);
  const resolvedLessonId = lessons.some((lesson) => lesson.id === params.lessonId)
    ? params.lessonId
    : defaultLessonId;
  const selectedLesson = resolvedLessonId
    ? lessons.find((lesson) => lesson.id === resolvedLessonId) || null
    : null;
  const selectedLessonIndex = selectedLesson
    ? lessons.findIndex((lesson) => lesson.id === selectedLesson.id)
    : -1;
  const previousLesson = selectedLessonIndex > 0 ? lessons[selectedLessonIndex - 1] : null;
  const nextLesson =
    selectedLessonIndex >= 0 && selectedLessonIndex + 1 < lessons.length
      ? lessons[selectedLessonIndex + 1]
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
  const shouldResumeCurrentLesson =
    selectedLesson?.id === defaultLessonId && (snapshot?.resumeAtSeconds || 0) > 0;
  const totalLessonCount = lessons.length;
  const completedLessonCount = completedLessonIds.size;
  const completedRatio =
    totalLessonCount > 0 ? Math.round((completedLessonCount / totalLessonCount) * 100) : 0;
  const isUnsupportedPlayback = Boolean(selectedSource) && !supportsHlsPlayback;
  const activeLectureId =
    enrollmentState?.active && selectedSource ? selectedSource.lectureId : null;
  const lectureStreamQuery = useQuery<ProtectedLectureStream>({
    queryKey: ['lecture-stream', activeLectureId, playbackDeviceId],
    queryFn: () => fetchLectureStream(activeLectureId as number, playbackDeviceId),
    enabled: activeLectureId !== null && supportsHlsPlayback,
    retry: false,
  });
  const protectedStream = lectureStreamQuery.data ?? null;
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

  const persistProgress = async (
    nextWatchedSeconds: number,
    force = false,
    minDeltaSeconds = PROGRESS_SAVE_MIN_DELTA_SECONDS,
  ) => {
    if (!selectedSource || !selectedLesson || !isValidEnrollmentId) {
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
  };

  const queueProgressBeacon = (nextWatchedSeconds: number) => {
    if (!selectedSource || !isValidEnrollmentId) {
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
  };

  useEffect(() => {
    const initialProgress: Record<number, number> = {};
    Object.values(snapshot?.lessonProgressByLessonId ?? {}).forEach((progress) => {
      initialProgress[progress.lectureId] = progress.watchedSeconds;
    });
    lastSavedProgressRef.current = initialProgress;
    setLessonProgressByLessonId(snapshot?.lessonProgressByLessonId ?? {});
  }, [snapshot?.lessonProgressByLessonId]);

  useEffect(() => {
    setProgressSaveError(null);
    setMediaDurationSeconds(0);
    if (!selectedSource) {
      return;
    }
  }, [selectedSource]);

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
      lessons.length > 0 &&
      params.lessonId !== resolvedLessonId
    ) {
      void navigate(
        routePaths.learningLesson(String(resolvedEnrollmentId), resolvedLessonId || ''),
        {
          replace: true,
        },
      );
    }
  }, [
    isValidEnrollmentId,
    lessons.length,
    navigate,
    params.lessonId,
    resolvedEnrollmentId,
    resolvedLessonId,
    snapshot,
  ]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const selectedStreamUrl = protectedStream?.hlsUrl ?? '';

    setQualityOptions(DEFAULT_QUALITY_OPTIONS);
    setSelectedQualityLevel('auto');
    hlsRef.current = null;

    if (!videoElement || !selectedStreamUrl || !supportsHlsPlayback) {
      return;
    }

    let hls: Hls | null = null;
    const currentStream = protectedStream;

    if (!currentStream) {
      return;
    }

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

    const ProtectedLoader = createProtectedHlsLoader(currentStream.hlsKeyUrl);
    hls = new Hls({
      enableWorker: true,
      loader: ProtectedLoader,
      xhrSetup: (xhr, url) => {
        xhr.withCredentials = true;

        if (url === currentStream.hlsKeyUrl) {
          xhr.setRequestHeader('X-Playback-Session-Token', currentStream.playbackSessionToken);
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
    protectedStream?.hlsKeyUrl,
    protectedStream?.hlsUrl,
    protectedStream?.playbackSessionToken,
    resolvedEnrollmentId,
    selectedLesson,
    shouldResumeCurrentLesson,
    snapshot,
    supportsHlsPlayback,
  ]);

  const isLoading = playerSnapshotQuery.isLoading;
  const hasError = playerSnapshotQuery.isError;
  const errorMessage =
    playerSnapshotQuery.error instanceof Error
      ? playerSnapshotQuery.error.message
      : '온라인 수강 정보를 불러오지 못했습니다.';
  const isPlaybackBlocked =
    !enrollmentState || !enrollmentState.active || lessons.length === 0 || !selectedLesson;

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
                <section className={styles['stageCard']}>
                  <div className={styles['stageHeader']}>
                    <div className={styles['stageCopy']}>
                      <h1 className={styles['lessonTitle']}>{selectedLesson.title}</h1>
                      {progressSaveError ? (
                        <p className={styles['stageProgressWarning']}>{progressSaveError}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles['playerShell']}>
                    <div className={styles['playerFrame']}>
                      <video
                        className={styles['playerElement']}
                        controls
                        controlsList='nodownload noremoteplayback'
                        disablePictureInPicture
                        disableRemotePlayback
                        playsInline
                        poster={selectedSource?.posterUrl ?? undefined}
                        preload='auto'
                        ref={videoRef}
                      />

                      {selectedSource && streamLoading ? (
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
                          <p className={styles['overlayTitle']}>재생할 강의를 찾을 수 없습니다.</p>
                        </div>
                      ) : null}

                      {playerError ? (
                        <div className={styles['playerErrorBanner']}>
                          <p className={styles['playerErrorText']}>{playerError}</p>
                        </div>
                      ) : null}

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
                                  <strong className={styles['settingsTitle']}>재생 속도</strong>
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
                    </div>

                    <div className={styles['playerToolbar']}>
                      <div className={styles['sequenceGroup']}>
                        {previousLesson ? (
                          <Button
                            className={styles['transportButton']}
                            onClick={() => {
                              void navigate(
                                routePaths.learningLesson(
                                  String(resolvedEnrollmentId),
                                  previousLesson.id,
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
                        {nextLesson ? (
                          <Button
                            className={styles['transportButton']}
                            onClick={() => {
                              void navigate(
                                routePaths.learningLesson(
                                  String(resolvedEnrollmentId),
                                  nextLesson.id,
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
              </section>

              <aside className={styles['curriculumPanel']}>
                <div className={styles['curriculumHeader']}>
                  <div className={styles['curriculumHeaderCopy']}>
                    <h2 className={styles['curriculumTitle']}>커리큘럼</h2>
                  </div>
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
                </div>

                <div className={styles['curriculumBody']}>
                  {snapshot.curriculumTrack.sections.map((section) => (
                    <section className={styles['sectionBlock']} key={section.id}>
                      <div className={styles['sectionHeader']}>
                        <h3 className={styles['sectionTitle']}>{section.title}</h3>
                        <span className={styles['sectionMeta']}>{section.durationLabel}</span>
                      </div>

                      <div className={styles['lessonList']}>
                        {section.lessons.map((lesson) => {
                          const isCurrent = lesson.id === selectedLesson.id;
                          const isCompleted = completedLessonIds.has(lesson.id);

                          return (
                            <Link
                              className={classNames(
                                styles['lessonLink'],
                                isCurrent && styles['lessonLinkCurrent'],
                              )}
                              key={lesson.id}
                              to={routePaths.learningLesson(
                                String(resolvedEnrollmentId),
                                lesson.id,
                              )}
                            >
                              <span
                                aria-hidden='true'
                                className={classNames(
                                  styles['lessonStatusIcon'],
                                  isCompleted && styles['lessonStatusIconCompleted'],
                                  isCurrent && styles['lessonStatusIconCurrent'],
                                )}
                                style={isCompleted ? completedStatusStyle : undefined}
                              />
                              <div className={styles['lessonLinkHeader']}>
                                <strong className={styles['lessonLinkTitle']}>
                                  {lesson.title}
                                </strong>
                                <div className={styles['lessonLinkMeta']}>
                                  <span className={styles['lessonLinkDuration']}>
                                    {lesson.durationLabel}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </aside>
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
