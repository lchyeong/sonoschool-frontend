import { useNavigate } from 'react-router-dom';

import PlaceholderPage from '@/components/layout/PlaceholderPage/PlaceholderPage';
import Button from '@/components/ui/Button/Button';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';

const MyPagePage = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  return (
    <PlaceholderPage
      actions={
        <Button
          onClick={() => {
            logout();
            void navigate(routePaths.home);
          }}
          variant='secondary'
        >
          로그아웃
        </Button>
      }
      description='로그인한 사용자의 수강 현황, 프로필, 주문 내역이 이 페이지에 연결될 예정입니다. 현재는 헤더의 마이페이지 버튼 진입을 검증하기 위한 플레이스홀더입니다.'
      eyebrow='Member'
      secondary='로그아웃 버튼을 누르면 목 인증 상태가 해제되고 헤더에 로그인 버튼이 다시 표시됩니다.'
      title='마이페이지'
    />
  );
};

export default MyPagePage;
