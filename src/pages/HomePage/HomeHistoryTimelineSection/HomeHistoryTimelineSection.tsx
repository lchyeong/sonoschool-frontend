import { useEffect, useRef } from 'react';

import homeDirectorImageSrc from '@/assets/sample/home_director.png';
import { classNames } from '@/utils/classNames';

import styles from './HomeHistoryTimelineSection.module.scss';

const certifications = [
  {
    children: ['ABDOMEN', 'BREAST', 'OB/GYN', 'PEDIATRIC'],
    label: 'RDMS',
  },
  { label: 'RDCS : ECHO' },
  { label: 'RVT : VASTULAR' },
  { label: 'CSRT 임상초음파사(상복부)' },
  { label: 'CSRT 임상초음파사(심장)' },
] as const;

const careers = [
  { label: '현) 소노스쿨 국제초음파연수원(SRDMS) 소장' },
  { label: '현) 내과, 소아과에서 근무' },
  { label: '현) HRD 사업단 교육강사' },
  { label: '전) KAIS 대한초음파국제교류협회 학술위원' },
  { label: '전) KRDMS 한국의료초음파연수원 수석강사' },
  {
    children: [
      '대학병원 의국 교육',
      '(주)제서 파트너십을 통한 전문의 대상 교육',
      '동아ST 파트너십을 통한 전문의 교육',
    ],
    label: '대학병원 의국 및 의사 초음파 교육 (2003~)',
  },
] as const;

const getCareerStatusPrefix = (career: string) => {
  return career.startsWith('현)') || career.startsWith('전)') ? career.slice(0, 2) : '';
};

const clamp = (value: number, min = 0, max = 1) => {
  return Math.min(Math.max(value, min), max);
};

const easeInOutProgress = (value: number) => {
  return value * value * (3 - 2 * value);
};

const getViewportRangeProgress = (
  viewportPosition: number,
  viewportHeight: number,
  startRatio: number,
  endRatio: number,
) => {
  const start = viewportHeight * startRatio;
  const end = viewportHeight * endRatio;

  return clamp((start - viewportPosition) / (start - end));
};

const DIRECTOR_BACKGROUND_RGB = {
  from: [255, 255, 255],
  to: [233, 251, 248],
} as const;

const DIRECTOR_BACKGROUND_EXIT_START_RATIO = 0.8;
const DIRECTOR_BACKGROUND_EXIT_END_RATIO = 0.42;

const getDirectorBackgroundColor = (progress: number) => {
  const [fromRed, fromGreen, fromBlue] = DIRECTOR_BACKGROUND_RGB.from;
  const [toRed, toGreen, toBlue] = DIRECTOR_BACKGROUND_RGB.to;
  const red = Math.round(fromRed + (toRed - fromRed) * progress);
  const green = Math.round(fromGreen + (toGreen - fromGreen) * progress);
  const blue = Math.round(fromBlue + (toBlue - fromBlue) * progress);

  return `rgb(${String(red)} ${String(green)} ${String(blue)})`;
};

const getDirectorStep = (progress: number) => {
  if (progress >= 0.96) {
    return 13;
  }

  if (progress >= 0.9) {
    return 12;
  }

  if (progress >= 0.83) {
    return 11;
  }

  if (progress >= 0.76) {
    return 10;
  }

  if (progress >= 0.69) {
    return 9;
  }

  if (progress >= 0.62) {
    return 8;
  }

  if (progress >= 0.55) {
    return 7;
  }

  if (progress >= 0.48) {
    return 6;
  }

  if (progress >= 0.41) {
    return 5;
  }

  if (progress >= 0.34) {
    return 4;
  }

  if (progress >= 0.27) {
    return 3;
  }

  if (progress >= 0.12) {
    return 2;
  }

  if (progress >= 0.06) {
    return 1;
  }

  return 0;
};

const HomeHistoryTimelineSection = () => {
  const philosophyRef = useRef<HTMLDivElement>(null);
  const directorPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const philosophyElement = philosophyRef.current;
    const directorPanelElement = directorPanelRef.current;
    const noticeElement = document.querySelector<HTMLElement>('[data-home-notice-section]');

    if (!philosophyElement || !directorPanelElement) {
      return undefined;
    }

    let animationFrameId = 0;
    let lastPhilosophyHeadingOpacity = '';
    let lastPhilosophyHeadingY = '';
    let lastPhilosophyCopyOpacity = '';
    let lastPhilosophyCopyY = '';
    let lastBackgroundColor = '';

    const getRangeProgress = (value: number, start: number, end: number) => {
      return clamp((value - start) / (end - start));
    };

    const updateScrollAnimation = () => {
      animationFrameId = 0;

      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const isStackedLayout = window.innerWidth < 1024;
      const isCompactLayout = window.innerWidth < 768;
      const philosophyRect = philosophyElement.getBoundingClientRect();
      const noticeRect = noticeElement?.getBoundingClientRect();
      const philosophyTriggerY =
        viewportHeight * (isCompactLayout ? 0.36 : isStackedLayout ? 0.18 : 0.72);
      const philosophyDistance = Math.max(
        philosophyRect.height -
          viewportHeight * (isCompactLayout ? 0.56 : isStackedLayout ? 0.48 : 0.38),
        1,
      );
      const philosophyProgress = clamp(
        (philosophyTriggerY - philosophyRect.top) / philosophyDistance,
      );
      const headingEnterProgress = getRangeProgress(
        philosophyProgress,
        isCompactLayout ? 0.18 : 0.26,
        isCompactLayout ? 0.34 : 0.38,
      );
      const headingExitProgress = getRangeProgress(philosophyProgress, 0.82, 0.96);
      const copyEnterProgress = getRangeProgress(
        philosophyProgress,
        isCompactLayout ? 0.34 : 0.42,
        isCompactLayout ? 0.72 : 0.58,
      );
      const copyExitProgress = getRangeProgress(philosophyProgress, 0.82, 0.96);
      const backgroundEnterProgress = easeInOutProgress(
        getRangeProgress(philosophyProgress, 0.72, 0.92),
      );
      const headingOpacity = headingEnterProgress * (1 - headingExitProgress);
      const copyOpacity = copyEnterProgress * (1 - copyExitProgress);
      const headingY = 28 * (1 - headingEnterProgress) - 22 * headingExitProgress;
      const copyY = 28 * (1 - copyEnterProgress) - 22 * copyExitProgress;
      const nextPhilosophyHeadingOpacity = headingOpacity.toFixed(4);
      const nextPhilosophyHeadingY = `${headingY.toFixed(2)}px`;
      const nextPhilosophyCopyOpacity = copyOpacity.toFixed(4);
      const nextPhilosophyCopyY = `${copyY.toFixed(2)}px`;
      const rect = directorPanelElement.getBoundingClientRect();
      const revealStart = viewportHeight * (isStackedLayout ? 0.88 : 0.82);
      const revealDistance = isStackedLayout
        ? Math.max(viewportHeight * 1.05, rect.height * 0.58)
        : Math.max(viewportHeight * 2.2, rect.height * 0.94);
      const progress = clamp((revealStart - rect.top) / revealDistance);
      const backgroundExitProgress = noticeRect
        ? easeInOutProgress(
            getViewportRangeProgress(
              noticeRect.top,
              viewportHeight,
              DIRECTOR_BACKGROUND_EXIT_START_RATIO,
              DIRECTOR_BACKGROUND_EXIT_END_RATIO,
            ),
          )
        : 0;
      const backgroundProgress = backgroundEnterProgress * (1 - backgroundExitProgress);
      const nextBackgroundColor = getDirectorBackgroundColor(backgroundProgress);
      const nextStep = getDirectorStep(progress);
      const currentStep = Number(directorPanelElement.dataset['directorStep'] ?? 0);
      const nextTone = backgroundExitProgress >= 0.72 ? 'light' : 'contrast';

      if (lastPhilosophyHeadingOpacity !== nextPhilosophyHeadingOpacity) {
        philosophyElement.style.setProperty(
          '--philosophy-heading-opacity',
          nextPhilosophyHeadingOpacity,
        );
        lastPhilosophyHeadingOpacity = nextPhilosophyHeadingOpacity;
      }

      if (lastPhilosophyHeadingY !== nextPhilosophyHeadingY) {
        philosophyElement.style.setProperty('--philosophy-heading-y', nextPhilosophyHeadingY);
        lastPhilosophyHeadingY = nextPhilosophyHeadingY;
      }

      if (lastPhilosophyCopyOpacity !== nextPhilosophyCopyOpacity) {
        philosophyElement.style.setProperty('--philosophy-copy-opacity', nextPhilosophyCopyOpacity);
        lastPhilosophyCopyOpacity = nextPhilosophyCopyOpacity;
      }

      if (lastPhilosophyCopyY !== nextPhilosophyCopyY) {
        philosophyElement.style.setProperty('--philosophy-copy-y', nextPhilosophyCopyY);
        lastPhilosophyCopyY = nextPhilosophyCopyY;
      }

      if (lastBackgroundColor !== nextBackgroundColor) {
        document.documentElement.style.setProperty('--home-page-background', nextBackgroundColor);
        lastBackgroundColor = nextBackgroundColor;
      }

      if (directorPanelElement.dataset['followingTone'] !== nextTone) {
        directorPanelElement.dataset['followingTone'] = nextTone;
      }

      if (currentStep === nextStep) {
        return;
      }

      directorPanelElement.dataset['directorStep'] = String(nextStep);
    };

    const requestScrollAnimationUpdate = () => {
      if (animationFrameId) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateScrollAnimation);
    };

    updateScrollAnimation();

    window.addEventListener('scroll', requestScrollAnimationUpdate, { passive: true });
    window.addEventListener('resize', requestScrollAnimationUpdate);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener('scroll', requestScrollAnimationUpdate);
      window.removeEventListener('resize', requestScrollAnimationUpdate);
      document.documentElement.style.removeProperty('--home-page-background');
    };
  }, []);

  return (
    <section aria-labelledby='home-philosophy-heading' className={styles['section']}>
      <div
        className={classNames(styles['philosophy'], styles['philosophyAnimationRoot'])}
        ref={philosophyRef}
      >
        <div className={styles['philosophySticky']}>
          <div className={styles['philosophyStage']}>
            <div className={styles['philosophyHeadingBlock']}>
              <h2 className={styles['philosophyHeading']} id='home-philosophy-heading'>
                <span>현장 중심의 생생한 교육으로,</span>
                <span className={styles['nowrapDesktop']}>
                  진료 현장에서 바로 응용할 수 있는 실전 초음파 기술을 구현합니다.
                </span>
              </h2>
            </div>

            <div className={styles['philosophyCopy']}>
              <p className={styles['philosophyLead']}>
                정확한 진단의 시작, 장기를 빠트리지 않는 체계적인 검사
              </p>
              <p>
                국내외 ARDMS 자격을 겸비한 소노그래퍼의 설계 아래,
                <br className={styles['desktopLineBreak']} />
                <span className={styles['nowrapDesktop']}>
                  글로벌 가이드라인을 바탕으로 원장님의 확실한 초음파 검사 기준을 세워드립니다.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className={classNames(styles['directorPanel'], styles['directorPanelAnimationRoot'])}
        data-director-step='0'
        data-following-tone='contrast'
        ref={directorPanelRef}
      >
        <div className={styles['directorSticky']}>
          <div className={styles['directorInner']}>
            <div className={styles['directorCopy']}>
              <div className={styles['directorNameRow']}>
                <h3 className={styles['directorName']}>장은희</h3>
                <p className={styles['directorRole']}>소장</p>
              </div>

              <p className={styles['directorSectionTitle']}>소속 및 주요 활동</p>
              <ul className={styles['careerList']}>
                {careers.map((career) => {
                  const statusPrefix = getCareerStatusPrefix(career.label);

                  return (
                    <li key={career.label}>
                      <span>{statusPrefix}</span>
                      {statusPrefix ? career.label.slice(2) : career.label}
                      {'children' in career ? (
                        <ul className={styles['nestedList']}>
                          {career.children.map((child) => (
                            <li key={child}>{child}</li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              <div className={styles['certificationBlock']}>
                <p className={styles['directorSectionTitle']}>보유 자격 (International Registry)</p>
                <ul className={styles['certificationList']}>
                  {certifications.map((certification) => (
                    <li key={certification.label}>
                      {certification.label}
                      {'children' in certification ? (
                        <ul className={styles['nestedList']}>
                          {certification.children.map((child) => (
                            <li key={child}>{child}</li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={styles['directorImageWrap']}>
              <img
                alt='소노스쿨 장은희 소장'
                className={styles['directorImage']}
                src={homeDirectorImageSrc}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeHistoryTimelineSection;
