import type { RefObject } from 'react';

import StudentLoginForm from '@/components/auth/StudentLoginForm/StudentLoginForm';
import Button from '@/components/ui/Button/Button';
import { useModalStore } from '@/stores/useModalStore';

import styles from './LoginModalContent.module.scss';

interface LoginModalContentProps {
  identifierInputRef: RefObject<HTMLInputElement | null>;
}

const LoginModalContent = ({ identifierInputRef }: LoginModalContentProps) => {
  const closeModal = useModalStore((state) => state.closeModal);

  return (
    <div className={styles['shell']}>
      <StudentLoginForm
        loginIdInputRef={identifierInputRef}
        onSuccess={closeModal}
        secondaryAction={
          <Button className={styles['actionButton']} onClick={closeModal} variant='secondary'>
            닫기
          </Button>
        }
        supportText='학생 계정 로그인만 연결되어 있습니다. 인증에 성공하면 모달이 닫히고 현재 화면을 유지합니다.'
      />
    </div>
  );
};

export default LoginModalContent;
