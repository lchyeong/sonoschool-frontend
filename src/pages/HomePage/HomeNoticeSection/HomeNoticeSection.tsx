import { Link } from 'react-router-dom';

import { useGlobalNoticesQuery } from '@/query/useNoticeQueries';
import { routePaths } from '@/routes/routeRegistry';

import styles from './HomeNoticeSection.module.scss';

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
  }).format(new Date(value));
};

const buildSummary = (content: string): string => {
  const normalized = content.replace(/\s+/g, ' ').trim();

  if (normalized.length <= 92) {
    return normalized;
  }

  return `${normalized.slice(0, 92)}...`;
};

const HomeNoticeSection = () => {
  const noticesQuery = useGlobalNoticesQuery();
  const items = (noticesQuery.data ?? []).slice(0, 3);

  return (
    <section aria-labelledby='home-notice-heading' className={styles['section']}>
      <div className={styles['inner']}>
        <div className={styles['header']}>
          <div className={styles['copyBlock']}>
            <span className={styles['kicker']}>Notice</span>
            <h2 className={styles['title']} id='home-notice-heading'>
              공지사항
            </h2>
            <p className={styles['description']}>
              교육 일정, 수강 안내, 자료 업데이트 소식을 빠르게 확인하세요. 홈페이지에서 최근 공지를
              먼저 보여 주고, 자세한 내용은 게시판으로 연결합니다.
            </p>
          </div>

          <Link className={styles['actionLink']} to={routePaths.notices}>
            공지사항 게시판 보기
          </Link>
        </div>

        {noticesQuery.isError ? (
          <div className={styles['noticeState']}>
            <p className={styles['noticeStateTitle']}>최신 공지를 불러오지 못했습니다.</p>
            <p className={styles['noticeStateDescription']}>
              {noticesQuery.error instanceof Error
                ? noticesQuery.error.message
                : '공지 API 상태를 확인해 주세요.'}
            </p>
          </div>
        ) : (
          <ul aria-label='최신 공지 3개' className={styles['noticeList']}>
            {items.map((item) => {
              return (
                <li className={styles['noticeItem']} key={item.id}>
                  <Link
                    aria-label={`${item.title} 공지 자세히 보기`}
                    className={styles['noticeItemLink']}
                    to={routePaths.noticeDetail(String(item.id))}
                  >
                    <div className={styles['noticeMeta']}>
                      <span className={styles['noticeCategory']}>
                        {item.pinned ? '필독' : '공지'}
                      </span>
                      <span className={styles['noticeDate']}>{formatDate(item.createdAt)}</span>
                    </div>

                    <div className={styles['noticeContent']}>
                      <h3 className={styles['noticeCardTitle']}>{item.title}</h3>
                      <p className={styles['noticeSummary']}>{buildSummary(item.content)}</p>
                    </div>

                    <span aria-hidden='true' className={styles['noticeArrow']}>
                      자세히 보기
                    </span>
                  </Link>
                </li>
              );
            })}

            {!noticesQuery.isPending && !items.length ? (
              <li className={styles['noticeItem']}>
                <div className={styles['noticeState']}>
                  <p className={styles['noticeStateTitle']}>현재 공개 중인 공지가 없습니다.</p>
                  <p className={styles['noticeStateDescription']}>
                    새 공지가 게시되면 이 영역에서 바로 확인할 수 있습니다.
                  </p>
                </div>
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </section>
  );
};

export default HomeNoticeSection;
