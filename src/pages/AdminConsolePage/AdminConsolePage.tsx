import styles from './AdminConsolePage.module.scss';
import { type AdminConsoleSection } from './adminConsolePageShared';
import {
  AdminConsolePageHeader,
  AdminDashboardSection,
  AdminDeferredSection,
  AdminPaymentsSection,
} from './AdminConsoleSectionViews';
import AdminCouponsSection from './AdminCouponsSection';
import AdminEnrollmentsSection from './AdminEnrollmentsSection';
import AdminNoticesSection from './AdminNoticesSection';
import AdminPopupsSection from './AdminPopupsSection';
import AdminPracticumSection from './AdminPracticumSection';
import AdminProgramListSection from './AdminProgramListSection';
import AdminProgramMenuSection from './AdminProgramMenuSection';
import AdminQnaSection from './AdminQnaSection';
import AdminResourcesSection from './AdminResourcesSection';
import AdminTagsSection from './AdminTagsSection';

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
      {section === 'popups' ? <AdminPopupsSection /> : null}
      {section === 'qna' ? <AdminQnaSection /> : null}
      {section === 'resources' ? <AdminResourcesSection /> : null}
      {section === 'enrollments' ? <AdminEnrollmentsSection /> : null}
      {section === 'practicum' ? <AdminPracticumSection /> : null}
      {section === 'reviews' ? <AdminDeferredSection section={section} /> : null}
      {section === 'programMenus' ? <AdminProgramMenuSection /> : null}
      {section === 'programs' ? <AdminProgramListSection /> : null}
      {section === 'coupons' ? <AdminCouponsSection /> : null}
      {section === 'tags' ? <AdminTagsSection /> : null}
      {section === 'payments' ? <AdminPaymentsSection /> : null}
    </div>
  );
};

export default AdminConsolePage;
