import type {
  AdminProgramReservationInquiry,
  ProgramReservationInquiryPayload,
  ProgramReservationInquiryStatus,
} from '@/api/programReservationInquiries';

let nextInquiryId = 9104;

const programReservationInquiries: AdminProgramReservationInquiry[] = [
  {
    applicantName: '이찬형',
    id: 9103,
    phoneNumber: '01026051835',
    programId: 2001,
    programTitle: '복부 Basic 스캔 6주',
    sourcePath: '/programs/general-course/abdomen/abdomen-basic-6-weeks/2026-mar-apr',
    specialty: '내과',
    status: 'NEW',
    submittedAt: '2026-05-18T06:20:00.000Z',
  },
  {
    applicantName: '김소노',
    id: 9102,
    phoneNumber: '01011112222',
    programId: 2004,
    programTitle: '산과 1삼분기 스캔 4주',
    sourcePath: '/programs/general-course/women-ultrasound/first-trimester-scan-4-weeks/detail',
    specialty: '산부인과',
    status: 'CONTACTED',
    submittedAt: '2026-05-17T03:10:00.000Z',
  },
  {
    applicantName: '박문의',
    id: 9101,
    phoneNumber: '01033334444',
    programId: 2011,
    programTitle: 'POCUS 응급 핸즈온',
    sourcePath: '/programs/general-course/pocus/emergency-hands-on/detail',
    specialty: null,
    status: 'CLOSED',
    submittedAt: '2026-05-16T01:45:00.000Z',
  },
];

export const getMockProgramReservationInquiries = (): AdminProgramReservationInquiry[] => {
  return [...programReservationInquiries].sort(
    (left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
  );
};

export const createMockProgramReservationInquiry = (
  payload: ProgramReservationInquiryPayload,
): AdminProgramReservationInquiry => {
  const inquiry: AdminProgramReservationInquiry = {
    applicantName: payload.applicantName,
    id: nextInquiryId,
    phoneNumber: payload.phoneNumber,
    programId: payload.programId,
    programTitle: payload.programTitle,
    sourcePath: payload.sourcePath,
    specialty: payload.specialty?.trim() || null,
    status: 'NEW',
    submittedAt: new Date().toISOString(),
  };

  nextInquiryId += 1;
  programReservationInquiries.unshift(inquiry);

  return inquiry;
};

export const updateMockProgramReservationInquiryStatus = (
  inquiryId: number,
  status: ProgramReservationInquiryStatus,
): AdminProgramReservationInquiry | null => {
  const inquiry = programReservationInquiries.find((item) => item.id === inquiryId);

  if (!inquiry) {
    return null;
  }

  inquiry.status = status;
  return inquiry;
};
