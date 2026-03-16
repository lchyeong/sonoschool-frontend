import { Link } from 'react-router-dom';

import { routePaths } from '@/routes/routeRegistry';

import styles from './HomeNoticeSection.module.scss';

interface HomeNoticeItem {
  category: string;
  date: string;
  summary: string;
  title: string;
  to: string;
}

const homeNoticeItems: readonly HomeNoticeItem[] = [
  {
    category: '일정',
    date: '2026.03.01',
    summary: '정규과정, 심화과정, 핸즈온 일정과 신청 방법을 한 번에 확인할 수 있습니다.',
    title: '2026 상반기 교육 일정 안내',
    to: routePaths.notices,
  },
  {
    category: '안내',
    date: '2026.03.07',
    summary: '신청 완료부터 수강 준비, 현장 안내까지 자주 묻는 절차를 정리했습니다.',
    title: '수강 신청 및 등록 절차 안내',
    to: routePaths.notices,
  },
  {
    category: '업데이트',
    date: '2026.03.12',
    summary: '강의별 복습 자료와 실습 참고 문서를 확인하는 방법을 안내합니다.',
    title: '수강생 전용 자료실 이용 안내',
    to: routePaths.notices,
  },
] as const;

const HomeNoticeSection = () => {
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

        <ul aria-label='최신 공지 3개' className={styles['noticeList']}>
          {homeNoticeItems.map((item) => {
            return (
              <li className={styles['noticeItem']} key={item.title}>
                <Link
                  aria-label={`${item.title} 공지 자세히 보기`}
                  className={styles['noticeItemLink']}
                  to={item.to}
                >
                  <div className={styles['noticeMeta']}>
                    <span className={styles['noticeCategory']}>{item.category}</span>
                    <span className={styles['noticeDate']}>{item.date}</span>
                  </div>

                  <div className={styles['noticeContent']}>
                    <h3 className={styles['noticeCardTitle']}>{item.title}</h3>
                    <p className={styles['noticeSummary']}>{item.summary}</p>
                  </div>

                  <span aria-hidden='true' className={styles['noticeArrow']}>
                    자세히 보기
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default HomeNoticeSection;
