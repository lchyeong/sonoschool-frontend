import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import {
  createAdminNoticeMediaUploadTarget,
  uploadAdminNoticeMediaFile,
} from '@/api/adminNoticeMedia';
import {
  createAdminNoticeLive,
  publishAdminNoticeLive,
  unpublishAdminNoticeLive,
  updateAdminNoticeLive,
} from '@/api/notices';
import AdminRichTextEditor from '@/components/editor/AdminRichTextEditor/AdminRichTextEditor';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import {
  adminNoticesQueryKey,
  globalNoticesQueryKey,
  useAdminNoticesQuery,
} from '@/query/useNoticeQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type {
  AdminNoticeCreatePayload,
  AdminNoticeUpdatePayload,
  NoticeItem,
} from '@/types/notice';
import { hasRichTextContent } from '@/utils/htmlContent';

import styles from './AdminConsolePage.module.scss';

interface NoticeFormState {
  content: string;
  pinned: boolean;
  published: boolean;
  title: string;
}

interface AdminNoticeWorkspaceProps {
  mode: 'create' | 'edit';
}

interface AdminNoticeWorkspaceFormProps extends AdminNoticeWorkspaceProps {
  editingNotice: NoticeItem | null;
  initialFormState: NoticeFormState;
  resolvedNoticeId: number | null;
}

const EMPTY_FORM: NoticeFormState = {
  content: '',
  pinned: false,
  published: true,
  title: '',
};

const createFormState = (
  notice: Pick<NoticeItem, 'content' | 'pinned' | 'published' | 'title'> | null | undefined,
): NoticeFormState => {
  if (!notice) {
    return EMPTY_FORM;
  }

  return {
    content: notice.content,
    pinned: notice.pinned,
    published: notice.published,
    title: notice.title,
  };
};

const AdminNoticeWorkspaceForm = ({
  editingNotice,
  initialFormState,
  mode,
  resolvedNoticeId,
}: AdminNoticeWorkspaceFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const [formState, setFormState] = useState<NoticeFormState>(initialFormState);

  const refreshNotices = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminNoticesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: globalNoticesQueryKey() }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (payload: AdminNoticeCreatePayload) => createAdminNoticeLive(payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '공지사항 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (notice) => {
      await refreshNotices();
      showToast({
        message: '공지사항을 등록했습니다.',
        variant: 'success',
      });
      void navigate(routePaths.adminNoticeEdit(String(notice.id)));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      noticeId: targetNoticeId,
      payload,
    }: {
      noticeId: number;
      payload: AdminNoticeUpdatePayload;
    }) => updateAdminNoticeLive(targetNoticeId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '공지사항 수정에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (notice) => {
      await refreshNotices();
      setFormState(createFormState(notice));
      showToast({
        message: '공지사항을 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (targetNoticeId: number) => publishAdminNoticeLive(targetNoticeId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '공지 게시 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshNotices();
      showToast({
        message: '공지 게시 상태를 반영했습니다.',
        variant: 'success',
      });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (targetNoticeId: number) => unpublishAdminNoticeLive(targetNoticeId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '공지 게시 중지에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshNotices();
      showToast({
        message: '공지 게시를 중지했습니다.',
        variant: 'success',
      });
    },
  });

  const handleSubmit = () => {
    const title = formState.title.trim();
    const content = formState.content.trim();

    if (!title) {
      showToast({ message: '공지 제목을 입력해 주세요.', variant: 'error' });
      return;
    }

    if (!hasRichTextContent(content)) {
      showToast({ message: '공지 본문을 입력해 주세요.', variant: 'error' });
      return;
    }

    if (mode === 'create') {
      createMutation.mutate({
        content,
        pinned: formState.pinned,
        programId: null,
        published: formState.published,
        scope: 'GLOBAL',
        title,
      });
      return;
    }

    updateMutation.mutate({
      noticeId: resolvedNoticeId as number,
      payload: {
        content,
        pinned: formState.pinned,
        programId: null,
        scope: 'GLOBAL',
        title,
      },
    });
  };

  const uploadNoticeImage = async (file: File) => {
    const uploadTarget = await createAdminNoticeMediaUploadTarget({
      contentType: file.type || 'application/octet-stream',
      domain: 'NOTICE',
      fileSize: file.size,
      filename: file.name,
    });

    await uploadAdminNoticeMediaFile(uploadTarget.uploadUrl, file);

    return {
      alt: file.name,
      storageUrl: uploadTarget.storageUrl,
      url: uploadTarget.previewUrl,
    };
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className={styles['page']}>
      <section className={styles['editorShell']}>
        <div className={styles['editorToolbar']}>
          <div className={styles['editorToolbarActions']}>
            <Button
              onClick={() => {
                void navigate(routePaths.adminNotices);
              }}
              size='sm'
              type='button'
              variant='secondary'
            >
              목록으로
            </Button>
          </div>

          {mode === 'edit' && editingNotice ? (
            <div className={styles['editorMetaRow']}>
              <span className={editingNotice.published ? styles['badgeSuccess'] : styles['badge']}>
                {editingNotice.published ? '게시 중' : '비공개'}
              </span>
              {editingNotice.pinned ? <span className={styles['badgeAccent']}>고정</span> : null}
            </div>
          ) : null}
        </div>

        <div className={`${styles['form']} ${styles['noticeEditorForm']}`}>
          <TextField
            label='공지 제목'
            labelClassName={styles['srOnly']}
            name='noticeTitle'
            onChange={(event) => {
              setFormState((current) => ({ ...current, title: event.target.value }));
            }}
            placeholder='제목'
            value={formState.title}
          />

          <AdminRichTextEditor
            onChange={(nextContent) => {
              setFormState((current) => ({ ...current, content: nextContent }));
            }}
            onImageUpload={uploadNoticeImage}
            placeholder='본문'
            value={formState.content}
          />

          <div className={styles['noticeEditorActionBar']}>
            <div className={styles['actionRow']}>
              <Button disabled={isSubmitting} onClick={handleSubmit} size='sm' type='button'>
                {isSubmitting ? '저장 중...' : mode === 'create' ? '공지 등록' : '공지 저장'}
              </Button>
              <Button
                onClick={() => {
                  if (mode === 'edit' && editingNotice) {
                    setFormState(createFormState(editingNotice));
                    return;
                  }

                  setFormState(EMPTY_FORM);
                }}
                size='sm'
                type='button'
                variant='secondary'
              >
                {mode === 'create' ? '초기화' : '변경 취소'}
              </Button>
              {mode === 'edit' && editingNotice ? (
                editingNotice.published ? (
                  <Button
                    disabled={unpublishMutation.isPending}
                    onClick={() => {
                      unpublishMutation.mutate(editingNotice.id);
                    }}
                    size='sm'
                    type='button'
                    variant='secondary'
                  >
                    게시 중지
                  </Button>
                ) : (
                  <Button
                    disabled={publishMutation.isPending}
                    onClick={() => {
                      publishMutation.mutate(editingNotice.id);
                    }}
                    size='sm'
                    type='button'
                  >
                    게시하기
                  </Button>
                )
              ) : null}
            </div>

            {mode === 'create' ? (
              <label className={styles['checkboxRow']}>
                <input
                  checked={formState.published}
                  onChange={(event) => {
                    setFormState((current) => ({ ...current, published: event.target.checked }));
                  }}
                  type='checkbox'
                />
                즉시 게시
              </label>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};

const AdminNoticeWorkspace = ({ mode }: AdminNoticeWorkspaceProps) => {
  const params = useParams();
  const noticesQuery = useAdminNoticesQuery(mode === 'edit');
  const noticeId = Number(params['noticeId']);
  const resolvedNoticeId = Number.isInteger(noticeId) && noticeId > 0 ? noticeId : null;
  const editingNotice =
    mode === 'edit'
      ? ((noticesQuery.data ?? []).find(
          (notice) => notice.id === resolvedNoticeId && notice.scope === 'GLOBAL',
        ) ?? null)
      : null;

  if (mode === 'edit' && resolvedNoticeId === null) {
    return (
      <section className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>공지 경로가 올바르지 않습니다.</h2>
        <p className={styles['stateDescription']}>공지 목록으로 돌아가 다시 선택해 주세요.</p>
      </section>
    );
  }

  if (mode === 'edit' && noticesQuery.isPending) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>공지 정보를 불러오는 중입니다.</h2>
        <p className={styles['stateDescription']}>편집할 공지 데이터를 준비하고 있습니다.</p>
      </section>
    );
  }

  if (mode === 'edit' && (noticesQuery.isError || !editingNotice)) {
    return (
      <section className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>공지 정보를 찾지 못했습니다.</h2>
        <p className={styles['stateDescription']}>
          {noticesQuery.error instanceof Error
            ? noticesQuery.error.message
            : '공지 목록에서 다시 선택해 주세요.'}
        </p>
      </section>
    );
  }

  return (
    <AdminNoticeWorkspaceForm
      editingNotice={editingNotice}
      initialFormState={createFormState(editingNotice)}
      key={
        editingNotice
          ? `notice-${String(editingNotice.id)}-${editingNotice.updatedAt}`
          : 'notice-create'
      }
      mode={mode}
      resolvedNoticeId={resolvedNoticeId}
    />
  );
};

export default AdminNoticeWorkspace;
