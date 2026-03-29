export interface AdminUserSearchItem {
  active: boolean;
  displayName: string;
  email: string;
  id: number;
  loginId: string;
  name: string;
  nickname: string | null;
}

export interface AdminUserManagementItem extends AdminUserSearchItem {
  activeEnrollmentCount: number;
  joinedAt: string | null;
  phoneNumber: string;
  upcomingPracticumCount: number;
}
