import { Link, useNavigate } from 'react-router-dom';

import PlaceholderPage from '@/components/layout/PlaceholderPage/PlaceholderPage';
import Button from '@/components/ui/Button/Button';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';

const LoginPage = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  return (
    <PlaceholderPage
      actions={
        <>
          <Button
            onClick={() => {
              login();
              void navigate(routePaths.mypage);
            }}
          >
            로그인 상태로 전환
          </Button>
          <Link to={routePaths.signup}>회원가입으로 이동</Link>
        </>
      }
      description='실제 계정 인증 API가 연결되면 로그인 폼이 이 위치에 들어옵니다. 현재는 헤더 인증 흐름을 검증하기 위한 목 페이지입니다.'
      eyebrow='Auth'
      secondary='로그인 버튼을 누르면 목 인증 상태가 저장되고 헤더에 마이페이지 버튼이 표시됩니다.'
      title='로그인'
    />
  );
};

export default LoginPage;
