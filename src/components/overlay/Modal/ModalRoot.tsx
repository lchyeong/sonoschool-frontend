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
      description='학생 계정 아이디와 비밀번호로 로그인할 수 있는 공통 인증 UI입니다.'
      initialFocusRef={identifierInputRef}
      onClose={closeModal}
      restoreFocusElement={restoreFocusElement}
      title='학생 로그인'
    >
      <LoginModalContent identifierInputRef={identifierInputRef} />
    </Modal>
  );
};

export default ModalRoot;
