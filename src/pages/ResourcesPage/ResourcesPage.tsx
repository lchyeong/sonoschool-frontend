import { Link } from 'react-router-dom';

import PlaceholderPage from '@/components/layout/PlaceholderPage/PlaceholderPage';
import { routePaths } from '@/routes/routeRegistry';

const ResourcesPage = () => {
  return (
    <PlaceholderPage
      actions={
        <>
          <Link to={routePaths.programs}>교육과정 보기</Link>
          <Link to={routePaths.contact}>자료 문의</Link>
        </>
      }
      description='강의 자료와 안내 문서를 한곳에서 확인할 수 있도록 준비 중입니다.'
      layout='plain'
      sections={[
        {
          title: '이 페이지에서 보게 될 내용',
          items: ['강의별 자료 다운로드', '수업 전 안내 문서 확인', '필수 준비 자료 모아보기'],
        },
        {
          title: '자료가 급하게 필요하면',
          items: ['현재는 문의를 통해 필요한 자료 여부를 먼저 확인해 주세요.'],
        },
      ]}
      title='자료실'
    />
  );
};

export default ResourcesPage;
