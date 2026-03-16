import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';

import { routePaths } from '@/routes/routeRegistry';

const RouteErrorPage = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>오류가 발생했습니다.</h1>
        <p>
          {error.status} {error.statusText}
        </p>
        <Link to={routePaths.home}>홈으로 이동</Link>
      </div>
    );
  }

  const message = error instanceof Error ? error.message : 'Unknown error';

  return (
    <div>
      <h1>오류가 발생했습니다.</h1>
      <p>{message}</p>
      <Link to={routePaths.home}>홈으로 이동</Link>
    </div>
  );
};

export default RouteErrorPage;
