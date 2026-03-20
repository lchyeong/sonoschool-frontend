import { Link } from 'react-router-dom';

import StudentLoginForm from '@/components/auth/StudentLoginForm/StudentLoginForm';
import { routePaths } from '@/routes/routeRegistry';
import sharedStyles from '@/styles/accountPage.module.scss';
import { classNames } from '@/utils/classNames';

import styles from './LoginPage.module.scss';

const LoginPage = () => {
  return (
    <section className={sharedStyles['page']}>
      <div className={classNames(sharedStyles['shell'], sharedStyles['shellNarrow'])}>
        <div className={classNames(sharedStyles['surface'], styles['surface'])}>
          <header className={sharedStyles['header']}>
            <h1 className={sharedStyles['title']}>로그인</h1>
          </header>

          <StudentLoginForm
            initialValues={{
              loginId: 'student01',
              password: 'password123',
            }}
            secondaryAction={
              <div className={styles['actionLinks']}>
                <Link className={sharedStyles['textLink']} to={routePaths.signup}>
                  회원가입
                </Link>
                <Link className={sharedStyles['textLink']} to={routePaths.accountRecovery}>
                  아이디/비밀번호 찾기
                </Link>
              </div>
            }
          />
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
