import { Link } from 'react-router-dom';

import { routePaths } from '@/routes/routePaths';

const NotFoundPage = () => {
  return (
    <div>
      <h1>404</h1>
      <p>요청하신 페이지를 찾을 수 없습니다.</p>
      <Link to={routePaths.home}>홈으로 이동</Link>
    </div>
  );
};

export default NotFoundPage;
