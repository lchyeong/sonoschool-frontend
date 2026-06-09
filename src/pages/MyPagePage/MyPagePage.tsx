import type { ChangeEvent, CSSProperties, FormEvent } from 'react';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { logoutStudent } from '@/api/auth';
import { ApiError } from '@/api/errors';
import {
  acceptLearningStartNotice,
  createMyCertificateProfile,
  createMyEnrollmentReview,
  deleteMyEnrollmentReview,
  fetchLearningStartNotice,
  fetchMyCertificateProfile,
  updateMyEnrollmentReview,
  updateMyProfile,
  verifyMyProfilePassword,
} from '@/api/mypage';
import { cancelPayment } from '@/api/payments';
import certificateBorderInnerSrc from '@/assets/certificates/certificate-border-inner.svg';
import certificateBorderMiddleSrc from '@/assets/certificates/certificate-border-middle.svg';
import certificateBorderOuterSrc from '@/assets/certificates/certificate-border-outer.svg';
import certificateCornerBottomLeftSrc from '@/assets/certificates/certificate-corner-bottom-left.svg';
import certificateCornerBottomRightSrc from '@/assets/certificates/certificate-corner-bottom-right.svg';
import certificateCornerTopLeftSrc from '@/assets/certificates/certificate-corner-top-left.svg';
import certificateCornerTopRightSrc from '@/assets/certificates/certificate-corner-top-right.svg';
import certificateSonoSchoolLogoSrc from '@/assets/certificates/sono-school-logo.png';
import certificateNanumMyeongjoBoldSrc from '@/assets/fonts/nanum-myeongjo/NanumMyeongjo-Bold.subset.woff2';
import certificateNanumMyeongjoExtraBoldSrc from '@/assets/fonts/nanum-myeongjo/NanumMyeongjo-ExtraBold.subset.woff2';
import certificateNanumMyeongjoRegularSrc from '@/assets/fonts/nanum-myeongjo/NanumMyeongjo-Regular.subset.woff2';
import mypageCertificateDownloadIconSrc from '@/assets/icons/lucide_arrow-down-to-line.svg';
import mypageQuestionChevronDownIconSrc from '@/assets/icons/lucide_chevron-down.svg';
import mypageQuestionChevronUpIconSrc from '@/assets/icons/lucide_chevron-up.svg';
import mypageProfileCircleCheckIconSrc from '@/assets/icons/lucide_circle-check.svg';
import mypagePasswordEyeOffIconSrc from '@/assets/icons/lucide_eye-off.svg';
import mypageCertificateEmptyIconSrc from '@/assets/icons/lucide_file-badge.svg';
import mypageCertificateInfoIconSrc from '@/assets/icons/lucide_info.svg';
import mypageExpiredEmptyIconSrc from '@/assets/icons/lucide_laptop-minimal-check.svg';
import mypageQuestionReplyIconSrc from '@/assets/icons/lucide_reply.svg';
import mypageReviewStarIconSrc from '@/assets/icons/lucide_star.svg';
import mypageActiveEmptyIconSrc from '@/assets/icons/lucide_tv-minimal-play.svg';
import mypageReviewCloseIconSrc from '@/assets/icons/lucide_x.svg';
import mypageBookOpenIconSrc from '@/assets/icons/mypage-menu-book-open.svg';
import mypageLogOutIconSrc from '@/assets/icons/mypage-menu-log-out.svg';
import mypageReceiptTextIconSrc from '@/assets/icons/mypage-menu-receipt-text.svg';
import mypageSquarePenIconSrc from '@/assets/icons/mypage-menu-square-pen.svg';
import mypageUserIconSrc from '@/assets/icons/mypage-menu-user.svg';
import Modal from '@/components/overlay/Modal/Modal';
import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import Button from '@/components/ui/Button/Button';
import marketingConsentText from '@/content/marketingConsent.ko-KR.txt?raw';
import privacyCollectionConsentText from '@/content/privacyCollectionConsent.ko-KR.txt?raw';
import {
  myEnrollmentDetailQueryKey,
  myEnrollmentsQueryKey,
  myPaymentHistoryQueryKey,
  myProfileQueryKey,
  useMyEnrollmentDetailQuery,
  useMyEnrollmentsQuery,
  useMyPaymentHistoryQuery,
  useMyProfileQuery,
  useMyQuestionsQuery,
} from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import sharedStyles from '@/styles/accountPage.module.scss';
import type {
  CertificateProfile,
  EnrollmentReviewPayload,
  EnrollmentSummary,
  LearningStartNotice,
  MyQuestionAnsweredFilter,
  MyQuestionScope,
} from '@/types/mypage';
import {
  formatPaymentMethodLabel,
  paymentStatusLabels,
  type PaymentResult,
  type PaymentStatus,
} from '@/types/payment';
import { classNames } from '@/utils/classNames';

import ProfilePasswordChangeSection from './components/ProfilePasswordChangeSection';
import ProfilePhoneChangeSection from './components/ProfilePhoneChangeSection';
import styles from './MyPagePage.module.scss';

type MyPageViewKey = 'learning' | 'payments' | 'profile' | 'questions';
type ProfileConsentModalType = 'privacyCollection' | 'marketing';

interface SidebarItem {
  key: MyPageViewKey;
  label: string;
  iconSrc: string;
}

interface ReviewFormDraftState {
  enrollmentId: number | null;
  values: ReviewFormValues;
}

interface CertificatePreviewState {
  enrollment: EnrollmentSummary;
  profile: CertificateProfile;
}

interface LearningStartNoticeModalState {
  enrollment: EnrollmentSummary;
  notice: LearningStartNotice;
}

interface CertificateSvgAssets {
  borderInnerUrl: string;
  borderMiddleUrl: string;
  borderOuterUrl: string;
  cornerBottomLeftUrl: string;
  cornerBottomRightUrl: string;
  cornerTopLeftUrl: string;
  cornerTopRightUrl: string;
  emblemUrl: string;
  logoUrl: string;
  regularFontUrl: string;
  sealUrl: string;
  signatureUrl: string;
  boldFontUrl: string;
  extraBoldFontUrl: string;
}

interface ProfileFormErrors {
  email?: string;
  nickname?: string;
}

const DEFAULT_VIEW: MyPageViewKey = 'learning';

const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'learning', label: '내 강의', iconSrc: mypageBookOpenIconSrc },
  { key: 'payments', label: '결제 내역', iconSrc: mypageReceiptTextIconSrc },
  { key: 'profile', label: '내 정보 관리', iconSrc: mypageUserIconSrc },
  { key: 'questions', label: 'Q&A 관리', iconSrc: mypageSquarePenIconSrc },
];

type MaskIconStyle = CSSProperties & Record<'--mypage-menu-icon', string>;

const buildMaskIconStyle = (iconSrc: string): MaskIconStyle => {
  return {
    '--mypage-menu-icon': `url("${iconSrc}")`,
  };
};

const certificateInfoIconStyle = buildMaskIconStyle(mypageCertificateInfoIconSrc);
const certificateDownloadIconStyle = buildMaskIconStyle(mypageCertificateDownloadIconSrc);
const learningActiveEmptyIconStyle = buildMaskIconStyle(mypageActiveEmptyIconSrc);
const learningExpiredEmptyIconStyle = buildMaskIconStyle(mypageExpiredEmptyIconSrc);
const learningCertificateEmptyIconStyle = buildMaskIconStyle(mypageCertificateEmptyIconSrc);
const questionChevronDownIconStyle = buildMaskIconStyle(mypageQuestionChevronDownIconSrc);
const questionChevronUpIconStyle = buildMaskIconStyle(mypageQuestionChevronUpIconSrc);
const questionInfoIconStyle = buildMaskIconStyle(mypageCertificateInfoIconSrc);
const questionReplyIconStyle = buildMaskIconStyle(mypageQuestionReplyIconSrc);
const profileCircleCheckIconStyle = buildMaskIconStyle(mypageProfileCircleCheckIconSrc);
const profilePasswordEyeOffIconStyle = buildMaskIconStyle(mypagePasswordEyeOffIconSrc);
const reviewCloseIconStyle = buildMaskIconStyle(mypageReviewCloseIconSrc);
const reviewStarIconStyle = buildMaskIconStyle(mypageReviewStarIconSrc);

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const resolveProfilePasswordErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) {
    return '비밀번호를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }

  if (error.status === 401 || error.status === 403) {
    return '비밀번호가 일치하지 않습니다.';
  }

  if (error.status === 404) {
    return '비밀번호를 확인해 주세요.';
  }

  return error.userMessage || '비밀번호를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
};

const isMyPageViewKey = (value: string | null): value is MyPageViewKey => {
  return SIDEBAR_ITEMS.some((item) => item.key === value);
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('ko-KR');
};

const formatPaymentDateTime = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  const period = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 || 12;

  return `${String(year)}. ${month}. ${day}. ${period} ${String(hour12)}:${minute}:${second}`;
};

const formatQuestionDateTime = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, '0');
  const period = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 || 12;

  return `${String(year)}.${month}.${day} ${period} ${String(hour12)}:${minute}`;
};

const formatOrderNumberPreview = (value?: string | null) => {
  if (!value) return '-';

  const normalizedValue = value.replace(/^ORD-/i, '');
  return normalizedValue.slice(0, 8);
};

const formatOrderTypeLabel = (value?: PaymentResult['orderType'] | null) => {
  if (value === 'CART_CHECKOUT') return '장바구니 결제';
  if (value === 'PROGRAM') return '단일 강의 결제';

  return '-';
};

const resolvePaymentProcessedAt = (payment: PaymentResult) => {
  switch (payment.status) {
    case 'COMPLETED':
      return payment.paidAt ?? payment.registeredAt ?? payment.requestedAt;
    case 'CANCELLED':
      return payment.cancelledAt ?? payment.paidAt ?? payment.registeredAt ?? payment.requestedAt;
    case 'FAILED':
      return payment.failedAt ?? payment.requestedAt;
    case 'REGISTERED':
      return payment.registeredAt ?? payment.requestedAt;
    case 'PENDING':
    default:
      return payment.requestedAt;
  }
};

const formatDateRange = (startValue?: string | null, endValue?: string | null) => {
  const startDate = formatDate(startValue);
  const endDate = formatDate(endValue);

  if (startDate === '-' && endDate === '-') {
    return '-';
  }

  return `${startDate} ~ ${endDate === '-' ? '기간 제한 없음' : endDate}`;
};

const formatCertificateDate = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${String(date.getFullYear())}. ${month}. ${day}`;
};

const resolveCertificateCompletedAt = (enrollment: EnrollmentSummary) => {
  return enrollment.completedAt ?? enrollment.expireAt ?? enrollment.enrolledAt;
};

const formatCertificateNumber = (enrollment: EnrollmentSummary) => {
  const completedDate = new Date(resolveCertificateCompletedAt(enrollment));
  const year = Number.isNaN(completedDate.getTime())
    ? new Date().getFullYear()
    : completedDate.getFullYear();
  const month = Number.isNaN(completedDate.getTime()) ? 1 : completedDate.getMonth() + 1;
  const sequence = String(enrollment.id).padStart(4, '0');

  return `SONO-${String(year).slice(2)}-${String(month).padStart(2, '0')}-${sequence}`;
};

const escapeCertificateText = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const buildCertificateFilename = (preview: CertificatePreviewState) => {
  const normalizedTitle = preview.enrollment.programTitle.replace(/[\\/:*?"<>|\s]+/g, '-');
  const normalizedName = (preview.profile.englishName ?? 'certificate').replace(
    /[\\/:*?"<>|\s]+/g,
    '-',
  );

  return `${normalizedTitle}-${normalizedName}-certificate.svg`;
};

const resolveCertificateSvgAssets = (origin?: string): CertificateSvgAssets => {
  const resolveAssetUrl = (assetUrl: string) => {
    return origin ? new URL(assetUrl, origin).href : assetUrl;
  };

  return {
    borderInnerUrl: resolveAssetUrl(certificateBorderInnerSrc),
    borderMiddleUrl: resolveAssetUrl(certificateBorderMiddleSrc),
    borderOuterUrl: resolveAssetUrl(certificateBorderOuterSrc),
    boldFontUrl: resolveAssetUrl(certificateNanumMyeongjoBoldSrc),
    cornerBottomLeftUrl: resolveAssetUrl(certificateCornerBottomLeftSrc),
    cornerBottomRightUrl: resolveAssetUrl(certificateCornerBottomRightSrc),
    cornerTopLeftUrl: resolveAssetUrl(certificateCornerTopLeftSrc),
    cornerTopRightUrl: resolveAssetUrl(certificateCornerTopRightSrc),
    emblemUrl: resolveAssetUrl('/certificates/srdms-emblem.png'),
    extraBoldFontUrl: resolveAssetUrl(certificateNanumMyeongjoExtraBoldSrc),
    logoUrl: resolveAssetUrl(certificateSonoSchoolLogoSrc),
    regularFontUrl: resolveAssetUrl(certificateNanumMyeongjoRegularSrc),
    sealUrl: resolveAssetUrl('/certificates/seal.png'),
    signatureUrl: resolveAssetUrl('/certificates/director-signature.png'),
  };
};

const CERTIFICATE_PREVIEW_SVG_ASSETS = resolveCertificateSvgAssets();

const buildCertificateSvgMarkup = (
  preview: CertificatePreviewState,
  assets: CertificateSvgAssets,
) => {
  const certificateNumber = escapeCertificateText(formatCertificateNumber(preview.enrollment));
  const englishName = escapeCertificateText(preview.profile.englishName ?? '');
  const programTitle = escapeCertificateText(preview.enrollment.programTitle);
  const completedDate = escapeCertificateText(
    formatCertificateDate(resolveCertificateCompletedAt(preview.enrollment)),
  );
  const logoHref = escapeCertificateText(assets.logoUrl);
  const borderOuterHref = escapeCertificateText(assets.borderOuterUrl);
  const borderMiddleHref = escapeCertificateText(assets.borderMiddleUrl);
  const borderInnerHref = escapeCertificateText(assets.borderInnerUrl);
  const cornerTopLeftHref = escapeCertificateText(assets.cornerTopLeftUrl);
  const cornerTopRightHref = escapeCertificateText(assets.cornerTopRightUrl);
  const cornerBottomRightHref = escapeCertificateText(assets.cornerBottomRightUrl);
  const cornerBottomLeftHref = escapeCertificateText(assets.cornerBottomLeftUrl);
  const emblemHref = escapeCertificateText(assets.emblemUrl);
  const regularFontHref = escapeCertificateText(assets.regularFontUrl);
  const sealHref = escapeCertificateText(assets.sealUrl);
  const signatureHref = escapeCertificateText(assets.signatureUrl);
  const boldFontHref = escapeCertificateText(assets.boldFontUrl);
  const extraBoldFontHref = escapeCertificateText(assets.extraBoldFontUrl);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1054" height="1491" viewBox="0 0 1054 1491">
  <rect width="1054" height="1491" fill="#FDFBFB"/>
  <defs>
    <linearGradient id="certificateFadeLine" x1="246" y1="640" x2="808" y2="640" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FDFBFB" stop-opacity="0"/>
      <stop offset="0.3" stop-color="#9B8F83"/>
      <stop offset="0.7" stop-color="#9B8F83"/>
      <stop offset="1" stop-color="#FDFBFB" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="certificateTitleFadeLine" x1="138" y1="426" x2="916" y2="426" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FDFBFB" stop-opacity="0"/>
      <stop offset="0.3" stop-color="#9B8F83"/>
      <stop offset="0.7" stop-color="#9B8F83"/>
      <stop offset="1" stop-color="#FDFBFB" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="certificateShortFadeLine" x1="428" y1="1135" x2="626" y2="1135" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FDFBFB" stop-opacity="0"/>
      <stop offset="0.3" stop-color="#9B8F83"/>
      <stop offset="0.7" stop-color="#9B8F83"/>
      <stop offset="1" stop-color="#FDFBFB" stop-opacity="0"/>
    </linearGradient>
    <style>
      @font-face{font-family:'Nanum Myeongjo';font-weight:400;src:url('${regularFontHref}') format('woff2')}
      @font-face{font-family:'Nanum Myeongjo';font-weight:700;src:url('${boldFontHref}') format('woff2')}
      @font-face{font-family:'Nanum Myeongjo';font-weight:800;src:url('${extraBoldFontHref}') format('woff2')}
      .serif{font-family:'Nanum Myeongjo',Georgia,'Times New Roman',serif}
      .body-dark{fill:#111827}
      .body-muted{fill:#374151}
      .body-sub{fill:#374151}
    </style>
  </defs>
  <image href="${borderOuterHref}" x="29" y="29" width="996" height="1433" preserveAspectRatio="none"/>
  <image href="${borderMiddleHref}" x="45" y="45" width="964" height="1401" preserveAspectRatio="none"/>
  <image href="${borderInnerHref}" x="59" y="59" width="936" height="1373" preserveAspectRatio="none"/>
  <image href="${cornerTopLeftHref}" x="6" y="8" width="74.5" height="72.4" preserveAspectRatio="xMidYMid meet"/>
  <image href="${cornerTopRightHref}" x="974.1" y="7" width="72.4" height="74.5" preserveAspectRatio="xMidYMid meet"/>
  <image href="${cornerBottomRightHref}" x="973" y="1410.1" width="74.5" height="72.4" preserveAspectRatio="xMidYMid meet"/>
  <image href="${cornerBottomLeftHref}" x="8.1" y="1409" width="72.4" height="74.5" preserveAspectRatio="xMidYMid meet"/>
  <image href="${emblemHref}" x="42" y="302" width="970" height="970" opacity="0.08" preserveAspectRatio="xMidYMid meet"/>
  <image href="${logoHref}" x="95" y="120" width="210" height="69" opacity="0.8" preserveAspectRatio="xMidYMid meet"/>
  <text class="serif body-dark" x="956" y="151" font-size="20" font-weight="700" dominant-baseline="middle" text-anchor="end">${certificateNumber}</text>
  <text class="serif" x="527" y="360.5" font-size="70" font-weight="700" fill="#1F2937" dominant-baseline="middle" text-anchor="middle">Certificate of Completion</text>
  <line x1="138" y1="426" x2="916" y2="426" stroke="url(#certificateTitleFadeLine)" stroke-width="1"/>
  <text class="serif body-muted" x="527" y="489" font-size="26" font-weight="700" dominant-baseline="middle" text-anchor="middle">This certifies that</text>
  <text class="serif body-dark" x="527.5" y="577" font-size="60" font-weight="800" dominant-baseline="middle" letter-spacing="4.8" text-anchor="middle">${englishName}</text>
  <line x1="246" y1="640" x2="808" y2="640" stroke="url(#certificateFadeLine)" stroke-width="2"/>
  <polygon points="527,633 533,640 527,647 521,640" fill="#9B8F83"/>
  <text class="serif body-muted" x="527" y="707" font-size="28" font-weight="700" dominant-baseline="middle" text-anchor="middle">Has participated in the</text>
  <text class="serif body-muted" x="527" y="756" font-size="32" font-weight="700" dominant-baseline="middle" text-anchor="middle">Educational Course Activity Titled</text>
  <line x1="202" y1="827" x2="852" y2="823" stroke="#9B8F83" stroke-width="1"/>
  <line x1="202" y1="889" x2="852" y2="885" stroke="#9B8F83" stroke-width="1"/>
  <line x1="202" y1="951" x2="852" y2="947" stroke="#9B8F83" stroke-width="1"/>
  <line x1="419" y1="840" x2="419" y2="880" stroke="#9B8F83" stroke-width="1"/>
  <line x1="419" y1="902" x2="419" y2="942" stroke="#9B8F83" stroke-width="1"/>
  <polygon points="419,886 422,889 419,892 416,889" fill="#9B8F83"/>
  <text class="serif body-dark" x="309.5" y="862" font-size="20" font-weight="700" dominant-baseline="middle" text-anchor="middle">Course Title</text>
  <text class="serif body-dark" x="455" y="860.5" font-size="22" font-weight="800" dominant-baseline="middle">${programTitle}</text>
  <text class="serif body-dark" x="309" y="923" font-size="20" font-weight="700" dominant-baseline="middle" text-anchor="middle">Date of Completion</text>
  <text class="serif body-dark" x="455" y="922.5" font-size="22" font-weight="800" dominant-baseline="middle">${completedDate}</text>
  <text class="serif body-muted" x="527" y="1020" font-size="28" font-weight="700" dominant-baseline="middle" text-anchor="middle">
    <tspan x="527" dy="0">This certificate is awarded in recognition of</tspan>
    <tspan x="527" dy="36">successful completion of the above course.</tspan>
  </text>
  <line x1="428" y1="1135" x2="626" y2="1135" stroke="url(#certificateShortFadeLine)" stroke-width="1"/>
  <polygon points="527,1130 531,1135 527,1140 523,1135" fill="#9B8F83"/>
  <text class="serif body-sub" x="187" y="1215" font-size="20" font-weight="700">Director of Sonoschool</text>
  <line x1="166" y1="1313" x2="500" y2="1313" stroke="#9B8F83" stroke-width="1"/>
  <text class="serif body-dark" x="333" y="1336.5" font-size="22" font-weight="700" dominant-baseline="middle" letter-spacing="2.64" text-anchor="middle">Jang Eun Hee</text>
  <text class="serif body-sub" x="688.5" y="1320" font-size="20" font-weight="700" dominant-baseline="middle" text-anchor="middle">소노스쿨 국제초음파연수원</text>
  <text class="serif body-sub" x="571" y="1275" font-size="16" font-weight="700">
    <tspan x="571" dy="0">Sono School Registry for</tspan>
    <tspan x="571" dy="24">Diagnostic Medical Sonography</tspan>
  </text>
  <image href="${signatureHref}" x="179" y="1215" width="270" height="118" opacity="0.8" preserveAspectRatio="none"/>
  <image href="${sealHref}" x="745" y="1164" width="262" height="216" opacity="0.9" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
};

const formatCurrency = (value: number) => `${currencyFormatter.format(value)}원`;

const formatQuestionScopeLabel = (value: QuestionScopeFilterValue) => {
  return QUESTION_SCOPE_LABELS[value];
};

const formatQuestionAnsweredLabel = (answered: boolean) => {
  return answered ? '답변 완료' : '답변 대기';
};

const MY_COURSE_PAGE_SIZE = 6;
const ORDER_LIST_PAGE_SIZE = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_ALREADY_EXISTS_ERROR_MESSAGE = '이미 사용 중인 이메일입니다.';
const EMAIL_INVALID_ERROR_MESSAGE = '올바른 이메일 형식이 아닙니다.';
const NICKNAME_ALREADY_EXISTS_ERROR_MESSAGE = '이미 사용 중인 닉네임입니다.';
const DEFAULT_PAYMENT_CANCEL_REASON = '사용자 요청 취소';
const REVIEW_RATING_LABELS: Record<number, string> = {
  1: '1점 - 아쉬워요',
  2: '2점 - 조금 아쉬워요',
  3: '3점 - 보통이에요',
  4: '4점 - 만족해요',
  5: '5점 - 매우 만족해요',
};
const PROFILE_CONSENT_TEXTS: Record<ProfileConsentModalType, string> = {
  marketing: marketingConsentText,
  privacyCollection: privacyCollectionConsentText,
};
const PROFILE_CONSENT_MODAL_TITLES: Record<ProfileConsentModalType, string> = {
  marketing: '광고성 정보 수신 동의',
  privacyCollection: '개인정보 수집 및 이용 동의',
};

type EnrollmentCourseTabValue = 'ACTIVE' | 'EXPIRED' | 'CERTIFICATE';
type PaymentStatusFilterValue = 'ALL' | PaymentStatus;
type QuestionScopeFilterValue = MyQuestionScope | 'ALL';

const paginateItems = <T,>(items: T[], page: number, pageSize: number): T[] => {
  const safePage = Math.max(1, page);
  const startIndex = (safePage - 1) * pageSize;

  return items.slice(startIndex, startIndex + pageSize);
};

const getPageCount = (itemCount: number, pageSize: number): number => {
  return Math.max(1, Math.ceil(itemCount / pageSize));
};

const getEnrollmentCompletionRate = (completedLectures: number, totalLectures: number): number => {
  if (totalLectures <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((completedLectures / totalLectures) * 100)));
};

const renderProfileConsentDocumentLine = (line: string, index: number) => {
  const trimmedLine = line.trim();
  const lineKey = `${String(index)}-${trimmedLine}`;

  if (!trimmedLine) {
    return (
      <span aria-hidden='true' className={styles['profileConsentModalSpacer']} key={lineKey} />
    );
  }

  if (/^제\s*\d+\s*조/.test(trimmedLine) || /^\d+\.\s/.test(trimmedLine)) {
    return (
      <h3 className={styles['profileConsentModalSectionTitle']} key={lineKey}>
        {trimmedLine}
      </h3>
    );
  }

  if (/^(-|\(\d+\)|[가-힣]\.)/.test(trimmedLine)) {
    return (
      <p className={styles['profileConsentModalIndentedText']} key={lineKey}>
        {trimmedLine}
      </p>
    );
  }

  return (
    <p className={styles['profileConsentModalParagraph']} key={lineKey}>
      {trimmedLine}
    </p>
  );
};

const PaginationControls = ({
  currentPage,
  onChange,
  totalPages,
}: {
  currentPage: number;
  onChange: (nextPage: number) => void;
  totalPages: number;
}) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={sharedStyles['segmentRow']}>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => {
        const isActive = currentPage === page;

        return (
          <button
            className={classNames(
              sharedStyles['segmentButton'],
              isActive && sharedStyles['segmentButtonActive'],
            )}
            key={page}
            onClick={() => {
              onChange(page);
            }}
            type='button'
          >
            {page}
          </button>
        );
      })}
    </div>
  );
};

interface ProfileFormValues {
  email: string;
  name: string;
  nickname: string;
}

interface ReviewFormValues {
  content: string;
  rating: string;
}

interface CertificateProfileFormValues {
  englishName: string;
  koreanName: string;
}

const DEFAULT_REVIEW_FORM_VALUES: ReviewFormValues = {
  content: '',
  rating: '',
};

const DEFAULT_CERTIFICATE_PROFILE_FORM_VALUES: CertificateProfileFormValues = {
  englishName: '',
  koreanName: '',
};

const QUESTION_SCOPE_LABELS: Record<QuestionScopeFilterValue, string> = {
  ALL: '전체',
  GLOBAL: '운영 Q&A',
  PROGRAM: '강의 Q&A',
};

const MyPagePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const logout = useAuthStore((state) => state.logout);
  const storeDisplayName = useAuthStore((state) => state.displayName);
  const syncProfileSnapshot = useAuthStore((state) => state.syncProfileSnapshot);
  const showToast = useToastStore((state) => state.showToast);
  const profilePasswordInputRef = useRef<HTMLInputElement | null>(null);

  const activeViewParam = searchParams.get('view');
  const activeView = isMyPageViewKey(activeViewParam) ? activeViewParam : DEFAULT_VIEW;

  const [courseTab, setCourseTab] = useState<EnrollmentCourseTabValue>('ACTIVE');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilterValue>('ALL');
  const [coursePage, setCoursePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [questionScopeFilter, setQuestionScopeFilter] = useState<QuestionScopeFilterValue>('ALL');
  const [questionAnsweredFilter, setQuestionAnsweredFilter] =
    useState<MyQuestionAnsweredFilter>('ALL');
  const [questionSearchInput, setQuestionSearchInput] = useState('');
  const [questionKeyword, setQuestionKeyword] = useState('');
  const [questionPage, setQuestionPage] = useState(1);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);
  const [profileFormValues, setProfileFormValues] = useState<ProfileFormValues | null>(null);
  const [profileFormErrors, setProfileFormErrors] = useState<ProfileFormErrors>({});
  const [profileFormResetVersion, setProfileFormResetVersion] = useState(0);
  const [isProfilePasswordVerified, setIsProfilePasswordVerified] = useState(false);
  const [profilePassword, setProfilePassword] = useState('');
  const [profilePasswordError, setProfilePasswordError] = useState<string | null>(null);
  const [isProfilePasswordVisible, setIsProfilePasswordVisible] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | null>(null);
  const [certificateEnrollmentId, setCertificateEnrollmentId] = useState<number | null>(null);
  const [certificateProfileFormValues, setCertificateProfileFormValues] =
    useState<CertificateProfileFormValues>(DEFAULT_CERTIFICATE_PROFILE_FORM_VALUES);
  const [certificateProfileFormError, setCertificateProfileFormError] = useState<string | null>(
    null,
  );
  const [downloadingCertificateEnrollmentId, setDownloadingCertificateEnrollmentId] = useState<
    number | null
  >(null);
  const [certificatePreview, setCertificatePreview] = useState<CertificatePreviewState | null>(
    null,
  );
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [reviewFormDraft, setReviewFormDraft] = useState<ReviewFormDraftState>({
    enrollmentId: null,
    values: DEFAULT_REVIEW_FORM_VALUES,
  });
  const [reviewFormError, setReviewFormError] = useState<string | null>(null);
  const [isOptionalPrivacyConsentAccepted, setIsOptionalPrivacyConsentAccepted] = useState(false);
  const [profileConsentModalType, setProfileConsentModalType] =
    useState<ProfileConsentModalType | null>(null);
  const [learningStartNoticeModal, setLearningStartNoticeModal] =
    useState<LearningStartNoticeModalState | null>(null);
  const [checkingLearningStartEnrollmentId, setCheckingLearningStartEnrollmentId] = useState<
    number | null
  >(null);

  const profileQuery = useMyProfileQuery();
  const enrollmentsQuery = useMyEnrollmentsQuery();
  const allEnrollments = enrollmentsQuery.data ?? [];
  const pendingEnrollments = allEnrollments.filter(
    (enrollment) => enrollment.learningStatus === 'PENDING',
  );
  const activeEnrollments = allEnrollments.filter((enrollment) => {
    return enrollment.learningStatus === 'IN_PROGRESS' || enrollment.learningStatus === 'PENDING';
  });
  const expiredEnrollments = allEnrollments.filter(
    (enrollment) => enrollment.learningStatus === 'ENDED',
  );
  const certificateEnrollments = allEnrollments.filter(
    (enrollment) => enrollment.certificateEligible && enrollment.learningStatus !== 'CANCELLED',
  );
  const certificatePreviewSvgMarkup = useMemo(() => {
    if (!certificatePreview) {
      return null;
    }

    return buildCertificateSvgMarkup(certificatePreview, CERTIFICATE_PREVIEW_SVG_ASSETS);
  }, [certificatePreview]);
  const filteredEnrollments =
    courseTab === 'ACTIVE'
      ? activeEnrollments
      : courseTab === 'EXPIRED'
        ? expiredEnrollments
        : certificateEnrollments;
  const coursePageCount = getPageCount(filteredEnrollments.length, MY_COURSE_PAGE_SIZE);
  const paginatedEnrollments = paginateItems(filteredEnrollments, coursePage, MY_COURSE_PAGE_SIZE);
  const paymentHistoryQuery = useMyPaymentHistoryQuery(activeView === 'payments');
  const enrollmentDetailQuery = useMyEnrollmentDetailQuery(
    selectedEnrollmentId,
    selectedEnrollmentId !== null,
  );
  const questionsQuery = useMyQuestionsQuery(
    {
      answered:
        questionAnsweredFilter === 'ALL' ? undefined : questionAnsweredFilter === 'ANSWERED',
      keyword: questionKeyword,
      page: questionPage - 1,
      scope: questionScopeFilter,
      size: 10,
    },
    activeView === 'questions',
  );
  const visiblePayments = (paymentHistoryQuery.data ?? []).filter((payment) => {
    return payment.status === 'COMPLETED' || payment.status === 'CANCELLED';
  });
  const filteredPayments = visiblePayments.filter((payment) => {
    return paymentStatusFilter === 'ALL' || payment.status === paymentStatusFilter;
  });
  const paymentPageCount = getPageCount(filteredPayments.length, ORDER_LIST_PAGE_SIZE);
  const paginatedPayments = paginateItems(filteredPayments, paymentPage, ORDER_LIST_PAGE_SIZE);
  const selectedPayment =
    selectedPaymentId === null
      ? null
      : (visiblePayments.find((payment) => payment.id === selectedPaymentId) ?? null);

  const accountName = profileQuery.data?.displayName || storeDisplayName || '회원';
  const selectedEnrollment =
    selectedEnrollmentId === null
      ? null
      : (allEnrollments.find((enrollment) => enrollment.id === selectedEnrollmentId) ?? null);
  const resolvedProfileFormValues: ProfileFormValues = {
    email: profileFormValues?.email ?? profileQuery.data?.email ?? '',
    name: profileFormValues?.name ?? profileQuery.data?.name ?? '',
    nickname: profileFormValues?.nickname ?? profileQuery.data?.nickname ?? '',
  };
  const reviewFormValues: ReviewFormValues =
    selectedEnrollmentId !== null && reviewFormDraft.enrollmentId === selectedEnrollmentId
      ? reviewFormDraft.values
      : {
          content: enrollmentDetailQuery.data?.review?.content ?? '',
          rating: enrollmentDetailQuery.data?.review
            ? String(enrollmentDetailQuery.data.review.rating)
            : '',
        };
  useEffect(() => {
    if (!profileQuery.data) return;

    syncProfileSnapshot({
      displayName: profileQuery.data.displayName,
      loginId: profileQuery.data.loginId,
      role: profileQuery.data.role,
    });
  }, [profileQuery.data, syncProfileSnapshot]);

  useEffect(() => {
    const totalPages = questionsQuery.data?.totalPages ?? 1;
    if (questionPage > totalPages) {
      startTransition(() => {
        setQuestionPage(totalPages);
      });
    }
  }, [questionPage, questionsQuery.data?.totalPages]);

  const handleCourseTabChange = (nextTab: EnrollmentCourseTabValue) => {
    setCourseTab(nextTab);
    setCoursePage(1);
  };

  const handlePaymentFilterChange = (nextFilter: PaymentStatusFilterValue) => {
    setPaymentStatusFilter(nextFilter);
    setPaymentPage(1);
  };

  const handleQuestionScopeFilterChange = (nextFilter: QuestionScopeFilterValue) => {
    setQuestionScopeFilter(nextFilter);
    setQuestionPage(1);
  };

  const handleQuestionAnsweredFilterChange = (nextFilter: MyQuestionAnsweredFilter) => {
    setQuestionAnsweredFilter(nextFilter);
    setQuestionPage(1);
  };

  const handleViewChange = (viewKey: MyPageViewKey) => {
    if (viewKey !== 'profile') {
      setIsProfilePasswordVerified(false);
      setProfilePassword('');
      setProfilePasswordError(null);
      setIsProfilePasswordVisible(false);
    }

    const nextParams = new URLSearchParams(searchParams);

    if (viewKey === DEFAULT_VIEW) {
      nextParams.delete('view');
    } else {
      nextParams.set('view', viewKey);
    }

    setSearchParams(nextParams);
  };

  const closeReviewModal = () => {
    setSelectedEnrollmentId(null);
    setReviewFormDraft({
      enrollmentId: null,
      values: DEFAULT_REVIEW_FORM_VALUES,
    });
    setReviewFormError(null);
  };

  const closePaymentDetailModal = () => {
    setSelectedPaymentId(null);
  };

  const openPaymentDetailModal = (paymentId: number) => {
    setSelectedPaymentId(paymentId);
  };

  const openReviewModal = (enrollmentId: number) => {
    setSelectedEnrollmentId(enrollmentId);
    setReviewFormDraft({
      enrollmentId: null,
      values: DEFAULT_REVIEW_FORM_VALUES,
    });
    setReviewFormError(null);
  };

  const closeCertificateProfileModal = () => {
    setCertificateEnrollmentId(null);
    setCertificateProfileFormValues(DEFAULT_CERTIFICATE_PROFILE_FORM_VALUES);
    setCertificateProfileFormError(null);
  };

  const closeProfilePasswordModal = () => {
    setProfilePassword('');
    setProfilePasswordError(null);
    setIsProfilePasswordVisible(false);
    handleViewChange(DEFAULT_VIEW);
  };

  const saveCertificateSvgDownload = (preview: CertificatePreviewState) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      showToast({
        message: '수료증 다운로드를 지원하지 않는 환경입니다.',
        variant: 'error',
      });
      return false;
    }

    if (typeof URL.createObjectURL !== 'function') {
      showToast({
        message: '현재 브라우저에서 수료증 다운로드를 지원하지 않습니다.',
        variant: 'error',
      });
      return false;
    }

    const svgMarkup = buildCertificateSvgMarkup(
      preview,
      resolveCertificateSvgAssets(window.location.origin),
    );
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = objectUrl;
    anchor.download = buildCertificateFilename(preview);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    return true;
  };

  const openCertificatePreview = (enrollmentId: number, profile: CertificateProfile) => {
    const targetEnrollment = allEnrollments.find((enrollment) => enrollment.id === enrollmentId);

    if (!targetEnrollment) {
      showToast({
        message: '수료증 대상 강의를 확인하지 못했습니다.',
        variant: 'error',
      });
      return;
    }

    setCertificatePreview({
      enrollment: targetEnrollment,
      profile,
    });
  };

  const handleCertificatePreviewDownload = () => {
    if (!certificatePreview) return;

    const saved = saveCertificateSvgDownload(certificatePreview);
    if (saved) {
      showToast({
        message: '수료증 이미지 다운로드를 시작했습니다.',
        variant: 'success',
      });
    }
  };

  const handleCertificatePreviewPrint = () => {
    if (!certificatePreview || typeof window === 'undefined') return;

    const svgMarkup = buildCertificateSvgMarkup(
      certificatePreview,
      resolveCertificateSvgAssets(window.location.origin),
    );
    const printHtml = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>수료증 인쇄</title>
    <style>
      @page { size: A4 portrait; margin: 0; }
      html, body { width: 100%; min-height: 100%; margin: 0; background: #f3f4f6; }
      body { display: grid; place-items: center; }
      svg { width: min(100vw, 794px); height: auto; background: #fdfbfb; }
      @media print {
        html, body { background: #ffffff; }
        svg { width: 210mm; height: 297mm; }
      }
    </style>
  </head>
  <body>${svgMarkup}</body>
</html>`;
    const printDocumentUrl = URL.createObjectURL(
      new Blob([printHtml], { type: 'text/html;charset=utf-8' }),
    );
    const printWindow = window.open(printDocumentUrl, '_blank');
    if (!printWindow) {
      URL.revokeObjectURL(printDocumentUrl);
      showToast({
        message: '팝업이 차단되어 인쇄 화면을 열지 못했습니다.',
        variant: 'error',
      });
      return;
    }

    const runPrint = () => {
      printWindow.focus();
      printWindow.print();
      URL.revokeObjectURL(printDocumentUrl);
    };

    printWindow.addEventListener('load', runPrint, { once: true });
    window.setTimeout(() => {
      URL.revokeObjectURL(printDocumentUrl);
    }, 10_000);
  };

  const handleCertificateDownload = async (enrollmentId: number) => {
    setCertificateProfileFormError(null);
    setDownloadingCertificateEnrollmentId(enrollmentId);
    try {
      const certificateProfile = await fetchMyCertificateProfile();
      if (!certificateProfile.registered) {
        setCertificateEnrollmentId(enrollmentId);
        setCertificateProfileFormValues(DEFAULT_CERTIFICATE_PROFILE_FORM_VALUES);
        return;
      }

      openCertificatePreview(enrollmentId, certificateProfile);
    } catch (error: unknown) {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '수료증 이름 정보를 확인하지 못했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    } finally {
      setDownloadingCertificateEnrollmentId(null);
    }
  };

  const handleProfileFieldChange =
    (fieldName: 'email' | 'nickname') => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setProfileFormValues((currentValues) => ({
        email:
          fieldName === 'email'
            ? nextValue
            : (currentValues?.email ?? profileQuery.data?.email ?? ''),
        name: currentValues?.name ?? profileQuery.data?.name ?? '',
        nickname:
          fieldName === 'nickname'
            ? nextValue
            : (currentValues?.nickname ?? profileQuery.data?.nickname ?? ''),
      }));

      if (fieldName === 'nickname') {
        setProfileFormErrors((current) => {
          const next = { ...current };
          delete next.nickname;
          return next;
        });
      }

      if (fieldName === 'email') {
        setProfileFormErrors((current) => {
          const next = { ...current };
          delete next.email;
          return next;
        });
      }
    };

  const logoutMutation = useMutation({
    mutationFn: logoutStudent,
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error ? error.message : '로그아웃에 실패했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: () => {
      logout();
      showToast({
        message: '로그아웃되었습니다.',
        variant: 'success',
      });
      void navigate(routePaths.home);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateMyProfile,
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.code === 'USER_400_NICKNAME') {
        setProfileFormErrors((current) => ({
          ...current,
          nickname: NICKNAME_ALREADY_EXISTS_ERROR_MESSAGE,
        }));
        showToast({
          message: NICKNAME_ALREADY_EXISTS_ERROR_MESSAGE,
          variant: 'error',
        });
        return;
      }

      if (error instanceof ApiError && error.code === 'USER_400_EMAIL') {
        setProfileFormErrors((current) => ({
          ...current,
          email: EMAIL_ALREADY_EXISTS_ERROR_MESSAGE,
        }));
        showToast({
          message: EMAIL_ALREADY_EXISTS_ERROR_MESSAGE,
          variant: 'error',
        });
        return;
      }

      showToast({
        message:
          error instanceof Error
            ? error.message
            : '회원 정보를 수정하지 못했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(myProfileQueryKey, updatedProfile);
      syncProfileSnapshot({
        displayName: updatedProfile.displayName,
        loginId: updatedProfile.loginId,
        role: updatedProfile.role,
      });
      setProfileFormValues({
        email: updatedProfile.email ?? '',
        name: updatedProfile.name,
        nickname: updatedProfile.nickname ?? '',
      });
      setProfileFormErrors({});
      showToast({
        message: '회원 정보를 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const verifyProfilePasswordMutation = useMutation({
    mutationFn: verifyMyProfilePassword,
    onError: (error: unknown) => {
      setProfilePasswordError(resolveProfilePasswordErrorMessage(error));
    },
    onSuccess: () => {
      setIsProfilePasswordVerified(true);
      setProfilePassword('');
      setProfilePasswordError(null);
      setIsProfilePasswordVisible(false);
    },
  });

  const handleProfilePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const password = profilePassword.trim();
    if (!password) {
      setProfilePasswordError('비밀번호를 입력해 주세요.');
      return;
    }

    setProfilePasswordError(null);
    verifyProfilePasswordMutation.mutate({ password });
  };

  const reviewMutation = useMutation({
    mutationFn: async ({
      detailReviewId,
      payload,
      programId,
    }: {
      detailReviewId: number | null;
      payload: EnrollmentReviewPayload;
      programId: number;
    }) => {
      if (detailReviewId !== null) {
        await updateMyEnrollmentReview(detailReviewId, payload);
        return 'update' as const;
      }

      await createMyEnrollmentReview(programId, payload);
      return 'create' as const;
    },
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '후기를 저장하지 못했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: async (mode) => {
      await queryClient.invalidateQueries({ queryKey: myEnrollmentsQueryKey });
      if (selectedEnrollmentId !== null) {
        await queryClient.invalidateQueries({
          queryKey: myEnrollmentDetailQueryKey(selectedEnrollmentId),
        });
      }
      closeReviewModal();
      showToast({
        message: mode === 'update' ? '후기를 수정했습니다.' : '후기를 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: number) => deleteMyEnrollmentReview(reviewId),
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '후기를 삭제하지 못했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: myEnrollmentsQueryKey });
      if (selectedEnrollmentId !== null) {
        await queryClient.invalidateQueries({
          queryKey: myEnrollmentDetailQueryKey(selectedEnrollmentId),
        });
      }
      closeReviewModal();
      showToast({
        message: '후기를 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const createCertificateProfileMutation = useMutation({
    mutationFn: createMyCertificateProfile,
    onError: (error: unknown) => {
      setCertificateProfileFormError(
        error instanceof Error
          ? error.message
          : '수료증 이름을 등록하지 못했습니다. 다시 시도해 주세요.',
      );
    },
    onSuccess: (createdProfile) => {
      const targetEnrollmentId = certificateEnrollmentId;
      closeCertificateProfileModal();
      showToast({
        message: '수료증 이름을 등록했습니다.',
        variant: 'success',
      });
      if (targetEnrollmentId !== null) {
        openCertificatePreview(targetEnrollmentId, createdProfile);
      }
    },
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: ({ paymentId }: { paymentId: number }) =>
      cancelPayment(paymentId, { reason: DEFAULT_PAYMENT_CANCEL_REASON }),
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '결제 취소 처리에 실패했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: myPaymentHistoryQueryKey }),
        queryClient.invalidateQueries({ queryKey: myEnrollmentsQueryKey }),
      ]);
      showToast({
        message: '결제와 수강 내역을 취소했습니다.',
        variant: 'success',
      });
    },
  });

  const acceptLearningStartNoticeMutation = useMutation({
    mutationFn: (enrollmentId: number) => acceptLearningStartNotice(enrollmentId),
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '수강 시작 동의 처리에 실패했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: async (_notice, enrollmentId) => {
      setLearningStartNoticeModal(null);
      await queryClient.invalidateQueries({ queryKey: myEnrollmentsQueryKey });
      void navigate(routePaths.learningPlayer(String(enrollmentId)));
    },
  });

  const handleReviewSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const detail = enrollmentDetailQuery.data;
    if (!detail) {
      setReviewFormError('후기 대상 강의 정보를 불러오지 못했습니다.');
      return;
    }

    const rating = Number.parseInt(reviewFormValues.rating, 10);
    const content = reviewFormValues.content.trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setReviewFormError('평점은 1점부터 5점 사이로 입력해 주세요.');
      return;
    }

    if (content.length === 0) {
      setReviewFormError('후기 내용을 입력해 주세요.');
      return;
    }

    setReviewFormError(null);
    reviewMutation.mutate({
      detailReviewId: detail.review?.id ?? null,
      payload: {
        content,
        rating,
      },
      programId: detail.programId,
    });
  };

  const handleReviewDelete = () => {
    const reviewId = enrollmentDetailQuery.data?.review?.id;

    if (reviewId === undefined) {
      setReviewFormError('삭제할 후기를 찾지 못했습니다.');
      return;
    }

    if (!window.confirm('후기를 삭제하면 복구할 수 없습니다.\n계속하시겠습니까?')) {
      return;
    }

    setReviewFormError(null);
    deleteReviewMutation.mutate(reviewId);
  };

  const handleCertificateProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const koreanName = certificateProfileFormValues.koreanName.trim();
    const englishName = certificateProfileFormValues.englishName.trim();

    if (koreanName.length === 0 || englishName.length === 0) {
      setCertificateProfileFormError('한글 이름과 영문 이름을 모두 입력해 주세요.');
      return;
    }

    setCertificateProfileFormError(null);
    createCertificateProfileMutation.mutate({
      englishName,
      koreanName,
    });
  };

  const renderReviewAction = (enrollment: (typeof allEnrollments)[number], className?: string) => {
    if (enrollment.reviewAction === 'NONE') {
      return (
        <span
          aria-hidden='true'
          className={classNames(styles['courseSecondaryActionPlaceholder'], className)}
        />
      );
    }

    return (
      <Button
        className={classNames(styles['courseSecondaryAction'], className)}
        onClick={() => {
          openReviewModal(enrollment.id);
        }}
        size='sm'
        type='button'
        variant='secondary'
      >
        {enrollment.reviewAction === 'EDIT' ? '후기 수정' : '후기 작성'}
      </Button>
    );
  };

  const getLearningActionLabel = (enrollment: (typeof allEnrollments)[number]) => {
    if (enrollment.learningStatus === 'PENDING') {
      return '시작 전';
    }

    return enrollment.lastLearningAt ? '이어보기' : '수강 시작하기';
  };

  const handleLearningActionClick = async (enrollment: EnrollmentSummary) => {
    if (enrollment.learningStatus === 'PENDING') {
      return;
    }

    setCheckingLearningStartEnrollmentId(enrollment.id);

    try {
      const notice = await fetchLearningStartNotice(enrollment.id);

      if (notice.required) {
        setLearningStartNoticeModal({ enrollment, notice });
        return;
      }

      void navigate(routePaths.learningPlayer(String(enrollment.id)));
    } catch (error: unknown) {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '수강 시작 상태를 확인하지 못했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    } finally {
      setCheckingLearningStartEnrollmentId(null);
    }
  };

  const renderLearningCourses = () => {
    const activeCount = activeEnrollments.length;
    const expiredCount = expiredEnrollments.length;
    const certificateCount = certificateEnrollments.length;
    const courseOverviewItems: Array<{
      count: number;
      key: EnrollmentCourseTabValue;
      label: string;
    }> = [
      {
        count: activeCount,
        key: 'ACTIVE',
        label: pendingEnrollments.length > 0 ? '수강 중/예정' : '수강 중',
      },
      { count: expiredCount, key: 'EXPIRED', label: '수강 종료' },
      { count: certificateCount, key: 'CERTIFICATE', label: '수료증' },
    ];

    if (enrollmentsQuery.isLoading) {
      return <p className={sharedStyles['mutedText']}>수강 내역을 불러오는 중입니다.</p>;
    }

    if (enrollmentsQuery.isError) {
      return (
        <p className={styles['errorText']}>
          {enrollmentsQuery.error instanceof Error
            ? enrollmentsQuery.error.message
            : '수강 내역을 불러오지 못했습니다.'}
        </p>
      );
    }

    const emptyStateByTab: Record<
      EnrollmentCourseTabValue,
      {
        description: string;
        iconStyle: MaskIconStyle;
        title: string;
      }
    > = {
      ACTIVE: {
        description: '강의를 둘러보고 새로운 학습을 시작해보세요.',
        iconStyle: learningActiveEmptyIconStyle,
        title: '수강 중인 강의가 없습니다.',
      },
      EXPIRED: {
        description: '수강 중인 강의를 마치면 이곳에서 확인할 수 있어요.',
        iconStyle: learningExpiredEmptyIconStyle,
        title: '수강 종료된 강의가 없습니다.',
      },
      CERTIFICATE: {
        description: '수료 기준을 충족한 강의가 아직 없어요.',
        iconStyle: learningCertificateEmptyIconStyle,
        title: '발급 가능한 수료증이 없습니다.',
      },
    };

    const renderLearningEmptyState = (tabValue: EnrollmentCourseTabValue) => {
      const emptyState = emptyStateByTab[tabValue];

      return (
        <div className={styles['learningEmptyState']}>
          <span
            aria-hidden='true'
            className={styles['learningEmptyStateIcon']}
            style={emptyState.iconStyle}
          />
          <h3 className={styles['learningEmptyStateTitle']}>{emptyState.title}</h3>
          <p className={styles['learningEmptyStateDescription']}>{emptyState.description}</p>
          <Link className={styles['learningEmptyStateLink']} to={routePaths.homeFeaturedCourses}>
            강의 둘러보기
          </Link>
        </div>
      );
    };

    const renderCertificateEnrollments = () => {
      const hasCertificateEnrollments = filteredEnrollments.length > 0;

      return (
        <>
          {hasCertificateEnrollments ? (
            <div className={styles['certificateNotice']}>
              <span
                aria-hidden='true'
                className={styles['certificateNoticeIcon']}
                style={certificateInfoIconStyle}
              />
              <p className={styles['certificateNoticeText']}>
                수료증은 진도율 100% 및 수료 기준 충족 시 발급됩니다.
              </p>
            </div>
          ) : null}

          {!hasCertificateEnrollments ? (
            renderLearningEmptyState('CERTIFICATE')
          ) : (
            <div
              className={classNames(
                styles['learningCoursesBody'],
                styles['certificateCoursesBody'],
              )}
            >
              <div className={styles['certificateList']}>
                {paginatedEnrollments.map((enrollment) => {
                  return (
                    <article className={styles['certificateListItem']} key={enrollment.id}>
                      <div className={styles['certificateRow']}>
                        <div className={styles['certificateMedia']}>
                          {enrollment.programThumbnailUrl ? (
                            <img
                              alt={`${enrollment.programTitle} 대표 이미지`}
                              className={styles['certificateImage']}
                              loading='lazy'
                              src={enrollment.programThumbnailUrl}
                            />
                          ) : (
                            <div aria-hidden='true' className={styles['certificateFallback']}>
                              <span>SS</span>
                            </div>
                          )}
                        </div>

                        <strong className={styles['certificateTitle']}>
                          {enrollment.programTitle}
                        </strong>

                        <button
                          className={styles['certificateDownloadButton']}
                          onClick={() => {
                            void handleCertificateDownload(enrollment.id);
                          }}
                          disabled={downloadingCertificateEnrollmentId === enrollment.id}
                          type='button'
                        >
                          <span>
                            {downloadingCertificateEnrollmentId === enrollment.id
                              ? '다운로드 중...'
                              : '수료증 다운로드'}
                          </span>
                          <span
                            aria-hidden='true'
                            className={styles['certificateDownloadButtonIcon']}
                            style={certificateDownloadIconStyle}
                          />
                        </button>
                      </div>
                      <div aria-hidden='true' className={styles['certificateDivider']} />
                    </article>
                  );
                })}
              </div>

              <div className={styles['learningPagination']}>
                <PaginationControls
                  currentPage={coursePage}
                  onChange={setCoursePage}
                  totalPages={coursePageCount}
                />
              </div>
            </div>
          )}
        </>
      );
    };

    return (
      <section className={classNames(styles['contentSection'], styles['learningSection'])}>
        <div className={styles['learningHeader']}>
          <h2 className={styles['learningTitle']}>내 강의</h2>
        </div>

        <div className={styles['courseOverviewGrid']} role='tablist' aria-label='내 강의 상태'>
          {courseOverviewItems.map((item) => {
            const isActive = courseTab === item.key;

            return (
              <button
                aria-pressed={isActive}
                className={classNames(
                  styles['courseOverviewButton'],
                  isActive && styles['courseOverviewButtonActive'],
                )}
                key={item.key}
                onClick={() => {
                  handleCourseTabChange(item.key);
                }}
                type='button'
              >
                <span
                  className={classNames(
                    styles['courseOverviewLabel'],
                    isActive && styles['courseOverviewLabelActive'],
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={classNames(
                    styles['courseOverviewCount'],
                    isActive
                      ? styles['courseOverviewCountActive']
                      : styles['courseOverviewCountInactive'],
                  )}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {courseTab === 'CERTIFICATE' ? (
          renderCertificateEnrollments()
        ) : !filteredEnrollments.length ? (
          renderLearningEmptyState(courseTab)
        ) : (
          <div
            className={classNames(
              styles['learningCoursesBody'],
              courseTab === 'EXPIRED' && styles['learningCoursesBodyExpired'],
            )}
          >
            <div className={styles['courseGrid']}>
              {paginatedEnrollments.map((enrollment) => {
                const completionRate = getEnrollmentCompletionRate(
                  enrollment.completedLectures,
                  enrollment.totalLectures,
                );
                const isPendingEnrollment = enrollment.learningStatus === 'PENDING';
                const reviewAction =
                  courseTab === 'EXPIRED'
                    ? renderReviewAction(enrollment, styles['courseSecondaryActionWide'])
                    : enrollment.reviewAction !== 'NONE'
                      ? renderReviewAction(enrollment)
                      : null;
                const learningActionLabel = getLearningActionLabel(enrollment);

                const cardBody = (
                  <>
                    <div className={styles['courseCardMedia']}>
                      {enrollment.programThumbnailUrl ? (
                        <img
                          alt={`${enrollment.programTitle} 대표 이미지`}
                          className={styles['courseCardImage']}
                          loading='lazy'
                          src={enrollment.programThumbnailUrl}
                        />
                      ) : (
                        <div aria-hidden='true' className={styles['courseCardFallback']}>
                          <span>SS</span>
                        </div>
                      )}
                    </div>

                    <div className={styles['courseCardBody']}>
                      <div className={styles['courseCardHeader']}>
                        <strong className={styles['courseCardTitle']}>
                          {enrollment.programTitle}
                        </strong>
                      </div>

                      <div className={styles['courseProgressSection']}>
                        <div aria-hidden='true' className={styles['courseProgressTrack']}>
                          <span
                            className={styles['courseProgressFill']}
                            style={{ width: `${String(completionRate)}%` }}
                          />
                        </div>
                        <div className={styles['courseProgressMeta']}>
                          <span className={styles['courseProgressCount']}>
                            <span className={styles['courseProgressCountText']}>
                              {enrollment.completedLectures}
                            </span>
                            <span className={styles['courseProgressSeparator']}>/</span>
                            <span className={styles['courseProgressCountText']}>
                              {enrollment.totalLectures}강
                            </span>
                          </span>
                          <span
                            className={classNames(
                              styles['courseProgressPercent'],
                              completionRate >= 100 && styles['courseProgressPercentComplete'],
                            )}
                          >
                            {completionRate}%
                          </span>
                        </div>
                      </div>

                      <div className={styles['courseMetaList']}>
                        <div className={styles['courseMetaRow']}>
                          <span className={styles['courseMetaLabel']}>수강 기간</span>
                          <span className={styles['courseMetaValue']}>
                            {formatDateRange(enrollment.enrolledAt, enrollment.expireAt)}
                          </span>
                        </div>
                        <div className={styles['courseMetaRow']}>
                          <span className={styles['courseMetaLabel']}>최근 학습</span>
                          <span className={styles['courseMetaValue']}>
                            {formatDate(enrollment.lastLearningAt)}
                          </span>
                        </div>
                      </div>

                      {courseTab === 'EXPIRED' ? (
                        <div
                          className={classNames(
                            styles['courseCardFooter'],
                            styles['courseCardFooterExpired'],
                          )}
                        >
                          {reviewAction}
                        </div>
                      ) : (
                        <div className={styles['courseCardFooter']}>
                          {isPendingEnrollment ? (
                            <span
                              aria-disabled='true'
                              className={classNames(
                                styles['learningActionLink'],
                                styles['learningActionLinkDisabled'],
                              )}
                            >
                              {learningActionLabel}
                            </span>
                          ) : (
                            <>
                              <button
                                className={styles['learningActionLink']}
                                disabled={checkingLearningStartEnrollmentId === enrollment.id}
                                onClick={() => {
                                  void handleLearningActionClick(enrollment);
                                }}
                                type='button'
                              >
                                {checkingLearningStartEnrollmentId === enrollment.id
                                  ? '확인 중'
                                  : learningActionLabel}
                              </button>
                              {reviewAction}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                );

                return (
                  <article
                    className={classNames(
                      styles['courseCard'],
                      courseTab === 'EXPIRED' && styles['courseCardExpired'],
                    )}
                    key={enrollment.id}
                  >
                    {cardBody}
                  </article>
                );
              })}
            </div>

            <div className={styles['learningPagination']}>
              <PaginationControls
                currentPage={coursePage}
                onChange={setCoursePage}
                totalPages={coursePageCount}
              />
            </div>
          </div>
        )}
      </section>
    );
  };

  const renderOrderHistory = () => {
    const paymentCount = visiblePayments.length;
    const completedCount = visiblePayments.filter(
      (payment) => payment.status === 'COMPLETED',
    ).length;
    const cancelledCount = visiblePayments.filter(
      (payment) => payment.status === 'CANCELLED',
    ).length;
    const paymentFilterItems: Array<{
      count: number;
      label: string;
      value: PaymentStatusFilterValue;
    }> = [
      { count: paymentCount, label: '전체', value: 'ALL' },
      { count: completedCount, label: '결제 완료', value: 'COMPLETED' },
      { count: cancelledCount, label: '결제 취소', value: 'CANCELLED' },
    ];

    return (
      <section className={classNames(styles['contentSection'], styles['paymentSection'])}>
        <div className={styles['paymentHeader']}>
          <h2 className={styles['paymentTitle']}>결제내역</h2>
        </div>

        <div className={styles['paymentOverviewGrid']} role='tablist' aria-label='결제 상태'>
          {paymentFilterItems.map((item) => {
            const isActive = item.value === paymentStatusFilter;

            return (
              <button
                aria-pressed={isActive}
                className={classNames(
                  styles['paymentOverviewButton'],
                  isActive && styles['paymentOverviewButtonActive'],
                )}
                key={item.value}
                onClick={() => {
                  handlePaymentFilterChange(item.value);
                }}
                type='button'
              >
                <span
                  className={classNames(
                    styles['paymentOverviewLabel'],
                    isActive && styles['paymentOverviewLabelActive'],
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={classNames(
                    styles['paymentOverviewCount'],
                    isActive
                      ? styles['paymentOverviewCountActive']
                      : styles['paymentOverviewCountInactive'],
                  )}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {paymentHistoryQuery.isLoading ? (
          <p className={classNames(sharedStyles['mutedText'], styles['paymentEmptyState'])}>
            결제 내역을 불러오는 중입니다.
          </p>
        ) : null}

        {paymentHistoryQuery.isError ? (
          <p className={classNames(styles['errorText'], styles['paymentEmptyState'])}>
            {paymentHistoryQuery.error instanceof Error
              ? paymentHistoryQuery.error.message
              : '결제 내역을 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!paymentHistoryQuery.isLoading &&
        !paymentHistoryQuery.isError &&
        filteredPayments.length ? (
          <div className={styles['paymentList']}>
            {paginatedPayments.map((payment) => {
              const statusTone = payment.status === 'CANCELLED' ? 'cancelled' : 'completed';
              const isCancelPending = cancelPaymentMutation.isPending
                ? cancelPaymentMutation.variables.paymentId === payment.id
                : false;

              return (
                <article className={styles['paymentCard']} key={payment.id}>
                  <button
                    aria-label={`${payment.orderName} 결제 상세보기`}
                    className={styles['paymentCardClickTarget']}
                    onClick={() => {
                      openPaymentDetailModal(payment.id);
                    }}
                    type='button'
                  />
                  <div className={styles['paymentCardHeader']}>
                    <div className={styles['paymentCardTitleGroup']}>
                      <strong className={styles['paymentCardTitle']}>{payment.orderName}</strong>
                      <p
                        className={styles['paymentOrderNumber']}
                        title={payment.orderNumber ?? undefined}
                      >
                        주문번호 {formatOrderNumberPreview(payment.orderNumber)}
                      </p>
                    </div>
                    <div className={styles['paymentCardActions']}>
                      <span
                        className={classNames(
                          styles['paymentStatusChip'],
                          statusTone === 'completed'
                            ? styles['paymentStatusChipCompleted']
                            : styles['paymentStatusChipCancelled'],
                        )}
                      >
                        {paymentStatusLabels[payment.status]}
                      </span>
                      {payment.status === 'COMPLETED' ? (
                        payment.receiptUrl ? (
                          <a
                            className={styles['paymentReceiptLink']}
                            href={payment.receiptUrl}
                            rel='noreferrer'
                            target='_blank'
                          >
                            영수증
                          </a>
                        ) : (
                          <button
                            className={classNames(
                              styles['paymentReceiptLink'],
                              styles['paymentReceiptLinkDisabled'],
                            )}
                            disabled
                            title='영수증 URL을 준비 중입니다.'
                            type='button'
                          >
                            영수증
                          </button>
                        )
                      ) : null}
                      {payment.status === 'COMPLETED' ? (
                        <button
                          className={styles['paymentCancelButton']}
                          disabled={cancelPaymentMutation.isPending}
                          onClick={() => {
                            cancelPaymentMutation.mutate({ paymentId: payment.id });
                          }}
                          type='button'
                        >
                          {isCancelPending ? '취소 중' : '결제 취소'}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles['paymentMetaGrid']}>
                    <div className={styles['paymentMetaItem']}>
                      <span className={styles['paymentMetaLabel']}>결제일</span>
                      <strong className={styles['paymentMetaValue']}>
                        {formatPaymentDateTime(resolvePaymentProcessedAt(payment))}
                      </strong>
                    </div>
                    <div className={styles['paymentMetaItem']}>
                      <span className={styles['paymentMetaLabel']}>결제 수단</span>
                      <strong className={styles['paymentMetaValue']}>
                        {formatPaymentMethodLabel(payment.paymentMethod)}
                      </strong>
                    </div>
                    <div className={styles['paymentMetaItem']}>
                      <span className={styles['paymentMetaLabel']}>결제 금액</span>
                      <strong className={styles['paymentMetaValue']}>
                        {formatCurrency(payment.amount)}
                      </strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {!paymentHistoryQuery.isLoading &&
        !paymentHistoryQuery.isError &&
        paymentCount > 0 &&
        filteredPayments.length === 0 ? (
          <p className={classNames(sharedStyles['mutedText'], styles['paymentEmptyState'])}>
            선택한 상태의 결제 내역이 없습니다.
          </p>
        ) : null}

        {!paymentHistoryQuery.isLoading &&
        !paymentHistoryQuery.isError &&
        filteredPayments.length ? (
          <div className={styles['paymentPagination']}>
            <PaginationControls
              currentPage={paymentPage}
              onChange={setPaymentPage}
              totalPages={paymentPageCount}
            />
          </div>
        ) : null}

        {!paymentHistoryQuery.isLoading && !paymentHistoryQuery.isError && paymentCount === 0 ? (
          <p className={classNames(sharedStyles['mutedText'], styles['paymentEmptyState'])}>
            결제 내역이 없습니다.
          </p>
        ) : null}
      </section>
    );
  };

  const renderQuestionManagement = () => {
    const questionPageData = questionsQuery.data;
    const questions = questionPageData?.content ?? [];
    const totalQuestionCount = questionPageData?.totalElements ?? 0;
    const questionTotalPages = Math.max(1, questionPageData?.totalPages ?? 1);

    return (
      <section className={styles['questionSection']}>
        <h2 className={styles['questionTitle']}>Q&A 관리</h2>

        <div className={styles['questionNotice']}>
          <span
            aria-hidden='true'
            className={styles['questionNoticeIcon']}
            style={questionInfoIconStyle}
          />
          <div className={styles['questionNoticeBody']}>
            <strong className={styles['questionNoticeTitle']}>이용 안내</strong>
            <p className={styles['questionNoticeText']}>
              운영 Q&A는 상단 헤더의 Q&A에서, 강의 Q&A는 각 과정의 강의 화면에서 남길 수 있습니다.
            </p>
            <p className={styles['questionNoticeText']}>
              마이페이지에서는 내가 남긴 질문과 답변을 확인할 수 있습니다.
            </p>
          </div>
        </div>

        <div className={styles['questionFilters']}>
          <div className={styles['questionFilterRow']} role='tablist' aria-label='Q&A 유형 필터'>
            {[
              { label: '전체 문의', value: 'ALL' },
              { label: '운영 Q&A', value: 'GLOBAL' },
              { label: '강의 Q&A', value: 'PROGRAM' },
            ].map((option) => {
              const isActive = questionScopeFilter === option.value;

              return (
                <button
                  aria-selected={isActive}
                  className={classNames(
                    styles['questionFilterButton'],
                    isActive && styles['questionFilterButtonActive'],
                  )}
                  key={option.value}
                  onClick={() => {
                    handleQuestionScopeFilterChange(option.value as QuestionScopeFilterValue);
                  }}
                  role='tab'
                  type='button'
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className={styles['questionControlRow']}>
            <div
              className={styles['questionStatusFilterRow']}
              data-active-index={
                questionAnsweredFilter === 'ANSWERED'
                  ? 1
                  : questionAnsweredFilter === 'WAITING'
                    ? 2
                    : 0
              }
              role='tablist'
              aria-label='답변 상태 필터'
            >
              {[
                { label: '전체 상태', value: 'ALL' },
                { label: '답변 완료', value: 'ANSWERED' },
                { label: '답변 대기', value: 'WAITING' },
              ].map((option) => {
                const isActive = questionAnsweredFilter === option.value;

                return (
                  <button
                    aria-selected={isActive}
                    className={classNames(
                      styles['questionStatusFilterButton'],
                      isActive && styles['questionStatusFilterButtonActive'],
                    )}
                    key={option.value}
                    onClick={() => {
                      handleQuestionAnsweredFilterChange(option.value as MyQuestionAnsweredFilter);
                    }}
                    role='tab'
                    type='button'
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <UnifiedSearchBar
              className={styles['questionSearchBar']}
              inputAriaLabel='내 질문 검색'
              onChange={(nextValue) => {
                setQuestionSearchInput(nextValue);
              }}
              onSubmit={() => {
                setQuestionKeyword(questionSearchInput);
                setQuestionPage(1);
              }}
              placeholder='제목, 내용, 강의명을 검색해 주세요.'
              value={questionSearchInput}
            />
          </div>
        </div>

        <div className={styles['questionToolbar']}>
          <p className={styles['questionTotalCount']}>
            총 <strong>{totalQuestionCount}</strong>건
          </p>
        </div>

        {questionsQuery.isLoading ? (
          <p className={classNames(sharedStyles['mutedText'], styles['questionEmptyState'])}>
            내 질문을 불러오는 중입니다.
          </p>
        ) : null}

        {questionsQuery.isError ? (
          <p className={classNames(styles['errorText'], styles['questionEmptyState'])}>
            {questionsQuery.error instanceof Error
              ? questionsQuery.error.message
              : '내 질문을 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!questionsQuery.isLoading && !questionsQuery.isError && questions.length ? (
          <div className={styles['questionList']}>
            {questions.map((question) => {
              const isExpanded = expandedQuestionId === question.id;
              const programLabel = question.programTitle ?? '운영 문의';
              const hasAnswer = question.replies.length > 0;
              const toggleIconStyle = isExpanded
                ? questionChevronUpIconStyle
                : questionChevronDownIconStyle;

              return (
                <article className={styles['questionCard']} key={question.id}>
                  <div className={styles['questionCardMain']}>
                    <div className={styles['questionCardHeader']}>
                      <strong className={styles['questionCardTitle']}>
                        {question.privateQuestion ? '[비밀글] ' : ''}
                        {question.title}
                      </strong>
                      <span
                        className={classNames(
                          styles['questionStatusChip'],
                          hasAnswer
                            ? styles['questionStatusChipAnswered']
                            : styles['questionStatusChipWaiting'],
                        )}
                      >
                        {formatQuestionAnsweredLabel(hasAnswer)}
                      </span>
                    </div>

                    <div className={styles['questionMetaRow']}>
                      <span>{formatQuestionScopeLabel(question.scope)}</span>
                      <span aria-hidden='true' className={styles['questionMetaDot']} />
                      <span>{programLabel}</span>
                    </div>

                    <div className={styles['questionMetaRow']}>
                      <span>작성일 {formatQuestionDateTime(question.createdAt)}</span>
                    </div>

                    <p className={styles['questionContent']}>{question.content}</p>

                    <div className={styles['questionCardActions']}>
                      <button
                        className={classNames(
                          styles['questionReplyToggleButton'],
                          isExpanded && styles['questionReplyToggleButtonActive'],
                        )}
                        onClick={() => {
                          setExpandedQuestionId((current) =>
                            current === question.id ? null : question.id,
                          );
                        }}
                        type='button'
                      >
                        {isExpanded ? '답변 접기' : '답변 보기'}
                        <span
                          aria-hidden='true'
                          className={styles['questionReplyToggleIcon']}
                          style={toggleIconStyle}
                        />
                      </button>

                      <div className={styles['questionManageActions']}>
                        <button className={styles['questionManageButton']} type='button'>
                          수정하기
                        </button>
                        <button className={styles['questionManageButton']} type='button'>
                          질문 삭제
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && hasAnswer ? (
                    <div className={styles['questionReplies']}>
                      {question.replies.map((reply) => (
                        <div className={styles['questionReply']} key={reply.id}>
                          <span
                            aria-hidden='true'
                            className={styles['questionReplyIcon']}
                            style={questionReplyIconStyle}
                          />
                          <div className={styles['questionReplyBody']}>
                            <div className={styles['questionReplyHeader']}>
                              <strong className={styles['questionReplyAuthor']}>
                                {reply.adminReply ? '관리자' : reply.authorName}
                              </strong>
                              <span className={styles['questionReplyBadge']}>
                                {reply.adminReply ? '운영 답변' : '답글'}
                              </span>
                            </div>
                            <p className={styles['questionReplyDate']}>
                              {formatQuestionDateTime(reply.createdAt)}
                            </p>
                            <p className={styles['questionReplyContent']}>{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}

        {!questionsQuery.isLoading && !questionsQuery.isError && totalQuestionCount > 0 ? (
          <PaginationControls
            currentPage={questionPage}
            onChange={setQuestionPage}
            totalPages={questionTotalPages}
          />
        ) : null}

        {!questionsQuery.isLoading && !questionsQuery.isError && totalQuestionCount === 0 ? (
          <p className={classNames(sharedStyles['mutedText'], styles['questionEmptyState'])}>
            등록된 질문이 없습니다.
          </p>
        ) : null}
      </section>
    );
  };

  const renderProfileBasic = () => {
    if (profileQuery.isLoading) {
      return <p className={sharedStyles['mutedText']}>기본 정보를 불러오는 중입니다.</p>;
    }

    if (profileQuery.isError || !profileQuery.data) {
      return (
        <p className={styles['errorText']}>
          {profileQuery.error instanceof Error
            ? profileQuery.error.message
            : '기본 정보를 불러오지 못했습니다.'}
        </p>
      );
    }

    const resetProfileForm = () => {
      setProfileFormValues({
        email: profileQuery.data.email ?? '',
        name: profileQuery.data.name,
        nickname: profileQuery.data.nickname ?? '',
      });
      setProfileFormErrors({});
      setProfileFormResetVersion((currentVersion) => currentVersion + 1);
    };

    return (
      <section className={styles['profileSection']}>
        <h2 className={styles['profileTitle']}>내 정보 관리</h2>

        <div className={styles['profileAccountBlock']}>
          <h3 className={styles['profileSectionTitle']}>계정 정보</h3>

          <div className={styles['profileFormRows']}>
            <div className={styles['profileFormRow']}>
              <span className={styles['profileRowLabel']}>아이디</span>
              <div className={styles['profileFieldShell']}>
                <input
                  className={classNames(styles['profileInlineInput'], styles['profileInputMuted'])}
                  name='loginId'
                  readOnly
                  value={profileQuery.data.loginId}
                />
              </div>
              <span className={styles['profileRowHint']}>변경이 불가능합니다.</span>
            </div>

            <div className={styles['profileFormRow']}>
              <span className={styles['profileRowLabel']}>이름</span>
              <div className={styles['profileFieldShell']}>
                <input
                  className={classNames(styles['profileInlineInput'], styles['profileInputMuted'])}
                  name='name'
                  readOnly
                  value={resolvedProfileFormValues.name}
                />
              </div>
              <span className={styles['profileRowHint']}>변경이 불가능합니다.</span>
            </div>

            <div className={styles['profileFormRow']}>
              <label className={styles['profileRowLabel']} htmlFor='profile_email'>
                이메일
              </label>
              <div className={styles['profileFieldShell']}>
                <input
                  aria-describedby={profileFormErrors.email ? 'profile_email_error' : undefined}
                  aria-invalid={Boolean(profileFormErrors.email)}
                  className={styles['profileInlineInput']}
                  id='profile_email'
                  name='email'
                  onChange={handleProfileFieldChange('email')}
                  placeholder='이메일'
                  type='email'
                  value={resolvedProfileFormValues.email}
                />
                {profileFormErrors.email ? (
                  <p className={styles['profileFieldErrorText']} id='profile_email_error'>
                    {profileFormErrors.email}
                  </p>
                ) : null}
              </div>
            </div>

            <div className={styles['profileFormRow']}>
              <label className={styles['profileRowLabel']} htmlFor='profile_nickname'>
                닉네임
              </label>
              <div className={styles['profileFieldShell']}>
                <input
                  aria-describedby={
                    profileFormErrors.nickname ? 'profile_nickname_error' : undefined
                  }
                  aria-invalid={Boolean(profileFormErrors.nickname)}
                  className={styles['profileInlineInput']}
                  id='profile_nickname'
                  name='nickname'
                  onChange={handleProfileFieldChange('nickname')}
                  placeholder='닉네임'
                  value={resolvedProfileFormValues.nickname}
                />
                {profileFormErrors.nickname ? (
                  <p className={styles['profileFieldErrorText']} id='profile_nickname_error'>
                    {profileFormErrors.nickname}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <ProfilePasswordChangeSection key={`profile-password-${String(profileFormResetVersion)}`} />
        <ProfilePhoneChangeSection
          key={`profile-phone-${String(profileFormResetVersion)}`}
          phoneNumber={profileQuery.data.phoneNumber}
          phoneVerifiedAt={profileQuery.data.phoneVerifiedAt}
          verifiedIconStyle={profileCircleCheckIconStyle}
        />

        <div className={styles['profileConsentBlock']}>
          <h3 className={styles['profileSectionTitle']}>정보 동의</h3>

          <div className={styles['profileConsentList']}>
            <label
              className={classNames(styles['profileConsentRow'], styles['profileConsentAllRow'])}
            >
              <input
                checked={isOptionalPrivacyConsentAccepted}
                className={styles['profileConsentInput']}
                onChange={(event) => {
                  setIsOptionalPrivacyConsentAccepted(event.target.checked);
                }}
                type='checkbox'
              />
              <span className={styles['profileConsentBox']} aria-hidden='true'>
                <span className={styles['profileConsentCheck']} />
              </span>
              <span className={styles['profileConsentAllText']}>전체 동의하기</span>
            </label>

            <div className={styles['profileConsentDetailRows']}>
              <div className={styles['profileConsentDetailRow']}>
                <label className={styles['profileConsentRow']}>
                  <input
                    checked
                    className={styles['profileConsentInput']}
                    disabled
                    type='checkbox'
                  />
                  <span className={styles['profileConsentBox']} aria-hidden='true'>
                    <span className={styles['profileConsentCheck']} />
                  </span>
                  <span className={styles['profileConsentText']}>
                    <span className={styles['profileConsentRequired']}>필수</span>
                    <span>개인정보 수집 및 이용 동의</span>
                  </span>
                </label>
                <button
                  aria-label='개인정보 수집 및 이용 동의 보기'
                  className={styles['profileConsentViewButton']}
                  onClick={() => {
                    setProfileConsentModalType('privacyCollection');
                  }}
                  type='button'
                >
                  보기
                </button>
              </div>

              <div className={styles['profileConsentDetailRow']}>
                <label className={styles['profileConsentRow']}>
                  <input
                    checked={isOptionalPrivacyConsentAccepted}
                    className={styles['profileConsentInput']}
                    onChange={(event) => {
                      setIsOptionalPrivacyConsentAccepted(event.target.checked);
                    }}
                    type='checkbox'
                  />
                  <span className={styles['profileConsentBox']} aria-hidden='true'>
                    <span className={styles['profileConsentCheck']} />
                  </span>
                  <span className={styles['profileConsentText']}>
                    <span className={styles['profileConsentOptional']}>선택</span>
                    <span>광고성 정보 수신 동의</span>
                  </span>
                </label>
                <button
                  aria-label='광고성 정보 수신 동의 보기'
                  className={styles['profileConsentViewButton']}
                  onClick={() => {
                    setProfileConsentModalType('marketing');
                  }}
                  type='button'
                >
                  보기
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles['profileActionRow']}>
          <button
            className={styles['profileCancelButton']}
            onClick={resetProfileForm}
            type='button'
          >
            취소하기
          </button>
          <button
            className={styles['profileSaveButton']}
            disabled={
              updateProfileMutation.isPending || resolvedProfileFormValues.email.trim().length === 0
            }
            onClick={() => {
              const email = resolvedProfileFormValues.email.trim();
              if (!EMAIL_PATTERN.test(email)) {
                setProfileFormErrors((current) => ({
                  ...current,
                  email: EMAIL_INVALID_ERROR_MESSAGE,
                }));
                return;
              }

              updateProfileMutation.mutate({
                email,
                nickname: resolvedProfileFormValues.nickname.trim() || null,
              });
            }}
            type='button'
          >
            {updateProfileMutation.isPending ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </section>
    );
  };

  const renderActivePanel = () => {
    switch (activeView) {
      case 'learning':
        return renderLearningCourses();
      case 'payments':
        return renderOrderHistory();
      case 'profile':
        return renderProfileBasic();
      case 'questions':
        return renderQuestionManagement();
      default:
        return null;
    }
  };

  const renderLearningStartNoticeModal = () => {
    if (!learningStartNoticeModal) {
      return null;
    }

    const { enrollment, notice } = learningStartNoticeModal;

    return (
      <Modal
        bodyClassName={styles['learningStartNoticeModalBody']}
        closeButtonClassName={styles['learningStartNoticeModalCloseButton']}
        closeButtonContent={
          <span
            aria-hidden='true'
            className={styles['learningStartNoticeModalCloseIcon']}
            style={reviewCloseIconStyle}
          />
        }
        closeButtonLabel='수강 시작 확인 모달 닫기'
        headerClassName={styles['learningStartNoticeModalHeader']}
        onClose={() => {
          if (!acceptLearningStartNoticeMutation.isPending) {
            setLearningStartNoticeModal(null);
          }
        }}
        panelClassName={styles['learningStartNoticeModalPanel']}
        title={notice.title}
        titleClassName={styles['learningStartNoticeModalTitle']}
      >
        <div className={styles['learningStartNoticeModalContent']}>
          <p className={styles['learningStartNoticeProgramTitle']}>{enrollment.programTitle}</p>
          <p className={styles['learningStartNoticeIntro']}>
            아래 내용을 확인하고 동의하면 수강이 시작됩니다.
          </p>
          <ul className={styles['learningStartNoticeList']}>
            {notice.messages.map((message) => (
              <li className={styles['learningStartNoticeItem']} key={message}>
                {message}
              </li>
            ))}
          </ul>
          <div className={styles['learningStartNoticeActionRow']}>
            <button
              className={styles['learningStartNoticeCancelButton']}
              disabled={acceptLearningStartNoticeMutation.isPending}
              onClick={() => {
                setLearningStartNoticeModal(null);
              }}
              type='button'
            >
              취소
            </button>
            <button
              className={styles['learningStartNoticeConfirmButton']}
              disabled={acceptLearningStartNoticeMutation.isPending}
              onClick={() => {
                acceptLearningStartNoticeMutation.mutate(enrollment.id);
              }}
              type='button'
            >
              {acceptLearningStartNoticeMutation.isPending ? '처리 중' : '동의하고 수강 시작'}
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  const renderProfileConsentModal = () => {
    if (!profileConsentModalType) {
      return null;
    }

    const modalTitle = PROFILE_CONSENT_MODAL_TITLES[profileConsentModalType];
    const modalText = PROFILE_CONSENT_TEXTS[profileConsentModalType];
    const modalLines = modalText.split(/\r?\n/);

    return (
      <Modal
        bodyClassName={styles['profileConsentModalBody']}
        closeButtonClassName={styles['profileConsentModalCloseButton']}
        closeButtonContent={
          <span
            aria-hidden='true'
            className={styles['profileConsentModalCloseIcon']}
            style={reviewCloseIconStyle}
          />
        }
        closeButtonLabel={`${modalTitle} 모달 닫기`}
        headerClassName={styles['profileConsentModalHeader']}
        onClose={() => {
          setProfileConsentModalType(null);
        }}
        panelClassName={styles['profileConsentModalPanel']}
        size='lg'
        title={modalTitle}
        titleClassName={styles['profileConsentModalTitle']}
      >
        <div
          className={styles['profileConsentModalScroll']}
          data-lenis-prevent
          onTouchMove={(event) => {
            event.stopPropagation();
          }}
          onWheel={(event) => {
            event.stopPropagation();
          }}
        >
          <div className={styles['profileConsentModalContent']}>
            {modalLines.map((line, index) => renderProfileConsentDocumentLine(line, index))}
          </div>
        </div>
      </Modal>
    );
  };

  const renderProfilePasswordModal = () => {
    if (activeView !== 'profile' || isProfilePasswordVerified) {
      return null;
    }

    return (
      <Modal
        bodyClassName={styles['profilePasswordModalBody']}
        closeButtonClassName={styles['profilePasswordModalCloseButton']}
        closeButtonContent={
          <span
            aria-hidden='true'
            className={styles['profilePasswordModalCloseIcon']}
            style={reviewCloseIconStyle}
          />
        }
        closeButtonLabel='비밀번호 확인 모달 닫기'
        headerClassName={styles['profilePasswordModalHeader']}
        initialFocusRef={profilePasswordInputRef}
        onClose={closeProfilePasswordModal}
        panelClassName={styles['profilePasswordModalPanel']}
        title='비밀번호 확인'
        titleClassName={styles['profilePasswordModalTitle']}
      >
        <form className={styles['profilePasswordForm']} onSubmit={handleProfilePasswordSubmit}>
          <p className={styles['profilePasswordDescription']}>
            내 정보 관리에 접근하기 위해
            <br />
            비밀번호를 다시 입력해주세요.
          </p>

          <label className={styles['profilePasswordLabel']} htmlFor='profile_password_confirm'>
            비밀번호
          </label>

          <div className={styles['profilePasswordInputWrap']}>
            <input
              aria-describedby='profile_password_confirm_error'
              aria-invalid={Boolean(profilePasswordError)}
              autoComplete='current-password'
              className={styles['profilePasswordInput']}
              id='profile_password_confirm'
              onChange={(event) => {
                setProfilePassword(event.target.value);
                setProfilePasswordError(null);
              }}
              placeholder='비밀번호를 입력해 주세요.'
              ref={profilePasswordInputRef}
              type={isProfilePasswordVisible ? 'text' : 'password'}
              value={profilePassword}
            />
            <button
              aria-label={isProfilePasswordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
              className={styles['profilePasswordVisibilityButton']}
              onClick={() => {
                setIsProfilePasswordVisible((currentValue) => !currentValue);
              }}
              type='button'
            >
              <span
                aria-hidden='true'
                className={styles['profilePasswordEyeIcon']}
                style={profilePasswordEyeOffIconStyle}
              />
            </button>
          </div>

          <p
            aria-live='polite'
            className={classNames(
              styles['profilePasswordError'],
              !profilePasswordError && styles['profilePasswordErrorHidden'],
            )}
            id='profile_password_confirm_error'
          >
            {profilePasswordError ?? '비밀번호 오류 안내'}
          </p>

          <Link className={styles['profilePasswordRecoveryLink']} to={routePaths.accountRecovery}>
            비밀번호를 잊으셨나요?
          </Link>

          <div className={styles['profilePasswordActions']}>
            <button
              className={styles['profilePasswordCancelButton']}
              onClick={closeProfilePasswordModal}
              type='button'
            >
              취소
            </button>
            <button
              className={styles['profilePasswordConfirmButton']}
              disabled={verifyProfilePasswordMutation.isPending}
              type='submit'
            >
              {verifyProfilePasswordMutation.isPending ? '확인 중...' : '확인'}
            </button>
          </div>
        </form>
      </Modal>
    );
  };

  const renderCertificateProfileModal = () => {
    if (certificateEnrollmentId === null) {
      return null;
    }

    return (
      <Modal
        bodyClassName={styles['certificateProfileModalBody']}
        closeButtonClassName={styles['certificateProfileCloseButton']}
        closeButtonContent={
          <span
            aria-hidden='true'
            className={styles['certificateProfileCloseIcon']}
            style={reviewCloseIconStyle}
          />
        }
        closeButtonLabel='수료증 다운로드 모달 닫기'
        headerClassName={styles['certificateProfileModalHeader']}
        onClose={closeCertificateProfileModal}
        panelClassName={styles['certificateProfileModalPanel']}
        title='수료증 다운로드'
        titleClassName={styles['certificateProfileModalTitle']}
      >
        <form
          className={styles['certificateProfileForm']}
          data-lenis-prevent
          onTouchMove={(event) => {
            event.stopPropagation();
          }}
          onSubmit={handleCertificateProfileSubmit}
          onWheel={(event) => {
            event.stopPropagation();
          }}
        >
          <p className={styles['certificateProfileDescription']}>
            수료증에 표기될 한글 이름과 영문 이름을 입력해주세요.
            <br />
            입력한 이름은 수료증에 그대로 반영됩니다.
          </p>

          <div className={styles['certificateProfileFields']}>
            <div className={styles['certificateProfileField']}>
              <label
                className={styles['certificateProfileLabel']}
                htmlFor='certificate_korean_name'
              >
                한글 이름
              </label>
              <input
                className={styles['certificateProfileInput']}
                id='certificate_korean_name'
                maxLength={100}
                onChange={(event) => {
                  setCertificateProfileFormValues((currentValues) => ({
                    ...currentValues,
                    koreanName: event.target.value,
                  }));
                  setCertificateProfileFormError(null);
                }}
                placeholder='예 : 김소노'
                value={certificateProfileFormValues.koreanName}
              />
              <p className={styles['certificateProfileHelpText']}>
                수료증에 기재될 정확한 한글 이름을 입력해 주세요.
              </p>
            </div>

            <div className={styles['certificateProfileField']}>
              <label
                className={styles['certificateProfileLabel']}
                htmlFor='certificate_english_name'
              >
                영문 이름
              </label>
              <input
                autoCapitalize='characters'
                className={styles['certificateProfileInput']}
                id='certificate_english_name'
                maxLength={100}
                onChange={(event) => {
                  setCertificateProfileFormValues((currentValues) => ({
                    ...currentValues,
                    englishName: event.target.value,
                  }));
                  setCertificateProfileFormError(null);
                }}
                placeholder='예 : KIM SONO'
                value={certificateProfileFormValues.englishName}
              />
              <p className={styles['certificateProfileHelpText']}>
                띄어쓰기와 대소문자를 포함해 정확히 입력해주세요.
              </p>
            </div>
          </div>

          {certificateProfileFormError ? (
            <p className={styles['errorText']}>{certificateProfileFormError}</p>
          ) : null}

          <div className={styles['certificateProfileNotice']}>
            <span className={styles['certificateProfileNoticeIcon']} aria-hidden='true'>
              !
            </span>
            <div className={styles['certificateProfileNoticeText']}>
              <p>한 번 설정한 이름은 직접 수정할 수 없습니다.</p>
              <p>수료증에 기재될 정확한 이름을 입력해 주세요.</p>
            </div>
          </div>

          <div className={styles['certificateProfileActionRow']}>
            <button
              className={styles['certificateProfileCancelButton']}
              onClick={closeCertificateProfileModal}
              type='button'
            >
              취소
            </button>
            <button
              className={classNames(
                styles['certificateProfileSubmitButton'],
                createCertificateProfileMutation.isPending &&
                  styles['certificateProfileSubmitButtonDisabled'],
              )}
              disabled={createCertificateProfileMutation.isPending}
              type='submit'
            >
              {createCertificateProfileMutation.isPending ? '등록 중...' : '등록하기'}
            </button>
          </div>
        </form>
      </Modal>
    );
  };

  const renderCertificatePreviewModal = () => {
    if (!certificatePreview || !certificatePreviewSvgMarkup) {
      return null;
    }

    return (
      <Modal
        bodyClassName={styles['certificatePreviewModalBody']}
        closeButtonClassName={styles['certificatePreviewCloseButton']}
        closeButtonContent={
          <span
            aria-hidden='true'
            className={styles['certificatePreviewCloseIcon']}
            style={reviewCloseIconStyle}
          />
        }
        closeButtonLabel='수료증 미리보기 모달 닫기'
        headerClassName={styles['certificatePreviewModalHeader']}
        onClose={() => {
          setCertificatePreview(null);
        }}
        panelClassName={styles['certificatePreviewModalPanel']}
        size='lg'
        title='수료증 미리보기'
        titleClassName={styles['certificatePreviewModalTitle']}
      >
        <div
          className={styles['certificatePreviewScroll']}
          data-lenis-prevent
          onTouchMove={(event) => {
            event.stopPropagation();
          }}
          onWheel={(event) => {
            event.stopPropagation();
          }}
        >
          <div
            aria-label={`${certificatePreview.enrollment.programTitle} 수료증 미리보기`}
            className={styles['certificatePreviewCanvas']}
            dangerouslySetInnerHTML={{ __html: certificatePreviewSvgMarkup }}
            onContextMenu={(event) => {
              event.preventDefault();
            }}
            onCopy={(event) => {
              event.preventDefault();
            }}
            onDragStart={(event) => {
              event.preventDefault();
            }}
          />
        </div>

        <div className={styles['certificatePreviewActionRow']}>
          <button
            className={styles['certificatePreviewSecondaryButton']}
            onClick={handleCertificatePreviewPrint}
            type='button'
          >
            인쇄하기
          </button>
          <button
            className={styles['certificatePreviewPrimaryButton']}
            onClick={handleCertificatePreviewDownload}
            type='button'
          >
            다운로드
          </button>
        </div>
      </Modal>
    );
  };

  const renderReviewModal = () => {
    if (selectedEnrollmentId === null) {
      return null;
    }

    const detail = enrollmentDetailQuery.data;
    const isEditingReview = detail?.reviewAction === 'EDIT';
    const canManageReview = detail ? detail.reviewAction !== 'NONE' : false;
    const modalTitle = isEditingReview ? '후기 수정' : '후기 작성';
    const title = selectedEnrollment?.programTitle ?? detail?.programTitle ?? '강의 후기';
    const thumbnailUrl = selectedEnrollment?.programThumbnailUrl ?? null;
    const selectedRating = Number.parseInt(reviewFormValues.rating, 10);
    const normalizedRating =
      Number.isInteger(selectedRating) && selectedRating >= 1 && selectedRating <= 5
        ? selectedRating
        : 0;
    const reviewRatingLabel = REVIEW_RATING_LABELS[normalizedRating] ?? '';
    const reviewSubmitLabel = isEditingReview ? '후기 수정' : '후기 등록';
    const isReviewSubmitDisabled =
      reviewMutation.isPending ||
      deleteReviewMutation.isPending ||
      normalizedRating === 0 ||
      reviewFormValues.content.trim().length === 0;
    const isReviewDeleteDisabled =
      deleteReviewMutation.isPending ||
      reviewMutation.isPending ||
      detail?.review?.id === undefined;

    return (
      <Modal
        bodyClassName={styles['reviewModalBody']}
        closeButtonClassName={styles['reviewModalCloseButton']}
        closeButtonContent={
          <span
            aria-hidden='true'
            className={styles['reviewModalCloseIcon']}
            style={reviewCloseIconStyle}
          />
        }
        closeButtonLabel='후기 모달 닫기'
        headerClassName={styles['reviewModalHeader']}
        onClose={closeReviewModal}
        panelClassName={styles['reviewModalPanel']}
        title={modalTitle}
        titleClassName={styles['reviewModalTitle']}
      >
        {enrollmentDetailQuery.isLoading ? (
          <p className={sharedStyles['mutedText']}>후기 정보를 불러오는 중입니다.</p>
        ) : null}

        {enrollmentDetailQuery.isError ? (
          <p className={styles['errorText']}>
            {enrollmentDetailQuery.error instanceof Error
              ? enrollmentDetailQuery.error.message
              : '후기 정보를 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!enrollmentDetailQuery.isLoading && !enrollmentDetailQuery.isError && detail ? (
          canManageReview ? (
            <form className={styles['reviewForm']} onSubmit={handleReviewSubmit}>
              <div className={styles['reviewSummary']}>
                <div className={styles['reviewThumbnail']}>
                  {thumbnailUrl ? (
                    <img
                      alt={`${title} 대표 이미지`}
                      className={styles['reviewThumbnailImage']}
                      loading='lazy'
                      src={thumbnailUrl}
                    />
                  ) : (
                    <div aria-hidden='true' className={styles['reviewThumbnailFallback']} />
                  )}
                </div>
                <strong className={styles['reviewProgramTitle']}>{title}</strong>
              </div>

              <div className={styles['reviewFieldGrid']}>
                <div className={styles['reviewRatingSection']}>
                  <p className={styles['reviewFieldLabel']}>평점</p>
                  <div className={styles['reviewStarRow']} role='group' aria-label='평점 선택'>
                    {Array.from({ length: 5 }, (_, index) => {
                      const ratingValue = index + 1;
                      const isSelected = ratingValue <= normalizedRating;

                      return (
                        <button
                          aria-label={REVIEW_RATING_LABELS[ratingValue]}
                          aria-pressed={ratingValue === normalizedRating}
                          className={styles['reviewStarButton']}
                          key={ratingValue}
                          onClick={() => {
                            setReviewFormDraft({
                              enrollmentId: selectedEnrollmentId,
                              values: {
                                ...reviewFormValues,
                                rating: String(ratingValue),
                              },
                            });
                            setReviewFormError(null);
                          }}
                          type='button'
                        >
                          <span
                            aria-hidden='true'
                            className={classNames(
                              styles['reviewStarIcon'],
                              isSelected && styles['reviewStarIconActive'],
                            )}
                            style={reviewStarIconStyle}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <p
                    className={classNames(
                      styles['reviewRatingHint'],
                      normalizedRating === 0 && styles['reviewRatingHintHidden'],
                    )}
                  >
                    {reviewRatingLabel}
                  </p>
                </div>

                <div className={styles['reviewContentSection']}>
                  <label className={styles['reviewFieldLabel']} htmlFor='review_content'>
                    후기 내용
                  </label>
                  <textarea
                    className={styles['reviewTextArea']}
                    id='review_content'
                    name='content'
                    onChange={(event) => {
                      setReviewFormDraft({
                        enrollmentId: selectedEnrollmentId,
                        values: {
                          ...reviewFormValues,
                          content: event.target.value,
                        },
                      });
                      setReviewFormError(null);
                    }}
                    placeholder='수강 경험과 도움이 되었던 점을 간단히 작성해 주세요.'
                    rows={6}
                    value={reviewFormValues.content}
                  />
                </div>
              </div>

              {reviewFormError ? <p className={styles['errorText']}>{reviewFormError}</p> : null}

              <div className={styles['reviewActionRow']}>
                {isEditingReview ? (
                  <button
                    className={classNames(
                      styles['reviewDeleteButton'],
                      isReviewDeleteDisabled && styles['reviewDeleteButtonDisabled'],
                    )}
                    disabled={isReviewDeleteDisabled}
                    onClick={handleReviewDelete}
                    type='button'
                  >
                    {deleteReviewMutation.isPending ? '삭제 중...' : '후기 삭제'}
                  </button>
                ) : null}
                <button
                  className={styles['reviewCancelButton']}
                  onClick={closeReviewModal}
                  type='button'
                >
                  취소
                </button>
                <button
                  className={classNames(
                    styles['reviewSubmitButton'],
                    isReviewSubmitDisabled && styles['reviewSubmitButtonDisabled'],
                  )}
                  disabled={isReviewSubmitDisabled}
                  type='submit'
                >
                  {reviewMutation.isPending ? '저장 중...' : reviewSubmitLabel}
                </button>
              </div>
            </form>
          ) : (
            <div className={styles['reviewBlockedState']}>
              <strong className={styles['contentTitle']}>{detail.programTitle}</strong>
              <p className={sharedStyles['mutedText']}>현재 후기 작성 대상이 아닌 강의입니다.</p>
              <div className={styles['reviewActionRow']}>
                <Button
                  className={styles['compactButton']}
                  onClick={closeReviewModal}
                  type='button'
                >
                  닫기
                </Button>
              </div>
            </div>
          )
        ) : null}
      </Modal>
    );
  };

  const renderPaymentDetailModal = () => {
    if (!selectedPayment) {
      return null;
    }

    const detailItems: Array<{ label: string; value: string }> = [
      {
        label: '주문번호',
        value: formatOrderNumberPreview(selectedPayment.orderNumber),
      },
      {
        label: '주문 유형',
        value: formatOrderTypeLabel(selectedPayment.orderType),
      },
      {
        label: '상태',
        value: paymentStatusLabels[selectedPayment.status],
      },
      {
        label: '결제 수단',
        value: formatPaymentMethodLabel(selectedPayment.paymentMethod),
      },
      {
        label: '결제 금액',
        value: formatCurrency(selectedPayment.approvedAmount ?? selectedPayment.amount),
      },
      {
        label: '처리 시각',
        value: formatPaymentDateTime(resolvePaymentProcessedAt(selectedPayment)),
      },
    ];

    if (selectedPayment.cancelReason) {
      detailItems.push({
        label: '취소 사유',
        value: selectedPayment.cancelReason,
      });
    }

    const statusTone = selectedPayment.status === 'CANCELLED' ? 'cancelled' : 'completed';

    return (
      <Modal
        bodyClassName={styles['paymentDetailModalBody']}
        closeButtonClassName={styles['paymentDetailModalCloseButton']}
        closeButtonContent={
          <span
            aria-hidden='true'
            className={styles['paymentDetailModalCloseIcon']}
            style={reviewCloseIconStyle}
          />
        }
        closeButtonLabel='결제 상세 모달 닫기'
        headerClassName={styles['paymentDetailModalHeader']}
        onClose={closePaymentDetailModal}
        panelClassName={styles['paymentDetailModalPanel']}
        title='결제 상세'
        titleClassName={styles['paymentDetailModalTitle']}
      >
        <div className={styles['paymentDetailReceipt']}>
          <div className={styles['paymentDetailReceiptHeader']}>
            <div className={styles['paymentDetailTitleGroup']}>
              <p className={styles['paymentDetailEyebrow']}>결제 내역서</p>
              <strong className={styles['paymentDetailOrderTitle']}>
                {selectedPayment.orderName}
              </strong>
            </div>
            <span
              className={classNames(
                styles['paymentDetailStatusChip'],
                statusTone === 'completed'
                  ? styles['paymentDetailStatusChipCompleted']
                  : styles['paymentDetailStatusChipCancelled'],
              )}
            >
              {paymentStatusLabels[selectedPayment.status]}
            </span>
          </div>

          <div className={styles['paymentDetailDivider']} />

          <div className={styles['paymentDetailRows']}>
            {detailItems.map((item) => (
              <div className={styles['paymentDetailRow']} key={item.label}>
                <span className={styles['paymentDetailLabel']}>{item.label}</span>
                <strong className={styles['paymentDetailValue']}>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className={styles['paymentDetailDivider']} />
        </div>

        <button
          className={styles['paymentDetailCloseCta']}
          onClick={closePaymentDetailModal}
          type='button'
        >
          닫기
        </button>
      </Modal>
    );
  };

  return (
    <section className={classNames(sharedStyles['page'], styles['page'])}>
      <div className={classNames(sharedStyles['shell'], styles['shell'])}>
        <div className={classNames(sharedStyles['surface'], styles['surface'])}>
          <header className={classNames(sharedStyles['header'], styles['pageHeader'])}>
            <h1 className={sharedStyles['title']}>마이페이지</h1>
          </header>

          <div className={styles['layout']}>
            <aside className={styles['sidebar']}>
              <div className={styles['sidebarHeader']}>
                <strong className={styles['sidebarTitle']}>{accountName}님</strong>
              </div>

              <nav aria-label='마이페이지 메뉴' className={styles['menuGroups']}>
                <div className={styles['menuList']}>
                  {SIDEBAR_ITEMS.map((item) => {
                    const isActive = item.key === activeView;

                    return (
                      <button
                        aria-pressed={isActive}
                        className={classNames(
                          styles['menuButton'],
                          isActive && styles['menuButtonActive'],
                        )}
                        key={item.key}
                        onClick={() => {
                          handleViewChange(item.key);
                        }}
                        type='button'
                      >
                        <span
                          aria-hidden='true'
                          className={styles['menuIcon']}
                          style={buildMaskIconStyle(item.iconSrc)}
                        />
                        <span className={styles['menuLabel']}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>

              <div className={styles['sidebarFooter']}>
                <Button
                  className={classNames(styles['compactButton'], styles['logoutButton'])}
                  disabled={logoutMutation.isPending}
                  onClick={() => {
                    logoutMutation.mutate();
                  }}
                  variant='secondary'
                  type='button'
                >
                  <span
                    aria-hidden='true'
                    className={styles['logoutIcon']}
                    style={buildMaskIconStyle(mypageLogOutIconSrc)}
                  />
                  {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                </Button>
              </div>
            </aside>

            <div className={styles['panel']}>{renderActivePanel()}</div>
          </div>
        </div>
      </div>
      {renderReviewModal()}
      {renderCertificateProfileModal()}
      {renderCertificatePreviewModal()}
      {renderPaymentDetailModal()}
      {renderLearningStartNoticeModal()}
      {renderProfilePasswordModal()}
      {renderProfileConsentModal()}
    </section>
  );
};

export default MyPagePage;
