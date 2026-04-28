import homeLectureImage1Src from '@/assets/sample/home_lecture_1.jpg';
import homeLectureImage2Src from '@/assets/sample/home_lecture_2.png';
import homeLectureImage3Src from '@/assets/sample/home_lecture_3.jpg';
import homeLectureImage4Src from '@/assets/sample/home_lecture_4.jpg';
import homeLectureImage5Src from '@/assets/sample/home_lecture_5.jpg';

import styles from './HomeFeatureShowcaseSection.module.scss';

const homeFeatureShowcaseCards = [
  {
    description: '의국을 대상으로 초음파 교육을 진행하기 시작했습니다.',
    id: 'home-feature-showcase-card-1',
    imageAlt: '소노스쿨 교육 현장 1',
    imageSrc: homeLectureImage1Src,
    title: '교육 현장',
  },
  {
    description: '의국을 대상으로 초음파 교육을 진행하기 시작했습니다.',
    id: 'home-feature-showcase-card-2',
    imageAlt: '소노스쿨 교육 현장 2',
    imageSrc: homeLectureImage2Src,
    title: '교육 현장',
  },
  {
    description: '의국을 대상으로 초음파 교육을 진행하기 시작했습니다.',
    id: 'home-feature-showcase-card-3',
    imageAlt: '소노스쿨 교육 현장 3',
    imageSrc: homeLectureImage3Src,
    title: '교육 현장',
  },
  {
    description: '의국을 대상으로 초음파 교육을 진행하기 시작했습니다.',
    id: 'home-feature-showcase-card-4',
    imageAlt: '소노스쿨 교육 현장 4',
    imageSrc: homeLectureImage4Src,
    title: '교육 현장',
  },
  {
    description: '의국을 대상으로 초음파 교육을 진행하기 시작했습니다.',
    id: 'home-feature-showcase-card-5',
    imageAlt: '소노스쿨 교육 현장 5',
    imageSrc: homeLectureImage5Src,
    title: '교육 현장',
  },
] as const;

const HomeFeatureShowcaseSection = () => {
  return (
    <section aria-labelledby='home-feature-showcase-heading' className={styles['section']}>
      <div className={styles['intro']}>
        <h2 className={styles['introHeading']} id='home-feature-showcase-heading'>
          <span>의료진의 성장을 위한</span>
          <span>선명한 초음파 교육,</span>
          <span>소노스쿨입니다.</span>
        </h2>
      </div>

      <div className={styles['showcasePanel']}>
        <div className={styles['inner']}>
          <div className={styles['copyColumn']}>
            <h3 className={styles['heading']}>SINCE 2003</h3>

            <p className={styles['description']}>
              의사 교육 전문 국제 자격으로 증명된 차별화된 코칭을 경험하세요.
            </p>

            <a className={styles['courseLink']} href='/programs'>
              <span>과정 살펴보기</span>
              <span aria-hidden='true' className={styles['courseLinkArrow']} />
            </a>
          </div>

          <ul aria-label='소노스쿨 교육 현장 이미지 5개' className={styles['cardList']}>
            {homeFeatureShowcaseCards.map((card) => (
              <li className={styles['cardItem']} key={card.id}>
                <article className={styles['card']}>
                  <img alt={card.imageAlt} className={styles['cardImage']} src={card.imageSrc} />
                  <div aria-hidden='true' className={styles['cardOverlay']} />

                  <div className={styles['cardCopy']}>
                    <span aria-hidden='true' className={styles['cardDivider']} />
                    <div className={styles['cardTextBlock']}>
                      <p className={styles['cardTitle']}>{card.title}</p>
                      <p className={styles['cardDescription']}>{card.description}</p>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>

        <p className={styles['panelClosing']}>
          <span>진료의 확신을 완성하는</span>
          <span>초음파 교육, 소노스쿨</span>
        </p>
      </div>
    </section>
  );
};

export default HomeFeatureShowcaseSection;
