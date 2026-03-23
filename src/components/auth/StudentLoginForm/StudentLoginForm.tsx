import type { ChangeEvent, FormEvent, ReactNode, RefObject } from 'react';
import { useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';

import { loginStudent, verifyStudentLoginSms } from '@/api/auth';
import { clearGuestCart, getGuestCart, retainGuestCartPrograms } from '@/api/guestCart';
import { addMyCartItem, fetchMyCart } from '@/api/mypage';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import { myCartQueryKey, myCouponsQueryKey } from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartSelectionStore } from '@/stores/useCartSelectionStore';
import { useToastStore } from '@/stores/useToastStore';
import type { StudentLoginChallenge } from '@/types/auth';
import { resolveCartQueryScope } from '@/utils/cartQueryScope';

import styles from './StudentLoginForm.module.scss';

interface LoginFormValues {
  loginId: string;
  password: string;
}

interface LoginFormErrors {
  code?: string;
  loginId?: string;
  password?: string;
}

interface StudentLoginFormProps {
  secondaryAction?: ReactNode;
  submitLabel?: string;
  supportText?: string;
  onSuccess?: () => void;
  loginIdInputRef?: RefObject<HTMLInputElement | null>;
  initialValues?: Partial<LoginFormValues> | undefined;
}

interface LoginRedirectState {
  from?: {
    pathname?: string;
    search?: string;
  };
}

const INITIAL_FORM_VALUES: LoginFormValues = {
  loginId: '',
  password: '',
};
const MOCK_SMS_CODE = '123456';

const StudentLoginForm = ({
  secondaryAction,
  submitLabel = '로그인',
  supportText,
  onSuccess,
  loginIdInputRef,
  initialValues,
}: StudentLoginFormProps) => {
  const internalLoginIdInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const showToast = useToastStore((state) => state.showToast);
  const replaceSelection = useCartSelectionStore((state) => state.replaceSelection);

  const [formValues, setFormValues] = useState<LoginFormValues>(() => ({
    ...INITIAL_FORM_VALUES,
    ...initialValues,
  }));
  const [formErrors, setFormErrors] = useState<LoginFormErrors>({});
  const [verificationCode, setVerificationCode] = useState('');
  const [loginChallenge, setLoginChallenge] = useState<StudentLoginChallenge | null>(null);

  const mergeGuestCartIntoServer = async () => {
    const guestCart = getGuestCart();

    if (!guestCart.items.length) {
      return { failedCount: 0, serverCart: null as Awaited<ReturnType<typeof fetchMyCart>> | null };
    }

    const currentSelection = useCartSelectionStore.getState().selectedItemIds;
    const selectedProgramIds = new Set(
      guestCart.items
        .filter((item) => currentSelection.includes(item.id))
        .map((item) => item.programId),
    );
    const failedProgramIds = new Set<number>();

    for (const item of guestCart.items) {
      try {
        await addMyCartItem({
          instructorName: item.instructorName,
          originalPrice: item.originalPrice,
          payablePrice: item.payablePrice,
          programId: item.programId,
          programType: item.programType,
          salePrice: item.salePrice,
          sourcePath: item.detailPath,
          thumbnailUrl: item.thumbnailUrl,
          title: item.title,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '';

        if (!message.includes('이미 장바구니에 담긴 강의')) {
          failedProgramIds.add(item.programId);
        }
      }
    }

    const serverCart = await fetchMyCart();
    const selectedItemIds = serverCart.items
      .filter((item) => selectedProgramIds.has(item.programId))
      .map((item) => item.id);

    replaceSelection(selectedItemIds, null);

    if (failedProgramIds.size > 0) {
      retainGuestCartPrograms([...failedProgramIds]);
    } else {
      clearGuestCart();
    }

    return {
      failedCount: failedProgramIds.size,
      serverCart,
    };
  };

  const resolvePostLoginPath = () => {
    const redirectState = location.state as LoginRedirectState | null;
    const from = redirectState?.from;

    if (typeof from?.pathname === 'string' && from.pathname.trim()) {
      return `${from.pathname}${typeof from.search === 'string' ? from.search : ''}`;
    }

    return routePaths.mypage;
  };

  const finalizeAuthenticatedLogin = async (session: {
    accessToken: string;
    tokenType: string;
    expiresAt: string;
    loginId: string;
    displayName: string;
    role: string;
  }) => {
    setSession(session);

    const cartScope = resolveCartQueryScope(true);
    const mergeResult = await mergeGuestCartIntoServer();

    if (mergeResult.serverCart) {
      queryClient.setQueryData(myCartQueryKey(cartScope), mergeResult.serverCart);
      queryClient.setQueryData(myCouponsQueryKey(cartScope), []);
    }

    if (mergeResult.failedCount > 0) {
      showToast({
        message: '일부 비로그인 장바구니 항목은 옮기지 못했습니다. 장바구니에서 다시 확인해 주세요.',
        variant: 'info',
      });
    }

    showToast({
      message: `${session.displayName}님으로 로그인했습니다.`,
      variant: 'success',
    });

    if (onSuccess) {
      onSuccess();
      return;
    }

    void navigate(resolvePostLoginPath(), { replace: true });
  };

  const loginMutation = useMutation({
    mutationFn: loginStudent,
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error ? error.message : '로그인에 실패했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: async (session) => {
      if (session.status === 'SMS_REQUIRED') {
        setLoginChallenge(session);
        setVerificationCode(MOCK_SMS_CODE);
        showToast({
          message: `${session.maskedPhoneNumber} 번호로 인증번호를 보냈습니다.`,
          variant: 'success',
        });
        window.setTimeout(() => {
          codeInputRef.current?.focus();
        }, 0);
        return;
      }

      await finalizeAuthenticatedLogin(session);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: verifyStudentLoginSms,
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '문자 인증 확인에 실패했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: async (session) => {
      setLoginChallenge(null);
      setVerificationCode('');
      await finalizeAuthenticatedLogin(session);
    },
  });

  const handleFieldChange =
    (fieldName: keyof LoginFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setFormValues((current) => ({
        ...current,
        [fieldName]: nextValue,
      }));

      setFormErrors((current) => ({
        ...current,
        [fieldName]: undefined,
      }));
    };

  const resolvedLoginIdInputRef = loginIdInputRef ?? internalLoginIdInputRef;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loginChallenge) {
      const trimmedCode = verificationCode.trim();
      if (!trimmedCode) {
        setFormErrors((current) => ({
          ...current,
          code: '인증번호를 입력해 주세요.',
        }));
        codeInputRef.current?.focus();
        return;
      }

      setFormErrors((current) => ({
        ...current,
        code: '',
      }));
      verifyMutation.mutate({
        challengeToken: loginChallenge.challengeToken,
        code: trimmedCode,
      });
      return;
    }

    const nextErrors: LoginFormErrors = {};

    if (!formValues.loginId.trim()) {
      nextErrors.loginId = '아이디를 입력해 주세요.';
    }

    if (!formValues.password.trim()) {
      nextErrors.password = '비밀번호를 입력해 주세요.';
    }

    setFormErrors(nextErrors);

    if (nextErrors.loginId) {
      resolvedLoginIdInputRef.current?.focus();
      return;
    }

    if (nextErrors.password) {
      passwordInputRef.current?.focus();
      return;
    }

    loginMutation.mutate({
      loginId: formValues.loginId.trim(),
      password: formValues.password,
    });
  };

  const handleCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setVerificationCode(event.target.value);
    setFormErrors((current) => ({
      ...current,
      code: '',
    }));
  };

  const resetLoginChallenge = () => {
    setLoginChallenge(null);
    setVerificationCode('');
    setFormErrors((current) => ({
      ...current,
      code: '',
    }));
  };

  return (
    <form className={styles['form']} noValidate onSubmit={handleSubmit}>
      {supportText ? <p className={styles['supportText']}>{supportText}</p> : null}

      <div className={styles['fieldGroup']}>
        {loginChallenge ? (
          <>
            <p className={styles['challengeSummary']}>
              새 환경 로그인으로 확인되어 {loginChallenge.maskedPhoneNumber} 번호로 문자 인증이
              필요합니다.
            </p>
            <p className={styles['challengeHint']}>
              개발환경에서는 인증번호가 `123456`으로 고정됩니다.
            </p>
            <TextField
              autoComplete='one-time-code'
              errorMessage={formErrors.code}
              label='인증번호'
              name='verificationCode'
              onChange={handleCodeChange}
              placeholder='123456'
              ref={codeInputRef}
              value={verificationCode}
            />
          </>
        ) : (
          <>
            <TextField
              autoComplete='username'
              errorMessage={formErrors.loginId}
              label='아이디'
              name='loginId'
              onChange={handleFieldChange('loginId')}
              placeholder='student01'
              ref={resolvedLoginIdInputRef}
              value={formValues.loginId}
            />

            <TextField
              autoComplete='current-password'
              errorMessage={formErrors.password}
              label='비밀번호'
              name='password'
              onChange={handleFieldChange('password')}
              placeholder='비밀번호를 입력해 주세요'
              ref={passwordInputRef}
              type='password'
              value={formValues.password}
            />
          </>
        )}
      </div>

      <div className={styles['actionGroup']}>
        <Button
          className={styles['submitButton']}
          disabled={loginMutation.isPending || verifyMutation.isPending}
          type='submit'
        >
          {loginChallenge
            ? verifyMutation.isPending
              ? '인증 확인 중...'
              : '문자 인증 확인'
            : loginMutation.isPending
              ? '로그인 중...'
              : submitLabel}
        </Button>
        {loginChallenge ? (
          <Button onClick={resetLoginChallenge} type='button' variant='secondary'>
            다시 입력
          </Button>
        ) : null}
        {secondaryAction}
      </div>
    </form>
  );
};

export default StudentLoginForm;
