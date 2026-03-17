import { Link } from 'react-router-dom';

import PlaceholderPage from '@/components/layout/PlaceholderPage/PlaceholderPage';
import { routePaths } from '@/routes/routeRegistry';

const QnaPage = () => {
  return (
    <PlaceholderPage
      actions={
        <>
          <Link to={routePaths.contact}>문의 남기기</Link>
          <Link to={routePaths.programs}>교육과정 보기</Link>
        </>
      }
      description='수강 전 자주 묻는 질문과 문의 내용을 한곳에서 확인할 수 있도록 준비 중입니다.'
      layout='plain'
      sections={[
        {
          title: '이 페이지에서 보게 될 내용',
          items: ['자주 묻는 질문 확인', '문의 답변 모아보기', '수강 전 준비사항 확인'],
        },
        {
          title: '빠른 문의가 필요하면',
          items: ['현재는 문의 페이지를 통해 바로 연락을 남겨 주세요.'],
        },
      ]}
      title='자주 묻는 질문과 문의'
    />
  );
};

export default QnaPage;
