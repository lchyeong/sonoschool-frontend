import styles from './AdminConsolePage.module.scss';
import AdminNoticesSection from './AdminNoticesSection';
import AdminQnaSection from './AdminQnaSection';
import { type AdminConsoleSection } from './adminConsolePageShared';
import {
  AdminConsolePageHeader,
  AdminDashboardSection,
  AdminDeferredSection,
  AdminPaymentsSection,
} from './AdminConsoleSectionViews';
import AdminProgramListSection from './AdminProgramListSection';
import AdminProgramMenuSection from './AdminProgramMenuSection';

interface AdminConsolePageProps {
  section: AdminConsoleSection;
}

const AdminConsolePage = ({ section }: AdminConsolePageProps) => {
  if (section === 'dashboard') {
    return (
      <div className={styles['page']}>
        <AdminDashboardSection />
      </div>
    );
  }

  return (
    <div className={styles['page']}>
      {section !== 'programs' ? <AdminConsolePageHeader section={section} /> : null}

      {section === 'notices' ? <AdminNoticesSection /> : null}
      {section === 'qna' ? <AdminQnaSection /> : null}
      {section === 'resources' ? <AdminDeferredSection section={section} /> : null}
      {section === 'reviews' ? <AdminDeferredSection section={section} /> : null}
      {section === 'programMenus' ? <AdminProgramMenuSection /> : null}
      {section === 'programs' ? <AdminProgramListSection /> : null}
      {section === 'payments' ? <AdminPaymentsSection /> : null}
    </div>
  );
};

export default AdminConsolePage;
