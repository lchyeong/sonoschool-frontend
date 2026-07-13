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
import type {
  AdminResourceAttachmentItem,
  AdminResourceItem,
  AdminResourceUpsertPayload,
  AdminResourceVisibility,
} from '@/types/adminResources';

import styles from './AdminConsolePage.module.scss';
import {
  RESOURCE_DOCUMENT_WITH_IMAGE_ACCEPT,
  RESOURCE_DOCUMENT_WITH_IMAGE_POLICY_HINT,
  validateResourceDocumentWithImagePolicy,
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
  attachments: ResourceAttachmentFormState[];
  description: string;
  sortOrder: string;
  title: string;
  visibility: AdminResourceVisibility;
}

interface ResourceAttachmentFormState {
  documentId: number | null;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  key: string;
  mediaAssetId: number | null;
  mimeType: string;
  sortOrder: number;
}

const globalResourceVisibilityOptions = [
  { label: '게시', value: 'PUBLIC' },
  { label: '숨김', value: 'HIDDEN' },
] as const;

const EMPTY_FORM: ResourceFormState = {
  attachments: [],
  description: '',
  sortOrder: '0',
  title: '',
  visibility: 'PUBLIC',
};

const createAttachmentKey = (): string => {
  return `attachment-${String(Date.now())}-${String(Math.random())}`;
};

const toAttachmentFormState = (
  attachment: AdminResourceAttachmentItem,
): ResourceAttachmentFormState => {
  return {
    documentId: attachment.documentId,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
    fileUrl: attachment.fileUrl,
    key: `document-${String(attachment.documentId)}`,
    mediaAssetId: null,
    mimeType: attachment.mimeType ?? '',
    sortOrder: attachment.sortOrder,
  };
};

const resolveResourceAttachments = (resource: AdminResourceItem): ResourceAttachmentFormState[] => {
  const attachments = Array.isArray(resource.attachments) ? resource.attachments : [];
  if (attachments.length > 0) {
    return attachments.map(toAttachmentFormState);
  }

  return [
    {
      documentId: resource.id,
      fileName: resource.fileName,
      fileSize: resource.fileSize,
      fileUrl: resource.fileUrl,
      key: `document-${String(resource.id)}`,
      mediaAssetId: null,
      mimeType: resource.mimeType ?? '',
      sortOrder: resource.sortOrder,
    },
  ];
};

const createFormState = (resource?: AdminResourceItem | null): ResourceFormState => {
  if (!resource) {
    return EMPTY_FORM;
  }

  return {
    attachments: resolveResourceAttachments(resource),
    description: resource.description ?? '',
    sortOrder: String(resource.sortOrder),
    title: resource.title,
    visibility: resource.visibility,
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

  if (formState.attachments.length === 0) {
    return '자료 파일을 업로드해 주세요.';
  }

  if (!formState.sortOrder.trim() || Number.isNaN(Number(formState.sortOrder))) {
    return '정렬 순서를 숫자로 입력해 주세요.';
  }

  const invalidAttachment = formState.attachments
    .map((attachment) => ({
      attachment,
      message: validateResourceDocumentWithImagePolicy({
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
      }),
    }))
    .find((result) => result.message !== null);

  return invalidAttachment?.message ?? null;
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
  const [selectedResourceFiles, setSelectedResourceFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const hasUploadedFilePendingSave = formState.attachments.some((attachment) => {
    if (attachment.mediaAssetId === null) {
      return false;
    }

    return !initialFormState.attachments.some(
      (initialAttachment) => initialAttachment.mediaAssetId === attachment.mediaAssetId,
    );
  });
  const totalAttachmentSize = formState.attachments.reduce(
    (total, attachment) => total + attachment.fileSize,
    0,
  );
  const totalSelectedFileSize = selectedResourceFiles.reduce((total, file) => total + file.size, 0);

  useEffect(() => {
    const shouldWarnBeforeUnload = selectedResourceFiles.length > 0 || hasUploadedFilePendingSave;
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
  }, [hasUploadedFilePendingSave, selectedResourceFiles.length]);

  const refreshResources = async () => {
    await queryClient.invalidateQueries({ queryKey: adminResourcesQueryKey() });
  };

  const buildPayload = (): AdminResourceUpsertPayload => {
    const attachments = formState.attachments.map((attachment, index) => ({
      documentId: attachment.documentId,
      fileName: attachment.fileName.trim(),
      mediaAssetId: attachment.mediaAssetId,
      sortOrder: index,
    }));
    const representativeAttachment = attachments[0];

    return {
      attachments,
      description: formState.description.trim() || null,
      fileName: representativeAttachment.fileName,
      lectureId: null,
      mediaAssetId: representativeAttachment.mediaAssetId,
      programId: null,
      scope: 'GLOBAL',
      sortOrder: Number(formState.sortOrder),
      title: formState.title.trim(),
      visibility: formState.visibility,
    };
  };

  const handleResourceFileSelection = (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    const invalidFile = files
      .map((file) => ({
        file,
        message: validateResourceDocumentWithImagePolicy({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      }))
      .find((result) => result.message !== null);

    if (invalidFile) {
      showToast({
        message: invalidFile.message ?? '첨부할 수 없는 파일입니다.',
        variant: 'error',
      });
      return;
    }

    setSelectedResourceFiles(files);
    setFormState((current) => {
      return {
        ...current,
        title: current.title.trim() ? current.title : getTitleFromFileName(files[0]?.name ?? ''),
      };
    });
  };

  const clearSelectedResourceFiles = () => {
    setSelectedResourceFiles([]);
  };

  const removeSelectedResourceFile = (targetIndex: number) => {
    setSelectedResourceFiles((current) => current.filter((_, index) => index !== targetIndex));
  };

  const uploadSelectedResourceFiles = async () => {
    if (selectedResourceFiles.length === 0) {
      showToast({
        message: '업로드할 자료 파일을 선택해 주세요.',
        variant: 'error',
      });
      return;
    }

    setIsUploading(true);
    try {
      const uploadedAttachments = await Promise.all(
        selectedResourceFiles.map(async (file) => {
          const uploadTarget = await createAdminResourceUploadTarget({
            contentType: file.type || 'application/octet-stream',
            fileSize: file.size,
            filename: file.name,
          });
          await uploadAdminResourceFile(uploadTarget.uploadUrl, file);

          return {
            documentId: null,
            fileName: file.name,
            fileSize: file.size,
            fileUrl: uploadTarget.fileUrl,
            key: `asset-${String(uploadTarget.assetId)}-${createAttachmentKey()}`,
            mediaAssetId: uploadTarget.assetId,
            mimeType: file.type || 'application/octet-stream',
            sortOrder: 0,
          } satisfies ResourceAttachmentFormState;
        }),
      );

      setFormState((current) => ({
        ...current,
        attachments: [
          ...current.attachments,
          ...uploadedAttachments.map((attachment, index) => ({
            ...attachment,
            sortOrder: current.attachments.length + index,
          })),
        ],
      }));
      setSelectedResourceFiles([]);
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

  const removeAttachment = (targetIndex: number) => {
    if (formState.attachments.length <= 1) {
      showToast({
        message:
          '자료 파일은 1개 이상 필요합니다. 자료 전체 삭제는 상단 삭제 버튼을 이용해 주세요.',
        variant: 'error',
      });
      return;
    }

    setFormState((current) => {
      return {
        ...current,
        attachments: current.attachments.filter((_, index) => index !== targetIndex),
      };
    });
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

    if (selectedResourceFiles.length > 0) {
      showToast({
        message: '선택한 자료 파일은 업로드 시작을 먼저 눌러 주세요.',
        variant: 'error',
      });
      return;
    }

    if (mode === 'create' && formState.attachments.length === 0) {
      showToast({
        message: '자료 파일을 선택한 뒤 업로드 시작을 눌러 주세요.',
        variant: 'error',
      });
      return;
    }

    const payload = buildPayload();

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
              자료실에 게시할 전역 자료를 등록합니다. 프로그램 자료는 프로그램 등록/수정 화면에서
              관리합니다.
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
              게시 상태를 숨김으로 저장하면 사용자 자료실 목록과 상세에서 노출하지 않습니다.
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
            className={styles['resourceDescriptionTextarea']}
            label='설명'
            name='resourceDescription'
            onChange={(event) => {
              setFormState((current) => ({ ...current, description: event.target.value }));
            }}
            value={formState.description}
          />

          <div className={styles['compactFieldRow']}>
            {globalResourceVisibilityOptions.map((option) => (
              <label className={styles['checkboxField']} key={option.value}>
                <input
                  checked={formState.visibility === option.value}
                  onChange={() => {
                    setFormState((current) => ({ ...current, visibility: option.value }));
                  }}
                  type='radio'
                />
                {option.label}
              </label>
            ))}
          </div>

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
                selectedResourceFiles.length > 0 ? (
                  <>
                    <Button
                      disabled={isUploading}
                      onClick={() => {
                        void uploadSelectedResourceFiles();
                      }}
                      type='button'
                      variant='secondary'
                    >
                      업로드 시작
                    </Button>
                    <Button
                      disabled={isUploading}
                      onClick={clearSelectedResourceFiles}
                      type='button'
                      variant='secondary'
                    >
                      선택 취소
                    </Button>
                  </>
                ) : null
              }
              accept={RESOURCE_DOCUMENT_WITH_IMAGE_ACCEPT}
              buttonLabel={isUploading ? '업로드 중...' : '파일 선택'}
              disabled={isSubmitting}
              hint='선택한 파일은 업로드 시작을 누를 때 업로드됩니다.'
              label='자료 파일 업로드'
              multiple
              onFilesSelected={(files) => {
                handleResourceFileSelection(files);
              }}
              onClear={selectedResourceFiles.length > 0 ? clearSelectedResourceFiles : undefined}
              selectedContent={
                selectedResourceFiles.length > 0 ? (
                  <ul className={styles['noticeAttachmentList']}>
                    {selectedResourceFiles.map((file, index) => (
                      <li
                        className={styles['noticeAttachmentItem']}
                        key={`${file.name}-${String(file.size)}-${String(file.lastModified)}-${String(index)}`}
                      >
                        <span className={styles['noticeAttachmentName']}>{file.name}</span>
                        <span className={styles['noticeAttachmentSize']}>
                          {formatFileSizeInMb(file.size)}
                        </span>
                        <Button
                          disabled={isUploading}
                          onClick={() => {
                            removeSelectedResourceFile(index);
                          }}
                          size='sm'
                          type='button'
                          variant='secondary'
                        >
                          선택 삭제
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : undefined
              }
              selectedLabel={
                selectedResourceFiles.length > 0
                  ? '업로드 대기 파일'
                  : formState.attachments.length > 0
                    ? `등록된 자료 파일 ${String(formState.attachments.length)}개`
                    : undefined
              }
              selectedMeta={
                totalSelectedFileSize > 0
                  ? formatFileSizeInMb(totalSelectedFileSize)
                  : totalAttachmentSize > 0
                    ? formatFileSizeInMb(totalAttachmentSize)
                    : null
              }
            />

            {formState.attachments.length > 0 ? (
              <ul className={styles['noticeAttachmentList']}>
                {formState.attachments.map((attachment, index) => (
                  <li className={styles['noticeAttachmentItem']} key={attachment.key}>
                    <span className={styles['noticeAttachmentName']}>{attachment.fileName}</span>
                    <span className={styles['noticeAttachmentSize']}>
                      {formatFileSizeInMb(attachment.fileSize)}
                    </span>
                    <Button
                      disabled={isSubmitting}
                      onClick={() => {
                        removeAttachment(index);
                      }}
                      size='sm'
                      type='button'
                      variant='secondary'
                    >
                      삭제
                    </Button>
                  </li>
                ))}
              </ul>
            ) : selectedResourceFiles.length === 0 ? (
              <p className={styles['noticeAttachmentEmpty']}>등록된 자료 파일이 없습니다.</p>
            ) : null}
          </section>

          <div className={styles['compactFieldRow']}>
            <TextField
              label='정렬 순서'
              name='resourceSortOrder'
              onChange={(event) => {
                setFormState((current) => ({ ...current, sortOrder: event.target.value }));
              }}
              value={formState.sortOrder}
            />
          </div>

          <p className={styles['helperText']}>{RESOURCE_DOCUMENT_WITH_IMAGE_POLICY_HINT}</p>

          <div className={styles['actionRow']}>
            <Button disabled={isSubmitting} onClick={handleSubmit} type='button'>
              {isSubmitting ? '저장 중...' : mode === 'create' ? '자료 등록' : '자료 저장'}
            </Button>
            <Button
              onClick={() => {
                setSelectedResourceFiles([]);

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
