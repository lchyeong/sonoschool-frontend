import { useRef } from 'react';

import LoginModalContent from '@/components/auth/LoginModalContent/LoginModalContent';
import Modal from '@/components/overlay/Modal/Modal';
import { useModalStore } from '@/stores/useModalStore';

const ModalRoot = () => {
  const openedModalType = useModalStore((state) => state.openedModalType);
  const restoreFocusElement = useModalStore((state) => state.restoreFocusElement);
  const closeModal = useModalStore((state) => state.closeModal);
  const identifierInputRef = useRef<HTMLInputElement | null>(null);

  if (openedModalType !== 'login') {
    return null;
  }

  return (
    <Modal
      description='이 모달은 현재 목 인증 상태를 검증하기 위한 공통 로그인 UI입니다.'
      initialFocusRef={identifierInputRef}
      onClose={closeModal}
      restoreFocusElement={restoreFocusElement}
      title='로그인'
    >
      <LoginModalContent identifierInputRef={identifierInputRef} />
    </Modal>
  );
};

export default ModalRoot;
