import { useRef } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { env } from '@/config/env';
import { routePaths } from '@/routes/routeRegistry';

import styles from './CommonFooter.module.scss';

interface FooterNavigationItem {
  label: string;
  to?: string;
  href?: string;
}

interface FooterInfoItem {
  label: string;
  value: string;
  href?: string;
}

const ADMIN_LOGIN_TRIGGER_CLICK_COUNT = 5;
const ADMIN_LOGIN_TRIGGER_WINDOW_MS = 2400;

const footerNavigationItems: readonly FooterNavigationItem[] = [
  { label: '소노스쿨', to: routePaths.home },
  { label: '교육과정', to: routePaths.programs },
  { label: '공지사항', to: routePaths.notices },
  { label: 'Q&A', to: routePaths.qna },
  { label: '자료실', to: routePaths.resources },
  { label: '네이버블로그', href: 'https://blog.naver.com/sonoschool' },
] as const;

const footerInformationLines: readonly (readonly FooterInfoItem[])[] = [
  [
    { label: '상호명', value: '소노스쿨 국제초음파연수원' },
    { label: '대표자', value: '장은희' },
    { label: '사업자 등록번호', value: '139-17-02906' },
  ],
  [
    { label: '통신판매업', value: '2018-성남분당B-0062' },
    { label: '개인정보보호책임자', value: '장은희' },
    { label: '이메일', value: 'sonoschool@naver.com', href: 'mailto:sonoschool@naver.com' },
  ],
  [
    { label: '대표번호', value: '031-934-6224', href: 'tel:0319346224' },
    {
      label: '주소',
      value: '경기도 화성시 동탄구 동탄신리천로5길 79, 3832동 603호',
    },
  ],
] as const;

const footerLegalTexts = ['개인정보처리방침', '쿠키 설정', '이용약관'] as const;

const CommonFooter = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const currentYearText = String(currentYear);
  const adminTriggerClickTimestampsRef = useRef<number[]>([]);

  const handleAdminTriggerClick = () => {
    const now = Date.now();
    const nextClickTimestamps = [...adminTriggerClickTimestampsRef.current, now].filter(
      (timestamp) => now - timestamp <= ADMIN_LOGIN_TRIGGER_WINDOW_MS,
    );

    adminTriggerClickTimestampsRef.current = nextClickTimestamps;

    if (nextClickTimestamps.length < ADMIN_LOGIN_TRIGGER_CLICK_COUNT) {
      return;
    }

    adminTriggerClickTimestampsRef.current = [];
    void navigate(routePaths.adminLogin);
  };

  return (
    <footer className={styles['footer']}>
      <div className={styles['inner']}>
        <div className={styles['contentColumn']}>
          <nav aria-label='푸터 메뉴' className={styles['navigation']}>
            <ul className={styles['navigationList']}>
              {footerNavigationItems.map((item) => {
                return (
                  <li key={item.label}>
                    {item.to ? (
                      <Link className={styles['navigationLink']} to={item.to}>
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        className={styles['navigationLink']}
                        href={item.href}
                        rel='noreferrer noopener'
                        target='_blank'
                      >
                        {item.label}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <section aria-labelledby='common-footer-heading' className={styles['informationBlock']}>
            <h2 className={styles['visuallyHidden']} id='common-footer-heading'>
              소노스쿨 사업자 정보
            </h2>

            <div className={styles['informationLines']}>
              {footerInformationLines.map((line, lineIndex) => {
                return (
                  <p
                    className={styles['informationLine']}
                    key={`footer-line-${String(lineIndex + 1)}`}
                  >
                    {line.map((item, itemIndex) => {
                      return (
                        <span
                          className={styles['informationItem']}
                          key={`${item.label}-${String(itemIndex)}`}
                        >
                          <span className={styles['informationLabel']}>{item.label}: </span>{' '}
                          {item.href ? (
                            <a className={styles['informationLink']} href={item.href}>
                              {item.value}
                            </a>
                          ) : (
                            <span className={styles['informationValue']}>{item.value}</span>
                          )}
                        </span>
                      );
                    })}
                  </p>
                );
              })}
            </div>
          </section>

          <div className={styles['legalRow']}>
            {footerLegalTexts.map((text, index) => {
              return (
                <span className={styles['legalText']} key={`${text}-${String(index)}`}>
                  {text}
                </span>
              );
            })}
            <button
              className={styles['copyrightButton']}
              onClick={handleAdminTriggerClick}
              type='button'
            >
              <span className={styles['copyright']}>
                Copyright © {currentYearText} {env.appName} All rights reserved.
              </span>
            </button>
          </div>
        </div>

        <div className={styles['brandColumn']}>
          <img alt='SONO SCHOOL 로고' className={styles['brandImage']} src='/SRDMS_logo_3x.png' />
        </div>
      </div>
    </footer>
  );
};

export default CommonFooter;
