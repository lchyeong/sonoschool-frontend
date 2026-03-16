import { env } from '@/config/env';
import { useAdminConsoleQuery } from '@/query/useAdminConsoleQuery';

import styles from './AdminConsolePage.module.scss';
import { type AdminConsoleSection } from './adminConsolePageShared';
import {
  AdminConsolePageHeader,
  AdminDashboardSection,
  AdminNoticesSection,
  AdminQnaSection,
  AdminResourcesSection,
  AdminReviewsSection,
  AdminSalesSection,
} from './AdminConsoleSectionViews';
import AdminProgramListSection from './AdminProgramListSection';
import AdminProgramMenuSection from './AdminProgramMenuSection';
import { useAdminConsolePageActions } from './useAdminConsolePageActions';

interface AdminConsolePageProps {
  section: AdminConsoleSection;
}

const AdminConsolePage = ({ section }: AdminConsolePageProps) => {
  const actions = useAdminConsolePageActions();
  const { data, isError, isPending } = useAdminConsoleQuery(env.siteKey);

  if (isPending) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>관리자 데이터를 불러오는 중입니다.</h1>
        <p className={styles['stateDescription']}>
          공지사항, 문의, 자료실, 강의 판매 현황을 순서대로 준비하고 있습니다.
        </p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>관리자 콘솔을 불러오지 못했습니다.</h1>
        <p className={styles['stateDescription']}>
          MSW 핸들러와 관리자 API 응답 구조를 확인한 뒤 다시 시도해 주세요.
        </p>
      </section>
    );
  }

  if (section === 'dashboard') {
    return (
      <div className={styles['page']}>
        <AdminDashboardSection data={data} />
      </div>
    );
  }

  return (
    <div className={styles['page']}>
      <AdminConsolePageHeader section={section} />

      {section === 'notices' ? <AdminNoticesSection actions={actions} data={data} /> : null}
      {section === 'qna' ? <AdminQnaSection actions={actions} data={data} /> : null}
      {section === 'resources' ? <AdminResourcesSection actions={actions} data={data} /> : null}
      {section === 'reviews' ? <AdminReviewsSection actions={actions} data={data} /> : null}
      {section === 'programMenus' ? (
        <AdminProgramMenuSection programCollectionOptions={data.programCollectionOptions} />
      ) : null}
      {section === 'programs' ? <AdminProgramListSection /> : null}
      {section === 'sales' ? <AdminSalesSection data={data} /> : null}
    </div>
  );
};

export default AdminConsolePage;
