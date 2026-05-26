import { useRef, useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import LegalPolicyModal from '@/components/policy/LegalPolicyModal';
import { routePaths } from '@/routes/routeRegistry';

import styles from './CommonFooter.module.scss';

interface FooterNavigationItem {
  label: string;
  to?: string;
  href?: string;
  width: number;
}

interface FooterInfoItem {
  label: string;
  value: string;
  href?: string;
}

const ADMIN_LOGIN_TRIGGER_CLICK_COUNT = 5;
const ADMIN_LOGIN_TRIGGER_WINDOW_MS = 2400;

const footerNavigationItems: readonly FooterNavigationItem[] = [
  { label: '소노스쿨', to: routePaths.home, width: 62 },
  { label: '교육과정', to: routePaths.homeFeaturedCourses, width: 62 },
  { label: '교육후기', to: routePaths.reviews, width: 62 },
  { label: '공지사항', to: routePaths.notices, width: 62 },
  { label: 'Q&A', to: routePaths.qna, width: 38 },
  { label: '자료실', to: routePaths.resources, width: 46 },
  { label: '네이버블로그', href: 'https://blog.naver.com/sonoschool', width: 92 },
] as const;

const footerInformationLines: readonly (readonly FooterInfoItem[])[] = [
  [
    { label: '상호명', value: '소노스쿨 국제초음파연수원' },
    { label: '대표자', value: '장은희' },
    {
      label: '주소',
      value: '경기도 화성시 동탄구 동탄지성로 17, B1층 101호(반송동, 동탄 위버폴리스)',
    },
  ],
  [
    { label: '통신판매업', value: '2018-성남분당B-0062' },
    { label: '개인정보보호책임자', value: '장은희' },
    { label: '사업자 등록번호', value: '139-17-02906' },
  ],
  [
    { label: '대표 번호', value: '010-3859-8070' },
    { label: '이메일', value: 'sonoschool@naver.com' },
  ],
] as const;

const footerLegalItems = [
  { text: '이용약관', modalType: 'terms' },
  { text: '개인정보처리방침', modalType: 'privacy' },
] as const;
const footerCopyrightText =
  'Copyright 2026 소노스쿨 국제초음파연수원. All right reserved. Built by newzest studio.';

const footerCompanyInformationItems = footerInformationLines[0];
const footerBusinessInformationItems = footerInformationLines.slice(1).flat();

type FooterPolicyModalType = 'terms' | 'privacy';

const CommonFooter = () => {
  const navigate = useNavigate();
  const adminTriggerClickTimestampsRef = useRef<number[]>([]);
  const [policyModalType, setPolicyModalType] = useState<FooterPolicyModalType | null>(null);
  const isPolicyModalOpen = policyModalType !== null;

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
        <div className={styles['topRow']}>
          <nav aria-label='푸터 메뉴' className={styles['navigation']}>
            <ul className={styles['navigationList']}>
              {footerNavigationItems.map((item) => {
                return (
                  <li
                    className={styles['navigationItem']}
                    key={item.label}
                    style={{ width: `${String(item.width)}px` }}
                  >
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

          <div className={styles['legalLinks']} aria-label='푸터 정책 링크'>
            {footerLegalItems.map((item) => (
              <button
                className={styles['legalButton']}
                key={item.text}
                onClick={() => {
                  setPolicyModalType(item.modalType);
                }}
                type='button'
              >
                {item.text}
              </button>
            ))}
          </div>
        </div>

        <div aria-hidden='true' className={styles['divider']} />

        <div className={styles['middleRow']}>
          <div className={styles['brandColumn']}>
            <div className={styles['brandArea']}>
              <img
                alt='SONO SCHOOL 로고'
                className={styles['brandImage']}
                src='/SRDMS_logo_3x.png'
              />
            </div>
          </div>

          <section aria-labelledby='common-footer-heading' className={styles['informationBlock']}>
            <h2 className={styles['visuallyHidden']} id='common-footer-heading'>
              소노스쿨 사업자 정보
            </h2>

            <div className={styles['informationGroupList']}>
              {[footerCompanyInformationItems, footerBusinessInformationItems].map(
                (informationItems, groupIndex) => {
                  return (
                    <ul
                      className={styles['informationList']}
                      key={`footer-information-group-${String(groupIndex + 1)}`}
                    >
                      {informationItems.map((item) => {
                        return (
                          <li className={styles['informationItem']} key={item.label}>
                            <span className={styles['informationLabel']}>{item.label} :</span>
                            {item.href ? (
                              <a className={styles['informationLink']} href={item.href}>
                                {item.value}
                              </a>
                            ) : (
                              <span className={styles['informationValue']}>{item.value}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  );
                },
              )}
            </div>
          </section>
        </div>

        <div className={styles['bottomRow']}>
          <button
            className={styles['copyrightButton']}
            onClick={handleAdminTriggerClick}
            type='button'
          >
            {footerCopyrightText}
          </button>
        </div>
      </div>
      {isPolicyModalOpen ? (
        <LegalPolicyModal
          onClose={() => {
            setPolicyModalType(null);
          }}
          type={policyModalType}
        />
      ) : null}
    </footer>
  );
};

export default CommonFooter;
