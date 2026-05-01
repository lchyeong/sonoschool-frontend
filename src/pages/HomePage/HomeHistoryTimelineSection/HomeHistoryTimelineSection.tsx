import { useEffect, useRef } from 'react';

import homeDirectorImageSrc from '@/assets/sample/home_director.png';
import { classNames } from '@/utils/classNames';

import styles from './HomeHistoryTimelineSection.module.scss';

const certifications = [
  { id: 'rdms', name: 'RDMS', detail: 'AB, OB/GYN, PS, BS(Breast)' },
  { id: 'rdcs', name: 'RDCS', detail: 'AE' },
  { id: 'rvt', name: 'RVT', detail: 'Vascular' },
] as const;

const careers = [
  '현) 소노스쿨 국제초음파연수원(SRDMS) 소장',
  '현) 내과·소아과 근무',
  'KAIS 대한초음파국제교류협회 학술위원',
  'KRDMS 한국의료초음파연수원 수석강사',
  'RDMS / PS PART 전임강사',
] as const;

const clamp = (value: number, min = 0, max = 1) => {
  return Math.min(Math.max(value, min), max);
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

    if (!philosophyElement || !directorPanelElement) {
      return undefined;
    }

    const philosophyObserver = new IntersectionObserver(
      ([entry]) => {
        philosophyElement.classList.toggle(styles['philosophyActive'], entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '0px 0px -24% 0px',
        threshold: 0.22,
      },
    );

    philosophyObserver.observe(philosophyElement);

    let animationFrameId = 0;

    const updateDirectorStep = () => {
      animationFrameId = 0;

      const rect = directorPanelElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const revealStart = viewportHeight * 0.82;
      const revealDistance = Math.max(viewportHeight * 2.2, rect.height * 0.94);
      const progress = clamp((revealStart - rect.top) / revealDistance);
      const nextStep = getDirectorStep(progress);
      const currentStep = Number(directorPanelElement.dataset['directorStep'] ?? 0);
      const nextTone = progress >= 0.96 ? 'light' : 'contrast';

      if (directorPanelElement.dataset['followingTone'] !== nextTone) {
        directorPanelElement.dataset['followingTone'] = nextTone;
      }

      if (currentStep === nextStep) {
        return;
      }

      directorPanelElement.dataset['directorStep'] = String(nextStep);
    };

    const requestDirectorStepUpdate = () => {
      if (animationFrameId) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateDirectorStep);
    };

    updateDirectorStep();

    window.addEventListener('scroll', requestDirectorStepUpdate, { passive: true });
    window.addEventListener('resize', requestDirectorStepUpdate);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      philosophyObserver.disconnect();
      window.removeEventListener('scroll', requestDirectorStepUpdate);
      window.removeEventListener('resize', requestDirectorStepUpdate);
    };
  }, []);

  return (
    <section aria-labelledby='home-philosophy-heading' className={styles['section']}>
      <div
        className={classNames(styles['philosophy'], styles['philosophyAnimationRoot'])}
        ref={philosophyRef}
      >
        <div className={styles['philosophyHeadingBlock']}>
          <h2 className={styles['philosophyHeading']} id='home-philosophy-heading'>
            <span>진료 현장에서 즉각 발휘되는</span>
            <span>실전 중심의 초음파 기술을 지향합니다.</span>
          </h2>
        </div>

        <div className={styles['philosophyCopy']}>
          <p className={styles['philosophyLead']}>선명한 스캔, 명확한 진단.</p>
          <p>
            소노스쿨은 장은희 강사가 직접 설계한 엄격한 학습 기준과 1:1 피드백 시스템을 모든 과정에
            일관되게 적용합니다.
          </p>
          <p>기술을 넘어, 더 정확하고 안전한 초음파 문화를 만들어갑니다.</p>
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

              <ul className={styles['careerList']}>
                {careers.map((career) => (
                  <li key={career}>
                    <span>{career.slice(0, 2) === '현)' ? career.slice(0, 2) : ''}</span>
                    {career.slice(0, 2) === '현)' ? career.slice(2) : career}
                  </li>
                ))}
              </ul>

              <div className={styles['certificationBlock']}>
                <p className={styles['certificationTitle']}>보유 국제 자격</p>
                <ul className={styles['certificationList']}>
                  {certifications.map((certification) => (
                    <li key={certification.id}>
                      {certification.name}
                      <span>{certification.detail}</span>
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
