import styles from './AdminConsolePage.module.scss';
import { sectionContent, type AdminConsoleSection } from './adminConsolePageShared';
import { AdminDeferredSection, AdminPaymentsSection } from './AdminConsoleSectionViews';
import AdminEnrollmentsSection from './AdminEnrollmentsSection';
import AdminNoticesSection from './AdminNoticesSection';
import AdminPopupsSection from './AdminPopupsSection';
import AdminPracticumSection from './AdminPracticumSection';
import AdminProblemAreasSection from './AdminProblemAreasSection';
import AdminProgramListSection from './AdminProgramListSection';
import AdminProgramMenuSection from './AdminProgramMenuSection';
import AdminProgramReservationsSection from './AdminProgramReservationsSection';
import AdminQnaSection from './AdminQnaSection';
import AdminResourcesSection from './AdminResourcesSection';

interface AdminConsolePageProps {
  section: AdminConsoleSection;
}

const AdminConsolePage = ({ section }: AdminConsolePageProps) => {
  const sectionMeta = sectionContent[section];
  const renderPageHeader = section !== 'programs';

  return (
    <div className={styles['page']}>
      {renderPageHeader ? (
        <header className={styles['pageHeader']}>
          <h1 className={styles['pageTitle']}>{sectionMeta.title}</h1>
        </header>
      ) : null}
      {section === 'notices' ? <AdminNoticesSection /> : null}
      {section === 'popups' ? <AdminPopupsSection /> : null}
      {section === 'qna' ? <AdminQnaSection /> : null}
      {section === 'resources' ? <AdminResourcesSection /> : null}
      {section === 'enrollments' ? <AdminEnrollmentsSection /> : null}
      {section === 'practicum' ? <AdminPracticumSection /> : null}
      {section === 'programReservations' ? <AdminProgramReservationsSection /> : null}
      {section === 'reviews' ? <AdminDeferredSection section={section} /> : null}
      {section === 'programMenus' ? <AdminProgramMenuSection /> : null}
      {section === 'problemAreas' ? <AdminProblemAreasSection /> : null}
      {section === 'programs' ? <AdminProgramListSection /> : null}
      {section === 'payments' ? <AdminPaymentsSection /> : null}
    </div>
  );
};

export default AdminConsolePage;
