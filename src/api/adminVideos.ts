import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type {
  AdminLectureVideoAssignmentResponse,
  AdminVideoEncodingStartResponse,
  AdminVideoProgramSummary,
  AdminVideoSectionResponse,
  AdminVideoStatusResponse,
  AdminVideoUploadCompleteRequest,
  AdminVideoUploadSessionRequest,
  AdminVideoUploadSessionResponse,
} from '@/types/adminVideo';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

interface PageResponse<TItem> {
  content: TItem[];
}

interface RawAdminVideoProgramSummary {
  categoryName: string;
  id: number;
  programType: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  title: string;
}

interface RawAdminLectureVideoAssignmentResponse {
  description: string | null;
  durationSeconds: number | null;
  id: number;
  preview: boolean;
  published: boolean;
  sectionId: number;
  sortOrder: number;
  title: string;
  videoId: number | null;
}

interface RawAdminVideoSectionResponse {
  description: string | null;
  id: number;
  lectures: RawAdminLectureVideoAssignmentResponse[];
  sortOrder: number;
  title: string;
}

export const fetchAdminVideoPrograms = async (): Promise<AdminVideoProgramSummary[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<PageResponse<RawAdminVideoProgramSummary>>>(
      '/api/v1/admin/programs',
      {
        params: {
          page: 0,
          size: 200,
          sort: 'id,desc',
        },
      },
    );
    return unwrapApiEnvelope(response.data).content.map((program) => ({
      ...program,
      id: String(program.id),
    }));
  } catch (error: unknown) {
    throw toApiError(error, '과정 목록을 불러오지 못했습니다.');
  }
};

export const fetchAdminProgramLectures = async (
  programId: string,
): Promise<AdminVideoSectionResponse[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<RawAdminVideoSectionResponse[]>>(
      `/api/v1/admin/programs/${encodeURIComponent(programId)}/sections`,
    );
    return unwrapApiEnvelope(response.data).map((section) => ({
      ...section,
      id: String(section.id),
      lectures: section.lectures.map((lecture) => ({
        ...lecture,
        id: String(lecture.id),
        sectionId: String(lecture.sectionId),
      })),
    }));
  } catch (error: unknown) {
    throw toApiError(error, '강의 목록을 불러오지 못했습니다.');
  }
};

export const createAdminVideoUploadSession = async (
  payload: AdminVideoUploadSessionRequest,
): Promise<AdminVideoUploadSessionResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminVideoUploadSessionResponse>>(
      '/api/v1/admin/videos/upload-sessions',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '영상 업로드 세션을 생성하지 못했습니다.');
  }
};

export const completeAdminVideoUpload = async (
  videoId: number,
  payload: AdminVideoUploadCompleteRequest,
): Promise<void> => {
  try {
    await axiosInstance.post(`/api/v1/admin/videos/${String(videoId)}/uploads/complete`, payload);
  } catch (error: unknown) {
    throw toApiError(error, '영상 업로드 완료를 확정하지 못했습니다.');
  }
};

export const startAdminVideoEncoding = async (
  videoId: number,
): Promise<AdminVideoEncodingStartResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminVideoEncodingStartResponse>>(
      `/api/v1/admin/videos/${String(videoId)}/encoding/start`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '영상 처리를 시작하지 못했습니다.');
  }
};

export const fetchAdminVideoStatus = async (videoId: number): Promise<AdminVideoStatusResponse> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminVideoStatusResponse>>(
      `/api/v1/admin/videos/${String(videoId)}/status`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '영상 상태를 조회하지 못했습니다.');
  }
};

export const assignAdminLectureVideo = async (
  lectureId: string,
  videoId: number,
): Promise<AdminLectureVideoAssignmentResponse> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<RawAdminLectureVideoAssignmentResponse>>(
      `/api/v1/admin/lectures/${encodeURIComponent(lectureId)}/video`,
      null,
      {
        params: { videoId },
      },
    );
    const data = unwrapApiEnvelope(response.data);
    return {
      ...data,
      id: String(data.id),
      sectionId: String(data.sectionId),
    };
  } catch (error: unknown) {
    throw toApiError(error, '강의에 영상을 연결하지 못했습니다.');
  }
};
