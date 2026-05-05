import ProblemReportModal from '@/components/problemReport/ProblemReportModal';
import type { StudentProblemAttemptReport } from '@/types/studentProblems';

interface AdminUserProblemReportModalProps {
  onClose: () => void;
  report: StudentProblemAttemptReport | null;
}

const AdminUserProblemReportModal = ({ onClose, report }: AdminUserProblemReportModalProps) => {
  return <ProblemReportModal onClose={onClose} report={report} />;
};

export default AdminUserProblemReportModal;
