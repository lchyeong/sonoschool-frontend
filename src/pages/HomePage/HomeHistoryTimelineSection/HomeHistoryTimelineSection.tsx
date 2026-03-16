import { useHomeHistoryTimelineQuery } from '@/query/useHomeHistoryTimelineQuery';

import styles from './HomeHistoryTimelineSection.module.scss';

export interface HomeHistoryTimelineSectionProps {
  siteKey: string;
}

const HomeHistoryTimelineSection = ({ siteKey }: HomeHistoryTimelineSectionProps) => {
  const { data, isError, isPending } = useHomeHistoryTimelineQuery(siteKey);
  const timelineItems = data?.items ?? [];

  if (isPending) {
    return (
      <section
        aria-busy='true'
        aria-labelledby='home-history-timeline-heading'
        className={styles['section']}
      >
        <div className={styles['inner']}>
          <h2 className={styles['srOnly']} id='home-history-timeline-heading'>
            소노스쿨 연혁
          </h2>

          <div className={styles['statusPanel']}>
            <p className={styles['statusTitle']}>연혁을 불러오는 중입니다.</p>
            <p className={styles['statusDescription']}>
              연혁 API 응답을 받아 타임라인을 구성하고 있습니다.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (isError || !timelineItems.length) {
    return (
      <section aria-labelledby='home-history-timeline-heading' className={styles['section']}>
        <div className={styles['inner']}>
          <h2 className={styles['srOnly']} id='home-history-timeline-heading'>
            소노스쿨 연혁
          </h2>

          <div className={styles['statusPanel']}>
            <p className={styles['statusTitle']}>연혁을 표시할 수 없습니다.</p>
            <p className={styles['statusDescription']}>
              연혁 데이터 응답을 확인한 뒤 다시 시도해 주세요.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby='home-history-timeline-heading' className={styles['section']}>
      <div className={styles['inner']}>
        <h2 className={styles['srOnly']} id='home-history-timeline-heading'>
          소노스쿨 연혁
        </h2>

        <ol aria-label='소노스쿨 연혁 타임라인' className={styles['timelineList']}>
          {timelineItems.map((item, itemIndex) => {
            const isTimelineStartItem = itemIndex === 0;

            return (
              <li
                className={`${styles['timelineItem']} ${
                  isTimelineStartItem ? styles['timelineItemStart'] : ''
                }`}
                key={`${item.year}-${item.title}`}
              >
                <div className={styles['timelineYearColumn']}>
                  <span className={styles['timelineYear']}>{item.year}</span>
                </div>

                <div className={styles['timelineMarkerColumn']}>
                  <span aria-hidden='true' className={styles['timelineMarker']} />
                </div>

                <div className={styles['timelineContent']}>
                  <p className={styles['timelineTitle']}>{item.title}</p>
                  <p className={styles['timelineDescription']}>{item.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

export default HomeHistoryTimelineSection;
