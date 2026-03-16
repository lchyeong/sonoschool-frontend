import { Outlet } from 'react-router-dom';

import styles from './AdminLayout.module.scss';

const AdminLayout = () => {
  return (
    <div className={styles['layout']}>
      <main className={styles['main']}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
