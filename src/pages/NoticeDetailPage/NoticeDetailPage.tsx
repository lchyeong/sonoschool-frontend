import { Link, useParams } from 'react-router-dom';

import { useNoticeDetailQuery } from '@/query/useNoticeQueries';
import { routePaths } from '@/routes/routeRegistry';

import styles from './NoticeDetailPage.module.scss';

const formatDate = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const splitContentParagraphs = (content: string): string[] => {
  return content
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
};

const NoticeDetailPage = () => {
  const params = useParams();
  const noticeId = Number(params['noticeId']);
  const resolvedNoticeId = Number.isInteger(noticeId) && noticeId > 0 ? noticeId : null;
  const noticeQuery = useNoticeDetailQuery(resolvedNoticeId);

  if (resolvedNoticeId === null) {
    return (
      <section className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>공지 경로가 올바르지 않습니다.</h1>
        <p className={styles['stateDescription']}>공지사항 목록으로 돌아가 다시 선택해 주세요.</p>
        <Link className={styles['backLink']} to={routePaths.notices}>
          공지사항 목록으로 이동
        </Link>
      </section>
    );
  }

  if (noticeQuery.isPending) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>공지 상세를 불러오는 중입니다.</h1>
        <p className={styles['stateDescription']}>운영 공지 내용을 준비하고 있습니다.</p>
      </section>
    );
  }

  if (noticeQuery.isError || !noticeQuery.data) {
    return (
      <section className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>공지 상세를 불러오지 못했습니다.</h1>
        <p className={styles['stateDescription']}>
          {noticeQuery.error instanceof Error
            ? noticeQuery.error.message
            : '운영 공지 상태를 확인한 뒤 다시 시도해 주세요.'}
        </p>
        <Link className={styles['backLink']} to={routePaths.notices}>
          공지사항 목록으로 이동
        </Link>
      </section>
    );
  }

  const notice = noticeQuery.data;

  return (
    <div className={styles['container']}>
      <div className={styles['hero']}>
        <Link className={styles['backLink']} to={routePaths.notices}>
          공지사항 목록으로 돌아가기
        </Link>
        <div className={styles['metaRow']}>
          {notice.pinned ? <span className={styles['badge']}>필독</span> : null}
          {notice.popup ? <span className={styles['badgeAccent']}>팝업 공지</span> : null}
          <span className={styles['metaText']}>등록일 {formatDate(notice.createdAt)}</span>
        </div>
        <h1 className={styles['title']}>{notice.title}</h1>
        <p className={styles['description']}>
          운영 변경, 일정 안내, 필독 공지를 공지사항 게시판에서 동일한 기준으로 제공합니다.
        </p>
      </div>

      <article className={styles['contentCard']}>
        {splitContentParagraphs(notice.content).map((paragraph) => {
          return (
            <p className={styles['paragraph']} key={paragraph}>
              {paragraph}
            </p>
          );
        })}
      </article>
    </div>
  );
};

export default NoticeDetailPage;
