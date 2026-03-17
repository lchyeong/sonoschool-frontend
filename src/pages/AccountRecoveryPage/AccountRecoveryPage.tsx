import type { ChangeEvent } from 'react';
import { useState } from 'react';

import { Link } from 'react-router-dom';

import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import { routePaths } from '@/routes/routeRegistry';
import sharedStyles from '@/styles/accountPage.module.scss';
import { classNames } from '@/utils/classNames';

import styles from './AccountRecoveryPage.module.scss';

type RecoveryMode = 'findId' | 'resetPassword';

interface RecoveryFormValues {
  findIdName: string;
  findIdPhoneNumber: string;
  resetPasswordLoginId: string;
  resetPasswordPhoneNumber: string;
}

const INITIAL_FORM_VALUES: RecoveryFormValues = {
  findIdName: '',
  findIdPhoneNumber: '',
  resetPasswordLoginId: '',
  resetPasswordPhoneNumber: '',
};

const AccountRecoveryPage = () => {
  const [mode, setMode] = useState<RecoveryMode>('findId');
  const [formValues, setFormValues] = useState<RecoveryFormValues>(INITIAL_FORM_VALUES);

  const handleFieldChange =
    (fieldName: keyof RecoveryFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setFormValues((current) => ({
        ...current,
        [fieldName]: nextValue,
      }));
    };

  return (
    <section className={sharedStyles['page']}>
      <div className={classNames(sharedStyles['shell'], sharedStyles['shellNarrow'])}>
        <div className={sharedStyles['surface']}>
          <header className={sharedStyles['header']}>
            <h1 className={sharedStyles['title']}>아이디/비밀번호 찾기</h1>
            <p className={sharedStyles['description']}>가입할 때 사용한 정보를 입력해 주세요.</p>
          </header>

          <div className={sharedStyles['segmentRow']}>
            <button
              className={classNames(
                sharedStyles['segmentButton'],
                mode === 'findId' && sharedStyles['segmentButtonActive'],
              )}
              onClick={() => {
                setMode('findId');
              }}
              type='button'
            >
              아이디 찾기
            </button>
            <button
              className={classNames(
                sharedStyles['segmentButton'],
                mode === 'resetPassword' && sharedStyles['segmentButtonActive'],
              )}
              onClick={() => {
                setMode('resetPassword');
              }}
              type='button'
            >
              비밀번호 재설정
            </button>
          </div>

          {mode === 'findId' ? (
            <section className={sharedStyles['section']}>
              <div className={sharedStyles['sectionHeader']}>
                <h2 className={sharedStyles['sectionTitle']}>아이디 찾기</h2>
                <p className={sharedStyles['sectionDescription']}>
                  이름과 휴대폰 번호를 입력해 주세요.
                </p>
              </div>

              <div className={classNames(sharedStyles['fieldGrid'], styles['fieldGrid'])}>
                <TextField
                  label='이름'
                  name='findIdName'
                  onChange={handleFieldChange('findIdName')}
                  placeholder='이름'
                  value={formValues.findIdName}
                />
                <TextField
                  label='휴대폰 번호'
                  name='findIdPhoneNumber'
                  onChange={handleFieldChange('findIdPhoneNumber')}
                  placeholder='010-1234-5678'
                  value={formValues.findIdPhoneNumber}
                />
              </div>
            </section>
          ) : (
            <section className={sharedStyles['section']}>
              <div className={sharedStyles['sectionHeader']}>
                <h2 className={sharedStyles['sectionTitle']}>비밀번호 재설정</h2>
                <p className={sharedStyles['sectionDescription']}>
                  아이디와 휴대폰 번호를 입력해 주세요.
                </p>
              </div>

              <div className={classNames(sharedStyles['fieldGrid'], styles['fieldGrid'])}>
                <TextField
                  label='아이디'
                  name='resetPasswordLoginId'
                  onChange={handleFieldChange('resetPasswordLoginId')}
                  placeholder='아이디'
                  value={formValues.resetPasswordLoginId}
                />
                <TextField
                  label='휴대폰 번호'
                  name='resetPasswordPhoneNumber'
                  onChange={handleFieldChange('resetPasswordPhoneNumber')}
                  placeholder='010-1234-5678'
                  value={formValues.resetPasswordPhoneNumber}
                />
              </div>
            </section>
          )}

          <section className={sharedStyles['section']}>
            <p className={sharedStyles['mutedText']}>
              온라인 찾기 기능은 준비 중입니다. 빠른 확인이 필요하면 문의를 남겨 주세요.
            </p>

            <div className={styles['actionRow']}>
              <Button disabled type='button'>
                준비 중
              </Button>
              <div className={sharedStyles['linkRow']}>
                <Link className={sharedStyles['textLink']} to={routePaths.contact}>
                  문의하기
                </Link>
                <Link className={sharedStyles['textLink']} to={routePaths.login}>
                  로그인으로 돌아가기
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
};

export default AccountRecoveryPage;
