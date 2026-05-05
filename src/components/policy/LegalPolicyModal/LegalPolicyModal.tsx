import Modal from '@/components/overlay/Modal/Modal';
import privacyCollectionConsentText from '@/content/privacyCollectionConsent.ko-KR.txt?raw';
import privacyPolicyText from '@/content/privacyPolicy.ko-KR.txt?raw';
import refundPolicyText from '@/content/refundPolicy.ko-KR.txt?raw';
import termsOfUseText from '@/content/termsOfUse.ko-KR.txt?raw';

import styles from './LegalPolicyModal.module.scss';

export type LegalPolicyType = 'privacy' | 'privacyCollection' | 'refund' | 'terms';

const policyContent: Record<LegalPolicyType, { text: string; title: string }> = {
  privacy: {
    text: privacyPolicyText,
    title: '개인정보처리방침',
  },
  privacyCollection: {
    text: privacyCollectionConsentText,
    title: '개인정보 수집 및 이용 동의',
  },
  refund: {
    text: refundPolicyText,
    title: '환불정책',
  },
  terms: {
    text: termsOfUseText,
    title: '이용약관',
  },
};

const renderPolicyLine = (line: string, index: number) => {
  const trimmedLine = line.trim();
  const lineKey = `${String(index)}-${trimmedLine}`;

  if (trimmedLine.length === 0) {
    return <span aria-hidden='true' className={styles['policyModalSpacer']} key={lineKey} />;
  }

  if (/^제\s*\d+\s*장/.test(trimmedLine)) {
    return (
      <h3 className={styles['policyModalChapterTitle']} key={lineKey}>
        {trimmedLine}
      </h3>
    );
  }

  if (/^제\s*\d+\s*조/.test(trimmedLine)) {
    return (
      <h4 className={styles['policyModalArticleTitle']} key={lineKey}>
        {trimmedLine}
      </h4>
    );
  }

  if (/^(\(\d+\)|\d+\.|①|②|③|④|⑤|⑥|-)/.test(trimmedLine)) {
    return (
      <p className={styles['policyModalIndentedText']} key={lineKey}>
        {trimmedLine}
      </p>
    );
  }

  return (
    <p className={styles['policyModalParagraph']} key={lineKey}>
      {trimmedLine}
    </p>
  );
};

interface LegalPolicyModalProps {
  onClose: () => void;
  type: LegalPolicyType;
}

const LegalPolicyModal = ({ onClose, type }: LegalPolicyModalProps) => {
  const content = policyContent[type];
  const policyLines = content.text.split(/\r?\n/);

  return (
    <Modal
      bodyClassName={styles['policyModalBody']}
      closeButtonLabel={`${content.title} 모달 닫기`}
      onClose={onClose}
      panelClassName={styles['policyModalPanel']}
      title={content.title}
    >
      <div
        className={styles['policyModalScroll']}
        data-lenis-prevent
        onTouchMove={(event) => {
          event.stopPropagation();
        }}
        onWheel={(event) => {
          event.stopPropagation();
        }}
      >
        <div className={styles['policyModalText']}>
          {policyLines.map((line, index) => renderPolicyLine(line, index))}
        </div>
      </div>
    </Modal>
  );
};

export default LegalPolicyModal;
