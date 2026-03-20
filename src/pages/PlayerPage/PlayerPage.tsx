import { useEffect, useMemo, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import Hls from 'hls.js';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { fetchLectureStream } from '@/api/mypage';
import Button from '@/components/ui/Button/Button';
import {
  useMyEnrollmentDetailQuery,
  useMyLearningPlayerSnapshotQuery,
} from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import type { ProtectedLectureStream } from '@/types/mypage';
import { classNames } from '@/utils/classNames';
import { getOrCreatePlaybackDeviceId } from '@/utils/playbackDeviceId';

import {
  flattenLessons,
  formatDateRange,
  formatSeconds,
  getDefaultLessonId,
} from '../LearningPage/learningShared';

import styles from './PlayerPage.module.scss';

const PlayerPage = () => {
  const navigate = useNavigate();
  const params = useParams<{ enrollmentId: string; lessonId: string }>();
  const resolvedEnrollmentId = Number(params.enrollmentId ?? '');
  const isValidEnrollmentId = Number.isInteger(resolvedEnrollmentId) && resolvedEnrollmentId > 0;
  const detailQuery = useMyEnrollmentDetailQuery(
    isValidEnrollmentId ? resolvedEnrollmentId : null,
    isValidEnrollmentId,
  );
  const playerSnapshotQuery = useMyLearningPlayerSnapshotQuery(
    isValidEnrollmentId ? resolvedEnrollmentId : null,
    isValidEnrollmentId,
  );
  const snapshot = playerSnapshotQuery.data;
  const lessons = useMemo(
    () => flattenLessons(snapshot?.curriculumTrack.sections ?? []),
    [snapshot?.curriculumTrack.sections],
  );
  const completedLessonIds = useMemo(
    () => new Set(snapshot?.completedLessonIds ?? []),
    [snapshot?.completedLessonIds],
  );
  const canPlayNativeHls = useMemo(() => {
    if (typeof document === 'undefined') {
      return false;
    }

    const probe = document.createElement('video');
    return Boolean(
      probe.canPlayType('application/vnd.apple.mpegurl') ||
        probe.canPlayType('application/x-mpegURL'),
    );
  }, []);
  const playbackDeviceId = useMemo(() => getOrCreatePlaybackDeviceId(), []);
  const supportsHlsPlayback = Hls.isSupported() || canPlayNativeHls;
  const [playbackErrorsByLessonId, setPlaybackErrorsByLessonId] = useState<
    Record<string, string | undefined>
  >({});
  const videoRef = useRef<HTMLVideoElement | null>(null);
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
  const selectedSource = selectedLesson
    ? snapshot?.lessonPlaybackById[selectedLesson.id] || null
    : null;
  const shouldResumeCurrentLesson =
    selectedLesson?.id === defaultLessonId && (snapshot?.resumeAtSeconds || 0) > 0;
  const activeLectureId =
    detailQuery.data?.active && selectedSource ? selectedSource.lectureId : null;
  const lectureStreamQuery = useQuery<ProtectedLectureStream>({
    queryKey: ['lecture-stream', activeLectureId, playbackDeviceId],
    queryFn: () => fetchLectureStream(activeLectureId as number, playbackDeviceId),
    enabled: activeLectureId !== null,
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

    if (!videoElement || !selectedStreamUrl || !supportsHlsPlayback) {
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
      syncResumeTime();
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
      });
      hls.loadSource(selectedStreamUrl);
      hls.attachMedia(videoElement);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal && selectedLesson) {
          setPlaybackErrorsByLessonId((previous) => ({
            ...previous,
            [selectedLesson.id]: '스트리밍을 재생하지 못했습니다. 잠시 후 다시 시도해 주세요.',
          }));
        }
      });
    } else {
      videoElement.src = selectedStreamUrl;
    }

    return () => {
      videoElement.removeAttribute('src');
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      hls?.destroy();
    };
  }, [
    canPlayNativeHls,
    protectedStream?.hlsUrl,
    selectedLesson,
    shouldResumeCurrentLesson,
    snapshot,
    supportsHlsPlayback,
  ]);

  const isLoading = detailQuery.isLoading || playerSnapshotQuery.isLoading;
  const hasError = detailQuery.isError || playerSnapshotQuery.isError;
  const errorMessage =
    detailQuery.error instanceof Error
      ? detailQuery.error.message
      : playerSnapshotQuery.error instanceof Error
        ? playerSnapshotQuery.error.message
        : '온라인 수강 정보를 불러오지 못했습니다.';
  const isPlaybackBlocked =
    !detailQuery.data ||
    !detailQuery.data.active ||
    !snapshot ||
    lessons.length === 0 ||
    !selectedLesson;

  return (
    <div className={styles['page']}>
      <div className={styles['shell']}>
        <header className={styles['topBar']}>
          <div className={styles['topBarCopy']}>
            <Link
              className={styles['backLink']}
              to={routePaths.learningPlayer(String(resolvedEnrollmentId))}
            >
              강의 대시보드
            </Link>
            <strong className={styles['programTitle']}>
              {detailQuery.data?.programTitle || '온라인 강의'}
            </strong>
          </div>
          {detailQuery.data ? (
            <div className={styles['topBarMeta']}>
              <span className={styles['topBarChip']}>
                진도율 {detailQuery.data.completionRate}%
              </span>
              <span className={styles['topBarText']}>
                {formatDateRange(detailQuery.data.enrolledAt, detailQuery.data.expireAt)}
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
                <div className={styles['playerFrame']}>
                  <video
                    className={styles['playerElement']}
                    controls
                    playsInline
                    poster={selectedSource?.posterUrl ?? undefined}
                    ref={videoRef}
                  />

                  {selectedSource && streamLoading ? (
                    <div className={styles['playerOverlay']}>
                      <p className={styles['overlayTitle']}>보호된 스트리밍을 준비하고 있습니다.</p>
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
                </div>

                <div className={styles['lessonPanel']}>
                  <div className={styles['lessonHeader']}>
                    <div className={styles['lessonCopy']}>
                      <span className={styles['sectionLabel']}>{selectedLesson.sectionTitle}</span>
                      <h1 className={styles['lessonTitle']}>{selectedLesson.title}</h1>
                      <p className={styles['lessonDescription']}>
                        {selectedLesson.description || '강의 설명이 아직 등록되지 않았습니다.'}
                      </p>
                    </div>
                    <div className={styles['lessonMeta']}>
                      <span className={styles['metaChip']}>
                        재생 시간 {selectedLesson.durationLabel}
                      </span>
                      {shouldResumeCurrentLesson ? (
                        <span className={styles['metaChip']}>
                          이어보기 {formatSeconds(snapshot.resumeAtSeconds)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles['actionRow']}>
                    <div className={styles['sequenceGroup']}>
                      {previousLesson ? (
                        <Button
                          onClick={() => {
                            void navigate(
                              routePaths.learningLesson(
                                String(resolvedEnrollmentId),
                                previousLesson.id,
                              ),
                            );
                          }}
                          type='button'
                          variant='secondary'
                        >
                          이전 강의
                        </Button>
                      ) : null}
                      {nextLesson ? (
                        <Button
                          onClick={() => {
                            void navigate(
                              routePaths.learningLesson(
                                String(resolvedEnrollmentId),
                                nextLesson.id,
                              ),
                            );
                          }}
                          type='button'
                        >
                          다음 강의
                        </Button>
                      ) : null}
                    </div>
                    <Link
                      className={styles['dashboardLink']}
                      to={routePaths.learningPlayer(String(resolvedEnrollmentId))}
                    >
                      대시보드로 돌아가기
                    </Link>
                  </div>
                </div>
              </section>

              <aside className={styles['curriculumPanel']}>
                <div className={styles['curriculumHeader']}>
                  <h2 className={styles['curriculumTitle']}>
                    {snapshot.curriculumTrack.title || '커리큘럼'}
                  </h2>
                  <div className={styles['summaryList']}>
                    {snapshot.curriculumTrack.summaryItems.map((item) => (
                      <span className={styles['summaryChip']} key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={styles['sectionList']}>
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
                          const isNext = lesson.id === snapshot.nextLessonId;

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
                              <div className={styles['lessonLinkHeader']}>
                                <strong className={styles['lessonLinkTitle']}>
                                  {lesson.title}
                                </strong>
                                <span className={styles['lessonLinkDuration']}>
                                  {lesson.durationLabel}
                                </span>
                              </div>
                              <div className={styles['badgeRow']}>
                                {isCurrent ? (
                                  <span className={styles['badgeCurrent']}>현재 강의</span>
                                ) : null}
                                {isCompleted ? (
                                  <span className={styles['badgeCompleted']}>완료</span>
                                ) : null}
                                {!isCurrent && isNext ? (
                                  <span className={styles['badgeUpcoming']}>다음</span>
                                ) : null}
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
              <Link
                className={styles['dashboardLink']}
                to={routePaths.learningPlayer(String(resolvedEnrollmentId))}
              >
                강의 대시보드로 돌아가기
              </Link>
            </section>
          )
        ) : null}
      </div>
    </div>
  );
};

export default PlayerPage;
