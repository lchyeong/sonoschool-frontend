import type { ChangeEvent } from 'react';
import { useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import { changeMyPassword } from '@/api/mypage';
import { useToastStore } from '@/stores/useToastStore';

import styles from '../MyPagePage.module.scss';

interface PasswordChangeFormValues {
  password: string;
  passwordConfirm: string;
}

interface PasswordChangeFormErrors {
  password?: string;
  passwordConfirm?: string;
}

const PASSWORD_ALLOWED_CHARACTER_PATTERN = /^[A-Za-z\d!@#$%&*?]*$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%&*?])[A-Za-z\d!@#$%&*?]{8,32}$/;
const PASSWORD_FORMAT_ERROR_MESSAGE = '특수문자, 영문, 숫자 포함 8자 이상 입력해주세요.';
const PASSWORD_CONFIRM_MISMATCH_ERROR_MESSAGE = '비밀번호가 일치하지 않습니다.';

const INITIAL_PASSWORD_FORM_VALUES: PasswordChangeFormValues = {
  password: '',
  passwordConfirm: '',
};

const omitPasswordChangeFormError = (
  errors: PasswordChangeFormErrors,
  fieldName: keyof PasswordChangeFormErrors,
): PasswordChangeFormErrors => {
  const { [fieldName]: omittedField, ...nextErrors } = errors;
  void omittedField;
  return nextErrors;
};

const getPasswordValidationError = (value: string): string | null => {
  return PASSWORD_ALLOWED_CHARACTER_PATTERN.test(value) && PASSWORD_PATTERN.test(value)
    ? null
    : PASSWORD_FORMAT_ERROR_MESSAGE;
};

const validatePasswordChangeForm = (values: PasswordChangeFormValues): PasswordChangeFormErrors => {
  const passwordError = getPasswordValidationError(values.password);
  const nextErrors: PasswordChangeFormErrors = {};

  if (passwordError) {
    nextErrors.password = passwordError;
  }
  if (!values.passwordConfirm || values.passwordConfirm !== values.password) {
    nextErrors.passwordConfirm = PASSWORD_CONFIRM_MISMATCH_ERROR_MESSAGE;
  }

  return nextErrors;
};

const ProfilePasswordChangeSection = () => {
  const showToast = useToastStore((state) => state.showToast);
  const [formValues, setFormValues] = useState<PasswordChangeFormValues>(
    INITIAL_PASSWORD_FORM_VALUES,
  );
  const [formErrors, setFormErrors] = useState<PasswordChangeFormErrors>({});

  const changePasswordMutation = useMutation({
    mutationFn: changeMyPassword,
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '비밀번호를 변경하지 못했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: () => {
      setFormValues(INITIAL_PASSWORD_FORM_VALUES);
      setFormErrors({});
      showToast({
        message: '비밀번호를 변경했습니다.',
        variant: 'success',
      });
    },
  });

  const handleFieldChange =
    (fieldName: keyof PasswordChangeFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setFormValues((currentValues) => ({
        ...currentValues,
        [fieldName]: nextValue,
      }));
      setFormErrors((currentErrors) => omitPasswordChangeFormError(currentErrors, fieldName));
    };

  const handleChangePassword = () => {
    const nextErrors = validatePasswordChangeForm(formValues);

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      showToast({
        message: nextErrors.password ?? nextErrors.passwordConfirm ?? '비밀번호를 확인해 주세요.',
        variant: 'error',
      });
      return;
    }

    changePasswordMutation.mutate(formValues);
  };

  return (
    <div className={styles['profilePasswordBlock']}>
      <div className={styles['profileFormRows']}>
        <div className={styles['profileStaticRow']}>
          <span className={styles['profileRowLabel']}>비밀번호 변경</span>
        </div>

        <div className={styles['profileFormRow']}>
          <label className={styles['profileRowLabel']} htmlFor='profile_new_password'>
            새 비밀번호
          </label>
          <div className={styles['profileFieldShell']}>
            <input
              aria-describedby={formErrors.password ? 'profile_new_password_error' : undefined}
              aria-invalid={Boolean(formErrors.password)}
              autoComplete='new-password'
              className={styles['profileInlineInput']}
              id='profile_new_password'
              name='password'
              onChange={handleFieldChange('password')}
              placeholder='특수문자, 영문, 숫자 포함 8자 이상'
              type='password'
              value={formValues.password}
            />
            {formErrors.password ? (
              <p className={styles['profileFieldErrorText']} id='profile_new_password_error'>
                {formErrors.password}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles['profileFormRow']}>
          <label className={styles['profileRowLabel']} htmlFor='profile_new_password_confirm'>
            비밀번호 확인
          </label>
          <div className={styles['profileFieldShell']}>
            <input
              aria-describedby={
                formErrors.passwordConfirm ? 'profile_new_password_confirm_error' : undefined
              }
              aria-invalid={Boolean(formErrors.passwordConfirm)}
              autoComplete='new-password'
              className={styles['profileInlineInput']}
              id='profile_new_password_confirm'
              name='passwordConfirm'
              onChange={handleFieldChange('passwordConfirm')}
              placeholder='비밀번호를 한 번 더 입력해주세요'
              type='password'
              value={formValues.passwordConfirm}
            />
            {formErrors.passwordConfirm ? (
              <p
                className={styles['profileFieldErrorText']}
                id='profile_new_password_confirm_error'
              >
                {formErrors.passwordConfirm}
              </p>
            ) : null}
          </div>
          <button
            className={styles['profileOutlineButton']}
            disabled={
              changePasswordMutation.isPending ||
              formValues.password.length === 0 ||
              formValues.passwordConfirm.length === 0
            }
            onClick={handleChangePassword}
            type='button'
          >
            {changePasswordMutation.isPending ? '변경 중...' : '비밀번호 변경'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePasswordChangeSection;
