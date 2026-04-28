import { Link } from 'react-router-dom';

import { useGlobalNoticesQuery } from '@/query/useNoticeQueries';
import { routePaths } from '@/routes/routeRegistry';

import styles from './HomeNoticeSection.module.scss';

const formatDate = (value: string): string => {
  const date = new Date(value);
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
};

const HomeNoticeSection = () => {
  const noticesQuery = useGlobalNoticesQuery();
  const items = (noticesQuery.data ?? []).slice(0, 4);

  return (
    <section aria-labelledby='home-notice-heading' className={styles['section']}>
      <div className={styles['inner']}>
        <div className={styles['layout']}>
          <div className={styles['header']}>
            <div className={styles['headingBlock']}>
              <h2 className={styles['heading']} id='home-notice-heading'>
                <span>변화하는 진료 현장에 맞춰</span>
                <span>소노스쿨의 새로운 소식을 전합니다.</span>
              </h2>
              <p className={styles['description']}>
                더 나은 교육을 위한 소노스쿨의 발걸음을 공지사항에서 확인하세요.
              </p>
            </div>

            <Link
              aria-label='공지사항 게시판 보기'
              className={styles['boardLink']}
              to={routePaths.notices}
            >
              <span className={styles['boardLinkLabel']}>게시판 보기</span>
              <span aria-hidden='true' className={styles['boardLinkArrowFrame']}>
                <svg
                  className={styles['boardLinkArrowIcon']}
                  fill='none'
                  focusable='false'
                  viewBox='0 0 24 24'
                >
                  <path
                    d='M5 12H19'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                  />
                  <path
                    d='M12 5L19 12L12 19'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                  />
                </svg>
              </span>
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
            <div className={styles['noticeRail']}>
              <span aria-hidden='true' className={styles['noticeRailTopLine']} />

              <ul aria-label='최신 공지 4개' className={styles['noticeList']}>
                {items.map((item) => {
                  return (
                    <li className={styles['noticeItem']} key={item.id}>
                      <Link
                        aria-label={`${item.title} 공지 자세히 보기`}
                        className={styles['noticeItemLink']}
                        to={routePaths.noticeDetail(String(item.id))}
                      >
                        <h3 className={styles['noticeCardTitle']}>{item.title}</h3>
                        <span className={styles['noticeDate']}>{formatDate(item.createdAt)}</span>
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
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HomeNoticeSection;
