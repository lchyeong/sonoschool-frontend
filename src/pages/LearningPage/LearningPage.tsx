import { useMemo } from 'react';

import { Link, useParams } from 'react-router-dom';

import {
  useMyEnrollmentDetailQuery,
  useMyLearningPlayerSnapshotQuery,
} from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import sharedStyles from '@/styles/accountPage.module.scss';
import { classNames } from '@/utils/classNames';

import styles from './LearningPage.module.scss';
import {
  flattenLessons,
  formatDate,
  formatDateRange,
  formatSeconds,
  getDefaultLessonId,
} from './learningShared';

const LearningPage = () => {
  const params = useParams<{ enrollmentId: string }>();
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
  const defaultLessonId = getDefaultLessonId(snapshot, lessons);
  const currentLesson = defaultLessonId
    ? lessons.find((lesson) => lesson.id === defaultLessonId) || null
    : null;
  const nextLesson =
    snapshot?.nextLessonId && lessons.length > 0
      ? lessons.find((lesson) => lesson.id === snapshot.nextLessonId) || null
      : null;
  const completedLessonIds = useMemo(
    () => new Set(snapshot?.completedLessonIds ?? []),
    [snapshot?.completedLessonIds],
  );
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
    !currentLesson;

  return (
    <div className={sharedStyles['page']}>
      <div className={classNames(sharedStyles['shell'], styles['shell'])}>
        <div className={styles['surface']}>
          <header className={styles['hero']}>
            <div className={styles['heroCopy']}>
              <p className={styles['eyebrow']}>Learning Dashboard</p>
              <h1 className={styles['title']}>온라인 수강 대시보드</h1>
              <p className={styles['description']}>
                전체 진도와 커리큘럼을 확인하고, 이어보기 흐름으로 바로 학습을 시작할 수 있습니다.
              </p>
            </div>

            <Link className={styles['backLink']} to={routePaths.mypage}>
              내 강의로 돌아가기
            </Link>
          </header>

          {!isValidEnrollmentId ? (
            <p className={sharedStyles['mutedText']}>올바른 수강 정보가 아닙니다.</p>
          ) : null}

          {isValidEnrollmentId && isLoading ? (
            <p className={sharedStyles['mutedText']}>온라인 수강 정보를 불러오는 중입니다.</p>
          ) : null}

          {isValidEnrollmentId && hasError ? (
            <p className={styles['errorText']}>{errorMessage}</p>
          ) : null}

          {isValidEnrollmentId && !isLoading && !hasError && detailQuery.data ? (
            <>
              <section className={styles['heroCard']}>
                <div className={styles['heroMain']}>
                  <div className={styles['heroMainCopy']}>
                    <span className={styles['statusChip']}>
                      {detailQuery.data.active ? '수강 중' : '수강 불가'}
                    </span>
                    <h2 className={styles['programTitle']}>{detailQuery.data.programTitle}</h2>
                    <p className={styles['programSummary']}>
                      {currentLesson
                        ? `${currentLesson.sectionTitle}의 ${currentLesson.title}부터 이어서 학습할 수 있습니다.`
                        : '커리큘럼이 준비되는 대로 이곳에서 바로 학습을 시작할 수 있습니다.'}
                    </p>
                  </div>

                  {currentLesson && !isPlaybackBlocked ? (
                    <Link
                      className={styles['primaryAction']}
                      to={routePaths.learningLesson(String(detailQuery.data.id), currentLesson.id)}
                    >
                      이어보기
                    </Link>
                  ) : null}
                </div>

                <div className={styles['heroMeta']}>
                  <div className={styles['heroMetaItem']}>
                    <span className={styles['heroMetaLabel']}>수강 기간</span>
                    <strong className={styles['heroMetaValue']}>
                      {formatDateRange(detailQuery.data.enrolledAt, detailQuery.data.expireAt)}
                    </strong>
                  </div>
                  <div className={styles['heroMetaItem']}>
                    <span className={styles['heroMetaLabel']}>최근 학습</span>
                    <strong className={styles['heroMetaValue']}>
                      {formatDate(snapshot?.lastPlaybackAt)}
                    </strong>
                  </div>
                </div>
              </section>

              {!isPlaybackBlocked ? (
                <>
                  <section className={styles['overviewGrid']}>
                    <article className={styles['overviewCard']}>
                      <span className={styles['overviewLabel']}>진도율</span>
                      <strong className={styles['overviewValue']}>
                        {detailQuery.data.completionRate}%
                      </strong>
                    </article>
                    <article className={styles['overviewCard']}>
                      <span className={styles['overviewLabel']}>완료 강의</span>
                      <strong className={styles['overviewValue']}>
                        {detailQuery.data.completedLectures} / {detailQuery.data.totalLectures}
                      </strong>
                    </article>
                    <article className={styles['overviewCard']}>
                      <span className={styles['overviewLabel']}>이어보기</span>
                      <strong className={styles['overviewValue']}>
                        {snapshot.resumeAtSeconds > 0
                          ? formatSeconds(snapshot.resumeAtSeconds)
                          : '준비됨'}
                      </strong>
                    </article>
                    <article className={styles['overviewCard']}>
                      <span className={styles['overviewLabel']}>다음 강의</span>
                      <strong className={styles['overviewValueText']}>
                        {nextLesson?.title || '마지막 강의'}
                      </strong>
                    </article>
                  </section>

                  <section className={styles['contentGrid']}>
                    <article className={styles['focusCard']}>
                      <div className={styles['focusHeader']}>
                        <div className={styles['focusCopy']}>
                          <span className={styles['focusEyebrow']}>Current Lesson</span>
                          <h2 className={styles['focusTitle']}>{currentLesson.title}</h2>
                          <p className={styles['focusDescription']}>
                            {currentLesson.description ||
                              '현재 강의 설명이 아직 등록되지 않았습니다.'}
                          </p>
                        </div>
                        <div className={styles['focusMeta']}>
                          <span className={styles['focusChip']}>{currentLesson.durationLabel}</span>
                          <span className={styles['focusChip']}>{currentLesson.sectionTitle}</span>
                        </div>
                      </div>

                      <div className={styles['focusFooter']}>
                        <div className={styles['focusBadgeRow']}>
                          {snapshot.curriculumTrack.summaryItems.map((item) => (
                            <span className={styles['summaryChip']} key={item}>
                              {item}
                            </span>
                          ))}
                        </div>
                        <Link
                          className={styles['secondaryAction']}
                          to={routePaths.learningLesson(
                            String(detailQuery.data.id),
                            currentLesson.id,
                          )}
                        >
                          학습 화면 열기
                        </Link>
                      </div>
                    </article>

                    <article className={styles['sideCard']}>
                      <h2 className={styles['sideTitle']}>학습 흐름</h2>
                      <div className={styles['sideStack']}>
                        <div className={styles['sideItem']}>
                          <span className={styles['sideItemLabel']}>현재 강의</span>
                          <strong className={styles['sideItemValue']}>{currentLesson.title}</strong>
                        </div>
                        <div className={styles['sideItem']}>
                          <span className={styles['sideItemLabel']}>다음 강의</span>
                          <strong className={styles['sideItemValue']}>
                            {nextLesson?.title || '마지막 단계입니다.'}
                          </strong>
                        </div>
                        <div className={styles['sideItem']}>
                          <span className={styles['sideItemLabel']}>최근 이어본 지점</span>
                          <strong className={styles['sideItemValue']}>
                            {snapshot.resumeAtSeconds > 0
                              ? formatSeconds(snapshot.resumeAtSeconds)
                              : '기록 없음'}
                          </strong>
                        </div>
                      </div>
                    </article>
                  </section>

                  <section className={styles['curriculumCard']}>
                    <div className={styles['curriculumHeader']}>
                      <div className={styles['curriculumCopy']}>
                        <p className={styles['curriculumEyebrow']}>Curriculum</p>
                        <h2 className={styles['curriculumTitle']}>
                          {snapshot.curriculumTrack.title || '커리큘럼'}
                        </h2>
                      </div>
                      <strong className={styles['curriculumSummary']}>
                        총 {lessons.length}개 강의
                      </strong>
                    </div>

                    <div className={styles['sectionList']}>
                      {snapshot.curriculumTrack.sections.map((section) => (
                        <section className={styles['sectionCard']} key={section.id}>
                          <div className={styles['sectionHeader']}>
                            <div>
                              <h3 className={styles['sectionTitle']}>{section.title}</h3>
                              {section.description ? (
                                <p className={styles['sectionDescription']}>
                                  {section.description}
                                </p>
                              ) : null}
                            </div>
                            <span className={styles['sectionMeta']}>{section.durationLabel}</span>
                          </div>

                          <div className={styles['lessonList']}>
                            {section.lessons.map((lesson) => {
                              const isCurrent = lesson.id === currentLesson.id;
                              const isCompleted = completedLessonIds.has(lesson.id);
                              const isNext = lesson.id === snapshot.nextLessonId;

                              return (
                                <Link
                                  className={classNames(
                                    styles['lessonRow'],
                                    isCurrent && styles['lessonRowCurrent'],
                                  )}
                                  key={lesson.id}
                                  to={routePaths.learningLesson(
                                    String(detailQuery.data.id),
                                    lesson.id,
                                  )}
                                >
                                  <div className={styles['lessonRowMain']}>
                                    <strong className={styles['lessonTitle']}>
                                      {lesson.title}
                                    </strong>
                                    <div className={styles['lessonBadgeRow']}>
                                      {isCurrent ? (
                                        <span className={styles['lessonBadgeCurrent']}>
                                          현재 강의
                                        </span>
                                      ) : null}
                                      {isCompleted ? (
                                        <span className={styles['lessonBadgeCompleted']}>완료</span>
                                      ) : null}
                                      {!isCurrent && isNext ? (
                                        <span className={styles['lessonBadgeUpcoming']}>다음</span>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className={styles['lessonRowMeta']}>
                                    <span className={styles['lessonDuration']}>
                                      {lesson.durationLabel}
                                    </span>
                                    <span className={styles['lessonAction']}>학습하기</span>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  </section>
                </>
              ) : (
                <section className={styles['blockedCard']}>
                  <h2 className={styles['blockedTitle']}>지금은 재생할 수 없습니다.</h2>
                  <p className={styles['blockedDescription']}>
                    수강 상태가 종료되었거나 재생 가능한 온라인 콘텐츠가 아직 준비되지 않았습니다.
                  </p>
                </section>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default LearningPage;
