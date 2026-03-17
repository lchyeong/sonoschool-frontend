import { Link } from 'react-router-dom';

import PlaceholderPage from '@/components/layout/PlaceholderPage/PlaceholderPage';
import { routePaths } from '@/routes/routeRegistry';

const CartPage = () => {
  return (
    <PlaceholderPage
      actions={
        <>
          <Link to={routePaths.programs}>강의 둘러보기</Link>
          <Link to={routePaths.login}>로그인</Link>
        </>
      }
      description='담아둔 강의를 확인하고 결제로 이어지는 흐름을 이곳에서 정리하게 됩니다.'
      sections={[
        {
          title: '현재 상태',
          items: ['아직 담아둔 강의가 없습니다.'],
        },
        {
          title: '다음 단계',
          items: ['교육과정을 둘러보고 필요한 강의를 장바구니에 담아 주세요.'],
        },
      ]}
      title='장바구니'
    />
  );
};

export default CartPage;
