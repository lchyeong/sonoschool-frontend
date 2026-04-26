import { Link } from 'react-router-dom';

import StudentLoginForm from '@/components/auth/StudentLoginForm/StudentLoginForm';
import { routePaths } from '@/routes/routeRegistry';
import sharedStyles from '@/styles/accountPage.module.scss';
import { classNames } from '@/utils/classNames';

import styles from './LoginPage.module.scss';

const LoginPage = () => {
  return (
    <section className={classNames(sharedStyles['page'], styles['page'])}>
      <div
        className={classNames(sharedStyles['shell'], sharedStyles['shellNarrow'], styles['shell'])}
      >
        <div className={classNames(sharedStyles['surface'], styles['surface'])}>
          <header className={classNames(sharedStyles['header'], styles['header'])}>
            <h1 className={classNames(sharedStyles['title'], styles['title'])}>로그인</h1>
          </header>

          <StudentLoginForm
            className={styles['form']}
            inputClassName={styles['input']}
            inputErrorClassName={styles['fieldError']}
            inputFieldClassName={styles['field']}
            inputLabelClassName={styles['fieldLabel']}
            showRememberLoginId
            secondaryAction={
              <div className={styles['actionLinks']}>
                <Link className={styles['actionLink']} to={routePaths.signup}>
                  회원가입
                </Link>
                <span aria-hidden='true' className={styles['actionDivider']} />
                <Link className={styles['actionLink']} to={routePaths.accountRecovery}>
                  아이디/비밀번호 찾기
                </Link>
              </div>
            }
            submitButtonClassName={styles['submitButton']}
            variant='page'
          />
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
