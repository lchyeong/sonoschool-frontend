import { Link } from 'react-router-dom';

import PlaceholderPage from '@/components/layout/PlaceholderPage/PlaceholderPage';
import { routePaths } from '@/routes/routeRegistry';

const ReviewsPage = () => {
  return (
    <PlaceholderPage
      actions={
        <>
          <Link to={routePaths.programs}>교육과정 보기</Link>
          <Link to={routePaths.contact}>후기 관련 문의</Link>
        </>
      }
      description='수강생 후기와 교육 경험을 과정별로 모아 볼 수 있도록 준비 중입니다.'
      layout='plain'
      sections={[
        {
          title: '이 페이지에서 보게 될 내용',
          items: ['과정별 후기 모아보기', '수강 전 참고하기 좋은 후기 확인', '최신 후기 바로 보기'],
        },
        {
          title: '먼저 보고 싶다면',
          items: ['현재는 교육과정 상세페이지와 공지, 문의 경로를 먼저 확인해 주세요.'],
        },
      ]}
      title='교육후기'
    />
  );
};

export default ReviewsPage;
