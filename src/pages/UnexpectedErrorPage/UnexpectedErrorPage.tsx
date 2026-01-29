import type { MouseEventHandler } from 'react';

import { Link } from 'react-router-dom';

import { routePaths } from '@/routes/routePaths';

interface UnexpectedErrorPageProps {
  error: Error;
  onReset: VoidFunction;
}

const UnexpectedErrorPage = ({ error, onReset }: UnexpectedErrorPageProps) => {
  const handleReload: MouseEventHandler<HTMLButtonElement> = () => {
    window.location.reload();
  };

  return (
    <div>
      <h1>예상치 못한 오류가 발생했습니다.</h1>
      <p>{__DEV__ ? error.message : '잠시 후 다시 시도해주세요.'}</p>
      <div>
        <button onClick={onReset} type='button'>
          다시 시도
        </button>
        <button onClick={handleReload} type='button'>
          새로고침
        </button>
        <Link to={routePaths.home}>홈으로 이동</Link>
      </div>
      {__DEV__ && error.stack ? (
        <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{error.stack}</pre>
      ) : null}
    </div>
  );
};

export default UnexpectedErrorPage;
