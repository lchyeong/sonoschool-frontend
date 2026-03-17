import { Link } from 'react-router-dom';

import PlaceholderPage from '@/components/layout/PlaceholderPage/PlaceholderPage';
import { routePaths } from '@/routes/routeRegistry';

const NoticesPage = () => {
  return (
    <PlaceholderPage
      actions={
        <>
          <Link to={routePaths.contact}>문의하기</Link>
          <Link to={routePaths.home}>홈으로 돌아가기</Link>
        </>
      }
      description='운영 공지와 일정 변경 내용을 한곳에서 확인할 수 있도록 준비 중입니다.'
      layout='plain'
      sections={[
        {
          title: '이 페이지에서 보게 될 내용',
          items: ['최신 공지 확인', '교육 일정 변경 안내', '필독 공지 모아보기'],
        },
        {
          title: '지금 필요한 경우',
          items: ['급한 일정 확인이 필요하면 문의를 남겨 주세요.'],
        },
      ]}
      title='공지사항'
    />
  );
};

export default NoticesPage;
