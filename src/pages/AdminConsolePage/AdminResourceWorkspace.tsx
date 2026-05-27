import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { createAdminResourceUploadTarget, uploadAdminResourceFile } from '@/api/adminResourceMedia';
import {
  createAdminResource,
  deleteAdminResource,
  updateAdminResource,
} from '@/api/adminResources';
import AdminFileDropZone from '@/components/admin/AdminFileDropZone';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import { adminResourcesQueryKey, useAdminResourcesQuery } from '@/query/useAdminResourcesQuery';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminResourceItem, AdminResourceUpsertPayload } from '@/types/adminResources';

import styles from './AdminConsolePage.module.scss';
import {
  RESOURCE_DOCUMENT_ACCEPT,
  RESOURCE_DOCUMENT_POLICY_HINT,
  validateResourceDocumentPolicy,
} from './resourceDocumentPolicy';

interface AdminResourceWorkspaceProps {
  mode: 'create' | 'edit';
}

interface AdminResourceWorkspaceFormProps extends AdminResourceWorkspaceProps {
  editingResource: AdminResourceItem | null;
  initialFormState: ResourceFormState;
  resolvedResourceId: number | null;
}

interface ResourceFormState {
  description: string;
  fileName: string;
  fileSize: number;
  mediaAssetId: number | null;
  mimeType: string;
  originalFileName: string;
  sortOrder: string;
  title: string;
}

const EMPTY_FORM: ResourceFormState = {
  description: '',
  fileName: '',
  fileSize: 0,
  mediaAssetId: null,
  mimeType: '',
  originalFileName: '',
  sortOrder: '0',
  title: '',
};

const createFormState = (resource?: AdminResourceItem | null): ResourceFormState => {
  if (!resource) {
    return EMPTY_FORM;
  }

  return {
    description: resource.description ?? '',
    fileName: resource.fileName,
    fileSize: resource.fileSize,
    mediaAssetId: null,
    mimeType: resource.mimeType ?? '',
    originalFileName: resource.fileName,
    sortOrder: String(resource.sortOrder),
    title: resource.title,
  };
};

const formatFileSizeInMb = (bytes: number): string => {
  if (bytes <= 0) {
    return '-';
  }

  return `${Math.max(0.01, bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getTitleFromFileName = (fileName: string): string => {
  return fileName.replace(/\.[^.]+$/, '');
};

const validateForm = (formState: ResourceFormState): string | null => {
  if (!formState.title.trim()) {
    return '자료 게시글 제목을 입력해 주세요.';
  }

  if (!formState.fileName.trim()) {
    return '다운로드 파일명을 입력해 주세요.';
  }

  if (formState.fileSize < 1) {
    return '자료 파일을 업로드해 주세요.';
  }

  if (!formState.sortOrder.trim() || Number.isNaN(Number(formState.sortOrder))) {
    return '정렬 순서를 숫자로 입력해 주세요.';
  }

  return validateResourceDocumentPolicy({
    fileName: formState.fileName,
    fileSize: formState.fileSize,
    mimeType: formState.mimeType,
  });
};

const AdminResourceWorkspaceForm = ({
  editingResource,
  initialFormState,
  mode,
  resolvedResourceId,
}: AdminResourceWorkspaceFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const [formState, setFormState] = useState<ResourceFormState>(initialFormState);
  const [selectedResourceFile, setSelectedResourceFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const hasUploadedFilePendingSave =
    formState.mediaAssetId !== null && formState.mediaAssetId !== initialFormState.mediaAssetId;

  useEffect(() => {
    const shouldWarnBeforeUnload = selectedResourceFile !== null || hasUploadedFilePendingSave;
    if (!shouldWarnBeforeUnload) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUploadedFilePendingSave, selectedResourceFile]);

  const refreshResources = async () => {
    await queryClient.invalidateQueries({ queryKey: adminResourcesQueryKey() });
  };

  const buildPayload = (mediaAssetId: number | null): AdminResourceUpsertPayload => {
    return {
      description: formState.description.trim() || null,
      fileName: formState.fileName.trim(),
      lectureId: null,
      mediaAssetId,
      programId: null,
      scope: 'GLOBAL',
      sortOrder: Number(formState.sortOrder),
      title: formState.title.trim(),
      visibility: 'PUBLIC',
    };
  };

  const handleResourceFileChange = (file: File | null) => {
    if (!file) {
      return;
    }

    const validationMessage = validateResourceDocumentPolicy({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });

    if (validationMessage) {
      showToast({ message: validationMessage, variant: 'error' });
      return;
    }

    setSelectedResourceFile(file);
    setFormState((current) => {
      const previousGeneratedTitle = current.originalFileName
        ? getTitleFromFileName(current.originalFileName)
        : '';
      const shouldReplaceFileName =
        !current.fileName.trim() || current.fileName === current.originalFileName;
      const shouldReplaceTitle =
        !current.title.trim() ||
        (previousGeneratedTitle && current.title === previousGeneratedTitle);

      return {
        ...current,
        fileName: shouldReplaceFileName ? file.name : current.fileName,
        fileSize: file.size,
        mediaAssetId: null,
        mimeType: file.type || 'application/octet-stream',
        originalFileName: file.name,
        title: shouldReplaceTitle ? getTitleFromFileName(file.name) : current.title,
      };
    });
  };

  const clearSelectedResourceFile = () => {
    setSelectedResourceFile(null);
    setFormState((current) => {
      const generatedTitle = current.originalFileName
        ? getTitleFromFileName(current.originalFileName)
        : '';
      const nextTitle = current.title === generatedTitle ? initialFormState.title : current.title;

      return {
        ...current,
        fileName: initialFormState.fileName,
        fileSize: initialFormState.fileSize,
        mediaAssetId: initialFormState.mediaAssetId,
        mimeType: initialFormState.mimeType,
        originalFileName: initialFormState.originalFileName,
        title: nextTitle,
      };
    });
  };

  const uploadSelectedResourceFile = async () => {
    if (!selectedResourceFile) {
      showToast({
        message: '업로드할 자료 파일을 선택해 주세요.',
        variant: 'error',
      });
      return;
    }

    setIsUploading(true);
    try {
      const uploadTarget = await createAdminResourceUploadTarget({
        contentType: selectedResourceFile.type || 'application/octet-stream',
        fileSize: selectedResourceFile.size,
        filename: selectedResourceFile.name,
      });
      await uploadAdminResourceFile(uploadTarget.uploadUrl, selectedResourceFile);
      setFormState((current) => ({
        ...current,
        mediaAssetId: uploadTarget.assetId,
      }));
      setSelectedResourceFile(null);
      showToast({ message: '자료 파일을 업로드했습니다.', variant: 'success' });
    } catch (error: unknown) {
      showToast({
        message: error instanceof Error ? error.message : '자료 파일 업로드에 실패했습니다.',
        variant: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: (payload: AdminResourceUpsertPayload) => createAdminResource(payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '자료를 등록하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshResources();
      showToast({
        message: '자료를 등록했습니다.',
        variant: 'success',
      });
      void navigate(routePaths.adminResources);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      payload,
      targetResourceId,
    }: {
      payload: AdminResourceUpsertPayload;
      targetResourceId: number;
    }) => updateAdminResource(targetResourceId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '자료를 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshResources();
      showToast({
        message: '자료를 수정했습니다.',
        variant: 'success',
      });
      void navigate(routePaths.adminResources);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (targetResourceId: number) => deleteAdminResource(targetResourceId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '자료를 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshResources();
      showToast({
        message: '자료를 삭제했습니다.',
        variant: 'success',
      });
      void navigate(routePaths.adminResources);
    },
  });

  const handleSubmit = () => {
    const validationMessage = validateForm(formState);

    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return;
    }

    if (selectedResourceFile) {
      showToast({
        message: '선택한 자료 파일은 업로드 시작을 먼저 눌러 주세요.',
        variant: 'error',
      });
      return;
    }

    if (mode === 'create' && !formState.mediaAssetId) {
      showToast({
        message: '자료 파일을 선택한 뒤 업로드 시작을 눌러 주세요.',
        variant: 'error',
      });
      return;
    }

    const payload = buildPayload(formState.mediaAssetId);

    if (mode === 'create') {
      createMutation.mutate(payload);
      return;
    }

    updateMutation.mutate({
      payload,
      targetResourceId: resolvedResourceId as number,
    });
  };

  const isSubmitting = isUploading || createMutation.isPending || updateMutation.isPending;

  return (
    <div className={styles['page']}>
      <header className={styles['pageHeader']}>
        <h1 className={styles['pageTitle']}>{mode === 'create' ? '새 자료 등록' : '자료 수정'}</h1>
      </header>

      <section className={styles['editorShell']}>
        <div className={styles['editorToolbar']}>
          <div className={styles['editorHeaderCompact']}>
            <p className={styles['metaText']}>
              자료실에서는 전체 공개 자료만 등록합니다. 프로그램 자료는 프로그램 등록/수정
              화면에서만 관리합니다.
            </p>
          </div>

          <div className={styles['editorToolbarActions']}>
            <Button
              onClick={() => {
                void navigate(routePaths.adminResources);
              }}
              type='button'
              variant='secondary'
            >
              목록으로
            </Button>
            {mode === 'edit' && editingResource ? (
              <Button
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (!window.confirm('자료를 삭제하면 되돌릴 수 없습니다. 계속하시겠습니까?')) {
                    return;
                  }

                  deleteMutation.mutate(editingResource.id);
                }}
                type='button'
                variant='danger'
              >
                삭제
              </Button>
            ) : null}
          </div>
        </div>

        <div className={styles['form']}>
          <div className={styles['metaNotice']}>
            <p className={styles['metaNoticeLabel']}>전체 공개 자료실 전용</p>
            <p className={styles['metaNoticeText']}>
              이 화면에서 저장되는 자료는 `GLOBAL / PUBLIC`으로 고정됩니다.
            </p>
          </div>

          <TextField
            label='자료 게시글 제목'
            name='resourceTitle'
            onChange={(event) => {
              setFormState((current) => ({ ...current, title: event.target.value }));
            }}
            value={formState.title}
          />

          <TextAreaField
            label='설명'
            name='resourceDescription'
            onChange={(event) => {
              setFormState((current) => ({ ...current, description: event.target.value }));
            }}
            value={formState.description}
          />

          <section
            className={styles['noticeAttachmentPanel']}
            aria-labelledby='resource-file-label'
          >
            <div className={styles['noticeAttachmentHeader']}>
              <div>
                <h3 className={styles['noticeAttachmentTitle']} id='resource-file-label'>
                  자료 파일
                </h3>
                <p className={styles['noticeAttachmentHint']}>
                  선택한 파일은 업로드 시작을 누를 때 업로드됩니다.
                </p>
              </div>
            </div>

            <AdminFileDropZone
              actions={
                selectedResourceFile ? (
                  <>
                    <Button
                      disabled={isUploading}
                      onClick={() => {
                        void uploadSelectedResourceFile();
                      }}
                      type='button'
                      variant='secondary'
                    >
                      업로드 시작
                    </Button>
                    <Button
                      disabled={isUploading}
                      onClick={clearSelectedResourceFile}
                      type='button'
                      variant='secondary'
                    >
                      선택 취소
                    </Button>
                  </>
                ) : null
              }
              accept={RESOURCE_DOCUMENT_ACCEPT}
              buttonLabel={
                isUploading
                  ? '업로드 중...'
                  : formState.originalFileName
                    ? '파일 변경'
                    : '파일 선택'
              }
              disabled={isSubmitting}
              hint='선택한 파일은 업로드 시작을 누를 때 업로드됩니다.'
              label='자료 파일 업로드'
              onFilesSelected={(files) => {
                handleResourceFileChange(files[0] ?? null);
              }}
              onClear={selectedResourceFile ? clearSelectedResourceFile : undefined}
              selectedLabel={formState.originalFileName || undefined}
              selectedMeta={formState.fileSize > 0 ? formatFileSizeInMb(formState.fileSize) : null}
            />
          </section>

          <div className={styles['compactFieldRow']}>
            <TextField
              label='다운로드 파일명'
              name='resourceFileName'
              onChange={(event) => {
                setFormState((current) => ({ ...current, fileName: event.target.value }));
              }}
              value={formState.fileName}
            />
            <TextField
              label='정렬 순서'
              name='resourceSortOrder'
              onChange={(event) => {
                setFormState((current) => ({ ...current, sortOrder: event.target.value }));
              }}
              value={formState.sortOrder}
            />
          </div>

          <p className={styles['helperText']}>{RESOURCE_DOCUMENT_POLICY_HINT}</p>

          <div className={styles['actionRow']}>
            <Button disabled={isSubmitting} onClick={handleSubmit} type='button'>
              {isSubmitting ? '저장 중...' : mode === 'create' ? '자료 등록' : '자료 저장'}
            </Button>
            <Button
              onClick={() => {
                setSelectedResourceFile(null);

                if (mode === 'edit' && editingResource) {
                  setFormState(createFormState(editingResource));
                  return;
                }

                setFormState(EMPTY_FORM);
              }}
              type='button'
              variant='secondary'
            >
              {mode === 'create' ? '초기화' : '변경 취소'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

const AdminResourceWorkspace = ({ mode }: AdminResourceWorkspaceProps) => {
  const params = useParams();
  const resourcesQuery = useAdminResourcesQuery(mode === 'edit');
  const resourceId = Number(params['resourceId']);
  const resolvedResourceId = Number.isInteger(resourceId) && resourceId > 0 ? resourceId : null;
  const editingResource = useMemo(() => {
    if (mode !== 'edit') {
      return null;
    }

    return (
      (resourcesQuery.data ?? []).find(
        (resource) => resource.id === resolvedResourceId && resource.scope === 'GLOBAL',
      ) ?? null
    );
  }, [mode, resolvedResourceId, resourcesQuery.data]);

  if (mode === 'edit' && resolvedResourceId === null) {
    return (
      <section className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>자료 경로가 올바르지 않습니다.</h2>
        <p className={styles['stateDescription']}>자료 목록으로 돌아가 다시 선택해 주세요.</p>
      </section>
    );
  }

  if (mode === 'edit' && resourcesQuery.isPending) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>자료 정보를 불러오는 중입니다.</h2>
        <p className={styles['stateDescription']}>편집할 자료 데이터를 준비하고 있습니다.</p>
      </section>
    );
  }

  if (mode === 'edit' && (resourcesQuery.isError || !editingResource)) {
    return (
      <section className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>자료 정보를 찾지 못했습니다.</h2>
        <p className={styles['stateDescription']}>
          {resourcesQuery.error instanceof Error
            ? resourcesQuery.error.message
            : '프로그램 내부 자료는 프로그램 등록/수정 화면에서 관리해 주세요.'}
        </p>
      </section>
    );
  }

  return (
    <AdminResourceWorkspaceForm
      editingResource={editingResource}
      initialFormState={createFormState(editingResource)}
      key={editingResource ? `resource-${String(editingResource.id)}` : 'resource-create'}
      mode={mode}
      resolvedResourceId={resolvedResourceId}
    />
  );
};

export default AdminResourceWorkspace;
