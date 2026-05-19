import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createAdminPopupMediaUploadTarget,
  uploadAdminPopupMediaFile,
} from '@/api/adminPopupMedia';
import {
  createAdminPopupLive,
  deleteAdminPopupLive,
  publishAdminPopupLive,
  unpublishAdminPopupLive,
  updateAdminPopupLive,
} from '@/api/popups';
import SectionTabs from '@/components/ui/SectionTabs/SectionTabs';
import {
  adminPopupsQueryKey,
  globalPopupsQueryKey,
  useAdminPopupsQuery,
} from '@/query/usePopupQueries';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminPopupCreatePayload, AdminPopupUpdatePayload, PopupItem } from '@/types/popup';

import styles from './AdminConsolePage.module.scss';
import AdminPopupForm from './AdminPopupForm';
import AdminPopupPreviewModal from './AdminPopupPreviewModal';
import AdminPopupTable from './AdminPopupTable';
import {
  buildPopupLabelFromFilename,
  comparePopupDisplayOrder,
  createEmptyPopupForm,
  createPopupFormState,
  getNextPopupSortOrder,
  isPopupVisibleNow,
  optimizePopupImageFile,
  type PopupAdminTab,
  type PopupFormState,
} from './adminPopupUtils';

const AdminPopupsSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const popupsQuery = useAdminPopupsQuery();
  const [previewPopupId, setPreviewPopupId] = useState<number | null>(null);
  const [editingPopupIdState, setEditingPopupId] = useState<number | null>(null);
  const [formState, setFormState] = useState<PopupFormState>(createEmptyPopupForm());
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<PopupAdminTab>('list');

  useEffect(() => {
    const previewObjectUrl = formState.imagePreviewObjectUrl;

    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    };
  }, [formState.imagePreviewObjectUrl]);

  const popups = useMemo(() => popupsQuery.data ?? [], [popupsQuery.data]);
  const currentDisplayPopup = useMemo(() => {
    return (
      [...popups]
        .filter((popup) => isPopupVisibleNow(popup))
        .sort(comparePopupDisplayOrder)
        .at(0) ?? null
    );
  }, [popups]);

  const editingPopupId =
    editingPopupIdState !== null && popups.some((popup) => popup.id === editingPopupIdState)
      ? editingPopupIdState
      : null;
  const previewPopup = popups.find((popup) => popup.id === previewPopupId) ?? null;

  const refreshPopups = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminPopupsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: globalPopupsQueryKey() }),
    ]);
  };

  const unpublishSiblingPopups = async (activePopupId: number) => {
    await Promise.all(
      popups
        .filter((popup) => popup.id !== activePopupId && popup.published)
        .map((popup) => unpublishAdminPopupLive(popup.id)),
    );
  };

  const resetFormForCreate = (sortOrder = getNextPopupSortOrder(popups)) => {
    setEditingPopupId(null);
    setFormState(createEmptyPopupForm(sortOrder));
  };

  const createMutation = useMutation({
    mutationFn: (payload: AdminPopupCreatePayload) => createAdminPopupLive(payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '팝업 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (popup) => {
      if (popup.published) {
        await unpublishSiblingPopups(popup.id);
      }
      await refreshPopups();
      resetFormForCreate(popup.sortOrder + 1);
      showToast({
        message: '팝업을 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ payload, popupId }: { payload: AdminPopupUpdatePayload; popupId: number }) =>
      updateAdminPopupLive(popupId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '팝업 수정에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshPopups();
      resetFormForCreate();
      showToast({
        message: '팝업을 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (popupId: number) => {
      await unpublishSiblingPopups(popupId);
      return publishAdminPopupLive(popupId);
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '팝업 노출 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshPopups();
      showToast({
        message: '팝업 노출 상태를 반영했습니다.',
        variant: 'success',
      });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (popupId: number) => unpublishAdminPopupLive(popupId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '팝업 노출 중지에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshPopups();
      showToast({
        message: '팝업 노출을 중지했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (popupId: number) => deleteAdminPopupLive(popupId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '팝업 삭제에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, popupId) => {
      await refreshPopups();

      if (previewPopupId === popupId) {
        setPreviewPopupId(null);
      }
      if (editingPopupId === popupId) {
        resetFormForCreate();
      }

      showToast({
        message: '팝업을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const startCreate = () => {
    resetFormForCreate();
    setActiveTab('form');
  };

  const startEdit = (popup: PopupItem) => {
    setEditingPopupId(popup.id);
    setFormState(createPopupFormState(popup));
    setActiveTab('form');
    setPreviewPopupId(null);
  };

  const handleImageFileChange = (file: File | null) => {
    if (!file) {
      return;
    }

    const previewObjectUrl =
      typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;

    setFormState((current) => ({
      ...current,
      imageAlt: current.imageAlt.trim() ? current.imageAlt : buildPopupLabelFromFilename(file.name),
      imageAssetId: null,
      imagePreviewObjectUrl: previewObjectUrl,
      imageUrl: previewObjectUrl ?? '',
      pendingImageFile: file,
    }));
  };

  const uploadPendingPopupImage = async (file: File) => {
    setIsUploadingImage(true);

    try {
      const uploadFile = await optimizePopupImageFile(file);
      const uploadTarget = await createAdminPopupMediaUploadTarget({
        contentType: uploadFile.type || 'application/octet-stream',
        fileSize: uploadFile.size,
        filename: uploadFile.name,
      });

      await uploadAdminPopupMediaFile(uploadTarget.uploadUrl, uploadFile);

      setFormState((current) => ({
        ...current,
        imageAssetId: uploadTarget.assetId,
        imagePreviewObjectUrl: null,
        imageUrl: uploadTarget.previewUrl,
        pendingImageFile: null,
      }));

      return uploadTarget;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    const imageAlt = formState.imageAlt.trim();

    if (formState.imageAssetId === null && formState.pendingImageFile === null) {
      showToast({ message: '팝업 이미지를 첨부해 주세요.', variant: 'error' });
      return;
    }

    if (!imageAlt) {
      showToast({ message: '이미지 설명을 입력해 주세요.', variant: 'error' });
      return;
    }

    let imageAssetId = formState.imageAssetId;

    if (formState.pendingImageFile) {
      try {
        const uploadTarget = await uploadPendingPopupImage(formState.pendingImageFile);
        imageAssetId = uploadTarget.assetId;
      } catch (error: unknown) {
        showToast({
          message: error instanceof Error ? error.message : '팝업 이미지 업로드에 실패했습니다.',
          variant: 'error',
        });
        return;
      }
    }

    if (imageAssetId === null) {
      showToast({ message: '팝업 이미지를 첨부해 주세요.', variant: 'error' });
      return;
    }

    const payload = {
      altText: imageAlt,
      imageAssetId,
      sortOrder: Math.max(0, formState.sortOrder),
      visibleEndAt: null,
      visibleStartAt: null,
    };

    if (editingPopupId === null) {
      createMutation.mutate({
        ...payload,
        published: true,
      });
      return;
    }

    updateMutation.mutate({
      payload,
      popupId: editingPopupId,
    });
  };

  const popupTabs = [
    { count: popups.length, label: '팝업 목록', value: 'list' },
    { label: editingPopupId === null ? '팝업 등록' : '팝업 수정', value: 'form' },
  ] satisfies Array<{ count?: number; label: string; value: PopupAdminTab }>;

  if (popupsQuery.isPending) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>팝업 목록을 불러오는 중입니다.</h2>
        <p className={styles['stateDescription']}>관리자 팝업 API 응답을 확인하고 있습니다.</p>
      </section>
    );
  }

  if (popupsQuery.isError) {
    return (
      <section className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>팝업 관리 화면을 불러오지 못했습니다.</h2>
        <p className={styles['stateDescription']}>
          {popupsQuery.error instanceof Error
            ? popupsQuery.error.message
            : '관리자 팝업 API 상태를 확인해 주세요.'}
        </p>
      </section>
    );
  }

  return (
    <section className={styles['workspace']}>
      <SectionTabs
        ariaLabel='팝업 관리 작업'
        items={popupTabs}
        onChange={setActiveTab}
        value={activeTab}
      />

      {activeTab === 'form' ? (
        <AdminPopupForm
          editingPopupId={editingPopupId}
          formState={formState}
          isSaving={createMutation.isPending || updateMutation.isPending}
          isUploadingImage={isUploadingImage}
          onImageAltChange={(imageAlt) => {
            setFormState((current) => ({ ...current, imageAlt }));
          }}
          onImageFileChange={handleImageFileChange}
          onRemoveImage={() => {
            setFormState((current) => ({
              ...current,
              imageAlt: '',
              imageAssetId: null,
              imagePreviewObjectUrl: null,
              imageUrl: '',
              pendingImageFile: null,
            }));
          }}
          onStartCreate={startCreate}
          onSubmit={() => {
            void handleSubmit();
          }}
        />
      ) : null}

      {activeTab === 'list' ? (
        <AdminPopupTable
          currentDisplayPopupId={currentDisplayPopup?.id ?? null}
          onDelete={(popupId) => {
            if (!window.confirm('이 팝업을 삭제하시겠습니까?')) {
              return;
            }

            deleteMutation.mutate(popupId);
          }}
          onEdit={startEdit}
          onPreview={setPreviewPopupId}
          onPublish={(popupId) => {
            publishMutation.mutate(popupId);
          }}
          onStartCreate={startCreate}
          onUnpublish={(popupId) => {
            unpublishMutation.mutate(popupId);
          }}
          popups={popups}
        />
      ) : null}

      {previewPopup ? (
        <AdminPopupPreviewModal
          currentDisplayPopupId={currentDisplayPopup?.id ?? null}
          isPublishPending={publishMutation.isPending}
          isUnpublishPending={unpublishMutation.isPending}
          onClose={() => {
            setPreviewPopupId(null);
          }}
          onEdit={startEdit}
          onPublish={(popupId) => {
            publishMutation.mutate(popupId);
          }}
          onUnpublish={(popupId) => {
            unpublishMutation.mutate(popupId);
          }}
          popup={previewPopup}
        />
      ) : null}
    </section>
  );
};

export default AdminPopupsSection;
