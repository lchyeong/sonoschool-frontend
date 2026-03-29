import { useEffect, useMemo, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import {
  assignAdminLectureVideo,
  completeAdminVideoUpload,
  createAdminVideoUploadSession,
  fetchAdminProgramLectures,
  fetchAdminVideoPrograms,
  fetchAdminVideoStatus,
  startAdminVideoEncoding,
} from '@/api/adminVideos';
import AdminDropdownField from '@/components/admin/AdminDropdownField/AdminDropdownField';
import Button from '@/components/ui/Button/Button';
import { useToastStore } from '@/stores/useToastStore';
import type {
  AdminVideoCompletedPart,
  AdminVideoLectureOption,
  AdminVideoProgramSummary,
  AdminVideoStatusResponse,
  AdminVideoUploadSessionResponse,
} from '@/types/adminVideo';

import styles from './AdminVideoUploadPage.module.scss';

const TARGET_PART_SIZE_BYTES = 8 * 1024 * 1024;

const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes || bytes <= 0) {
    return '-';
  }

  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${String(Math.max(1, Math.round(bytes / 1024)))} KB`;
};

const calculatePartCount = (fileSize: number): number => {
  return Math.max(1, Math.ceil(fileSize / TARGET_PART_SIZE_BYTES));
};

const formatVideoStatusLabel = (
  status: AdminVideoStatusResponse['status'] | null | undefined,
): string => {
  switch (status) {
    case 'UPLOADING':
      return '영상 파일 업로드 중';
    case 'UPLOADED':
      return '영상 등록 준비 중';
    case 'PROCESSING':
      return '영상 등록 중';
    case 'READY':
      return '강의 영상 등록 완료';
    case 'FAILED':
      return '강의 영상 등록 실패';
    default:
      return '대기';
  }
};

const stripETagQuotes = (value: string): string => {
  return value.replace(/^"+|"+$/g, '');
};

const uploadPart = async (uploadUrl: string, chunk: Blob, contentType: string): Promise<string> => {
  if (!/^https?:\/\//.test(uploadUrl)) {
    throw new Error('유효한 업로드 URL이 아닙니다. 업로드 세션을 다시 생성해 주세요.');
  }

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
    },
    body: chunk,
  });

  if (!response.ok) {
    throw new Error(`파트 업로드에 실패했습니다. (${String(response.status)})`);
  }

  const eTag = response.headers.get('etag') ?? response.headers.get('ETag');

  if (!eTag) {
    throw new Error(
      '업로드는 완료됐지만 ETag를 읽지 못했습니다. S3 CORS expose headers 설정을 확인해 주세요.',
    );
  }

  return stripETagQuotes(eTag);
};

const buildChunks = (
  file: File,
  session: AdminVideoUploadSessionResponse,
): Array<{ blob: Blob; partNumber: number; uploadUrl: string }> => {
  const chunkSize = Math.ceil(file.size / session.parts.length);

  return session.parts.map((part, index) => {
    const start = index * chunkSize;
    const end =
      index === session.parts.length - 1 ? file.size : Math.min(start + chunkSize, file.size);

    return {
      blob: file.slice(start, end),
      partNumber: part.partNumber,
      uploadUrl: part.uploadUrl,
    };
  });
};

const AdminVideoUploadPage = () => {
  const showToast = useToastStore((state) => state.showToast);
  const [searchParams] = useSearchParams();
  const [programs, setPrograms] = useState<AdminVideoProgramSummary[]>([]);
  const [lectureOptions, setLectureOptions] = useState<AdminVideoLectureOption[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [isLoadingLectures, setIsLoadingLectures] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState(0);
  const [uploadSession, setUploadSession] = useState<AdminVideoUploadSessionResponse | null>(null);
  const [videoStatus, setVideoStatus] = useState<AdminVideoStatusResponse | null>(null);
  const [uploadTargetLectureTitle, setUploadTargetLectureTitle] = useState<string | null>(null);
  const requestedProgramId = searchParams.get('programId');
  const requestedLectureId = searchParams.get('lectureId');

  const videoId = uploadSession?.videoId ?? null;
  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId) ?? null,
    [programs, selectedProgramId],
  );
  const selectedLecture = useMemo(
    () => lectureOptions.find((lecture) => lecture.id === selectedLectureId) ?? null,
    [lectureOptions, selectedLectureId],
  );

  useEffect(() => {
    const loadPrograms = async () => {
      setIsLoadingPrograms(true);

      try {
        const nextPrograms = await fetchAdminVideoPrograms();
        setPrograms(nextPrograms);
        setSelectedProgramId((current) => {
          if (current && nextPrograms.some((program) => program.id === current)) {
            return current;
          }

          if (
            requestedProgramId &&
            nextPrograms.some((program) => program.id === requestedProgramId)
          ) {
            return requestedProgramId;
          }

          return nextPrograms[0]?.id ?? null;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : '과정 목록을 불러오지 못했습니다.';
        showToast({
          message,
          variant: 'error',
        });
      } finally {
        setIsLoadingPrograms(false);
      }
    };

    void loadPrograms();
  }, [requestedProgramId, showToast]);

  useEffect(() => {
    if (!selectedProgramId) {
      setLectureOptions([]);
      setSelectedLectureId(null);
      return;
    }

    const loadLectures = async () => {
      setIsLoadingLectures(true);

      try {
        const sections = await fetchAdminProgramLectures(selectedProgramId);
        const nextLectureOptions = sections.flatMap((section) =>
          section.lectures.map((lecture) => ({
            id: lecture.id,
            sectionTitle: section.title,
            title: lecture.title,
            videoId: lecture.videoId,
          })),
        );

        setLectureOptions(nextLectureOptions);
        setSelectedLectureId((current) =>
          current && nextLectureOptions.some((lecture) => lecture.id === current)
            ? current
            : requestedLectureId &&
                nextLectureOptions.some((lecture) => lecture.id === requestedLectureId)
              ? requestedLectureId
              : (nextLectureOptions[0]?.id ?? null),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '커리큘럼 강의 목록을 불러오지 못했습니다.';
        showToast({
          message,
          variant: 'error',
        });
        setLectureOptions([]);
        setSelectedLectureId(null);
      } finally {
        setIsLoadingLectures(false);
      }
    };

    void loadLectures();
  }, [requestedLectureId, selectedProgramId, showToast]);

  const refreshStatus = async (targetVideoId: number) => {
    const nextStatus = await fetchAdminVideoStatus(targetVideoId);
    setVideoStatus(nextStatus);
    return nextStatus;
  };

  useEffect(() => {
    if (
      !videoId ||
      !selectedLectureId ||
      !selectedLecture ||
      videoStatus?.status !== 'PROCESSING'
    ) {
      return;
    }

    let isActive = true;

    const intervalId = window.setInterval(() => {
      void refreshStatus(videoId)
        .then(async (nextStatus) => {
          if (!isActive) {
            return;
          }

          if (nextStatus.status === 'READY') {
            window.clearInterval(intervalId);
            await assignAdminLectureVideo(selectedLectureId, videoId);
            showToast({
              message: `${selectedLecture.title} 강의 영상 등록을 완료했습니다.`,
              variant: 'success',
            });
            return;
          }

          if (nextStatus.status === 'FAILED') {
            window.clearInterval(intervalId);
            showToast({
              message: nextStatus.errorMessage ?? '영상 등록에 실패했습니다. 다시 시도해 주세요.',
              variant: 'error',
            });
          }
        })
        .catch(() => {
          if (!isActive) {
            return;
          }
          window.clearInterval(intervalId);
        });
    }, 5000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [selectedLecture, selectedLectureId, showToast, videoId, videoStatus?.status]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);
    setUploadProgressPercent(0);
    setUploadSession(null);
    setVideoStatus(null);
    setUploadTargetLectureTitle(null);
  };

  const handleUploadAndStart = async () => {
    if (!selectedLectureId || !selectedLecture) {
      showToast({
        message: '영상을 등록할 강의를 먼저 선택해 주세요.',
        variant: 'error',
      });
      return;
    }

    if (!selectedFile) {
      showToast({
        message: '업로드할 영상을 먼저 선택해 주세요.',
        variant: 'error',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgressPercent(0);
    setUploadTargetLectureTitle(selectedLecture.title);

    try {
      const session = await createAdminVideoUploadSession({
        contentType: selectedFile.type || 'video/mp4',
        fileSize: selectedFile.size,
        filename: selectedFile.name,
        partCount: calculatePartCount(selectedFile.size),
      });

      setUploadSession(session);
      const chunks = buildChunks(selectedFile, session);
      let uploadedBytes = 0;

      const completedParts: AdminVideoCompletedPart[] = [];

      for (const chunk of chunks) {
        const eTag = await uploadPart(
          chunk.uploadUrl,
          chunk.blob,
          selectedFile.type || 'application/octet-stream',
        );

        completedParts.push({
          eTag,
          partNumber: chunk.partNumber,
        });
        uploadedBytes += chunk.blob.size;
        setUploadProgressPercent(
          Math.min(100, Math.round((uploadedBytes / selectedFile.size) * 100)),
        );
      }

      await completeAdminVideoUpload(session.videoId, {
        parts: completedParts,
        uploadId: session.uploadId,
      });

      await startAdminVideoEncoding(session.videoId);
      const nextStatus = await refreshStatus(session.videoId);

      if (nextStatus.status === 'READY') {
        await assignAdminLectureVideo(selectedLectureId, session.videoId);
        showToast({
          message: `${selectedLecture.title} 강의 영상 등록을 완료했습니다.`,
          variant: 'success',
        });
        return;
      }

      if (nextStatus.status === 'FAILED') {
        throw new Error(nextStatus.errorMessage ?? '영상 등록에 실패했습니다. 다시 시도해 주세요.');
      }

      showToast({
        message: '영상 파일 업로드를 완료했습니다. 강의 영상 등록을 계속 진행합니다.',
        variant: 'success',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '영상 등록에 실패했습니다. 다시 시도해 주세요.';

      showToast({
        message,
        variant: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!videoId) {
      return;
    }

    try {
      const nextStatus = await refreshStatus(videoId);
      showToast({
        message: `현재 상태: ${formatVideoStatusLabel(nextStatus.status)}`,
        variant: 'info',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '영상 상태를 새로고침하지 못했습니다.';

      showToast({
        message,
        variant: 'error',
      });
    }
  };

  return (
    <section className={styles['page']}>
      <header className={styles['pageHeader']}>
        <p className={styles['eyebrow']}>Admin Video</p>
        <h1 className={styles['title']}>강의 영상 등록</h1>
        <p className={styles['description']}>
          강의를 선택하고 영상을 등록하면, 업로드와 처리 과정을 거쳐 해당 강의에 자동으로
          연결합니다.
        </p>
      </header>

      <div className={styles['layout']}>
        <section className={styles['panel']}>
          <h2 className={styles['panelTitle']}>1. 강의 선택</h2>

          <div className={styles['fieldGroup']}>
            <div className={styles['selectField']}>
              <AdminDropdownField
                label='과정 선택'
                disabled={isLoadingPrograms || !programs.length}
                onChange={(nextValue) => {
                  const normalizedValue = nextValue.trim();
                  setSelectedProgramId(normalizedValue || null);
                }}
                options={[
                  {
                    value: '',
                    label: isLoadingPrograms ? '과정 불러오는 중...' : '과정을 선택해 주세요',
                  },
                  ...programs.map((program) => ({
                    value: program.id,
                    label: `[${program.categoryName}] ${program.title}`,
                  })),
                ]}
                value={selectedProgramId ?? ''}
              />
              {!isLoadingPrograms && programs.length === 0 ? (
                <p className={styles['helperText']}>
                  현재 등록된 과정이 없습니다. 실데이터 기준으로 과정/강의 시드가 먼저 필요합니다.
                </p>
              ) : null}
            </div>

            <div className={styles['selectField']}>
              <AdminDropdownField
                label='강의 선택'
                disabled={!selectedProgramId || isLoadingLectures || !lectureOptions.length}
                onChange={(nextValue) => {
                  const normalizedValue = nextValue.trim();
                  setSelectedLectureId(normalizedValue || null);
                }}
                options={[
                  {
                    value: '',
                    label: !selectedProgramId
                      ? '먼저 과정을 선택해 주세요'
                      : isLoadingLectures
                        ? '강의 불러오는 중...'
                        : lectureOptions.length
                          ? '강의를 선택해 주세요'
                          : '등록된 강의가 없습니다',
                  },
                  ...lectureOptions.map((lecture) => ({
                    value: lecture.id,
                    label: `[${lecture.sectionTitle}] ${lecture.title}`,
                  })),
                ]}
                value={selectedLectureId ?? ''}
              />
              {selectedProgramId && !isLoadingLectures && lectureOptions.length === 0 ? (
                <p className={styles['helperText']}>
                  선택한 과정에 등록된 강의가 없습니다. 강의를 먼저 생성해야 영상 등록이 가능합니다.
                </p>
              ) : null}
            </div>
          </div>

          <div className={styles['metaGrid']}>
            <div className={styles['metaCard']}>
              <span className={styles['metaLabel']}>선택 과정</span>
              <strong className={styles['metaValue']}>{selectedProgram?.title ?? '-'}</strong>
            </div>
            <div className={styles['metaCard']}>
              <span className={styles['metaLabel']}>선택 강의</span>
              <strong className={styles['metaValue']}>{selectedLecture?.title ?? '-'}</strong>
            </div>
            <div className={styles['metaCard']}>
              <span className={styles['metaLabel']}>현재 강의 영상</span>
              <strong className={styles['metaValue']}>
                {selectedLecture?.videoId ? '연결됨' : '없음'}
              </strong>
            </div>
          </div>

          <h2 className={styles['panelTitle']}>2. 파일 선택 및 등록</h2>

          <label className={styles['uploadDropzone']} htmlFor='admin-video-file'>
            <input accept='video/*' id='admin-video-file' onChange={handleFileChange} type='file' />
            <strong className={styles['uploadDropzoneTitle']}>업로드할 영상 파일 선택</strong>
            <p className={styles['uploadDropzoneDescription']}>
              mp4 등 강의 영상을 선택하면 업로드 후 해당 강의에 자동 등록합니다.
            </p>
            <div className={styles['uploadFileMeta']}>
              <span>{selectedFile?.name ?? '선택된 파일 없음'}</span>
              <span>{selectedFile ? formatFileSize(selectedFile.size) : '-'}</span>
            </div>
          </label>

          <div className={styles['progressBlock']}>
            <div className={styles['progressHeader']}>
              <span className={styles['progressLabel']}>업로드 진행률</span>
              <strong className={styles['progressValue']}>{String(uploadProgressPercent)}%</strong>
            </div>
            <div aria-hidden='true' className={styles['progressTrack']}>
              <div
                className={styles['progressFill']}
                style={{ width: `${String(uploadProgressPercent)}%` }}
              />
            </div>
          </div>

          <div className={styles['actionRow']}>
            <Button
              disabled={!selectedFile || !selectedLectureId || isUploading}
              onClick={() => void handleUploadAndStart()}
            >
              {isUploading ? '등록 중...' : '강의 영상 등록'}
            </Button>
            <Button
              disabled={!videoId || isUploading}
              onClick={() => void handleRefreshStatus()}
              variant='secondary'
            >
              처리 상태 새로고침
            </Button>
          </div>
        </section>

        <section className={styles['panel']}>
          <h2 className={styles['panelTitle']}>3. 처리 상태</h2>

          <div className={styles['resultList']}>
            <div className={styles['resultItem']}>
              <span className={styles['resultLabel']}>대상 강의</span>
              <strong className={styles['resultValue']}>
                {uploadTargetLectureTitle ?? selectedLecture?.title ?? '-'}
              </strong>
            </div>
            <div className={styles['resultItem']}>
              <span className={styles['resultLabel']}>파일명</span>
              <strong className={styles['resultValue']}>
                {videoStatus?.originalFilename ?? selectedFile?.name ?? '-'}
              </strong>
            </div>
            <div className={styles['resultItem']}>
              <span className={styles['resultLabel']}>파일 크기</span>
              <strong className={styles['resultValue']}>
                {formatFileSize(videoStatus?.fileSize ?? selectedFile?.size)}
              </strong>
            </div>
            <div className={styles['resultItem']}>
              <span className={styles['resultLabel']}>현재 상태</span>
              <strong className={styles['statusValue']}>
                {formatVideoStatusLabel(videoStatus?.status)}
              </strong>
            </div>
            <div className={styles['resultItem']}>
              <span className={styles['resultLabel']}>길이</span>
              <strong className={styles['resultValue']}>
                {videoStatus?.durationSeconds ? `${String(videoStatus.durationSeconds)}초` : '-'}
              </strong>
            </div>
            <div className={styles['resultItem']}>
              <span className={styles['resultLabel']}>에러</span>
              <strong className={styles['resultValue']}>{videoStatus?.errorMessage ?? '-'}</strong>
            </div>
          </div>

          <div className={styles['noticeBox']}>
            <p>영상은 업로드 후 자동으로 등록 과정을 진행합니다.</p>
            <p>등록 완료가 되면 선택한 강의에 자동으로 연결됩니다.</p>
          </div>
        </section>
      </div>
    </section>
  );
};

export default AdminVideoUploadPage;
