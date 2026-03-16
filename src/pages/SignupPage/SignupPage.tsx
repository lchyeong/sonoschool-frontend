import { Link, useNavigate } from 'react-router-dom';

import PlaceholderPage from '@/components/layout/PlaceholderPage/PlaceholderPage';
import Button from '@/components/ui/Button/Button';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';

const SignupPage = () => {
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
            회원가입 완료 상태로 전환
          </Button>
          <Link to={routePaths.login}>이미 계정이 있다면 로그인</Link>
        </>
      }
      description='실제 회원가입 API가 연결되면 계정 생성 폼이 이 위치에 들어옵니다. 현재는 헤더 흐름을 검증하기 위한 목 페이지입니다.'
      eyebrow='Auth'
      secondary='이 버튼을 누르면 목 인증 상태가 로그인으로 바뀌고 마이페이지로 이동합니다.'
      title='회원가입'
    />
  );
};

export default SignupPage;
