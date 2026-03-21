import { useMemo } from 'react';

import { Link, Navigate, useParams } from 'react-router-dom';

import { useMyLearningPlayerSnapshotQuery } from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import sharedStyles from '@/styles/accountPage.module.scss';

import { flattenLessons, getDefaultLessonId } from './learningShared';

const LearningPage = () => {
  const params = useParams<{ enrollmentId: string }>();
  const resolvedEnrollmentId = Number(params.enrollmentId ?? '');
  const isValidEnrollmentId = Number.isInteger(resolvedEnrollmentId) && resolvedEnrollmentId > 0;
  const playerSnapshotQuery = useMyLearningPlayerSnapshotQuery(
    isValidEnrollmentId ? resolvedEnrollmentId : null,
    isValidEnrollmentId,
  );
  const lessons = useMemo(
    () => flattenLessons(playerSnapshotQuery.data?.curriculumTrack.sections ?? []),
    [playerSnapshotQuery.data?.curriculumTrack.sections],
  );
  const enrollmentState = playerSnapshotQuery.data?.enrollment;
  const nextLessonId = getDefaultLessonId(playerSnapshotQuery.data, lessons);
  const isLoading = playerSnapshotQuery.isLoading;
  const hasError = playerSnapshotQuery.isError;
  const errorMessage =
    playerSnapshotQuery.error instanceof Error
      ? playerSnapshotQuery.error.message
      : '온라인 수강 정보를 불러오지 못했습니다.';

  if (!isValidEnrollmentId) {
    return <p className={sharedStyles['mutedText']}>올바른 수강 정보가 아닙니다.</p>;
  }

  if (isLoading) {
    return <p className={sharedStyles['mutedText']}>플레이어로 이동하는 중입니다.</p>;
  }

  if (hasError) {
    return <p className={sharedStyles['mutedText']}>{errorMessage}</p>;
  }

  if (enrollmentState?.active && nextLessonId) {
    return (
      <Navigate
        replace
        to={routePaths.learningLesson(String(resolvedEnrollmentId), nextLessonId)}
      />
    );
  }

  return (
    <section className={sharedStyles['page']}>
      <div className={sharedStyles['shell']}>
        <div className={sharedStyles['surface']}>
          <header className={sharedStyles['header']}>
            <h1 className={sharedStyles['title']}>내 강의</h1>
          </header>
          <p className={sharedStyles['mutedText']}>
            재생 가능한 강의가 없거나 수강 기간이 종료되었습니다.
          </p>
          <Link className={sharedStyles['textLink']} to={routePaths.mypage}>
            내 강의로 돌아가기
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LearningPage;
