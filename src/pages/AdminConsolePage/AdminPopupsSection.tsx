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
import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import SectionTabs from '@/components/ui/SectionTabs/SectionTabs';
import { TextField } from '@/components/ui/TextField/TextField';
import {
  adminPopupsQueryKey,
  globalPopupsQueryKey,
  useAdminPopupsQuery,
} from '@/query/usePopupQueries';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminPopupCreatePayload, AdminPopupUpdatePayload, PopupItem } from '@/types/popup';
import { classNames } from '@/utils/classNames';
import {
  buildCalendarCells,
  calendarWeekdays,
  formatDate,
  formatMonthLabel,
  toMonthValue,
} from '@/utils/practicumCalendar';

import styles from './AdminConsolePage.module.scss';

interface PopupFormState {
  imageAlt: string;
  imageAssetId: number | null;
  imagePreviewObjectUrl: string | null;
  imageUrl: string;
  pendingImageFile: File | null;
  published: boolean;
  sortOrder: number;
  visibleEndAt: string;
  visibleStartAt: string;
}

type PopupAdminTab = 'form' | 'list';

const createEmptyForm = (sortOrder = 0): PopupFormState => ({
  imageAlt: '',
  imageAssetId: null,
  imagePreviewObjectUrl: null,
  imageUrl: '',
  pendingImageFile: null,
  published: true,
  sortOrder,
  visibleEndAt: '',
  visibleStartAt: '',
});

const formatDisplayDate = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${String(year)}.${month}.${day}`;
};

const formatDateInputValue = (value: string | null): string => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${String(year)}-${month}-${day}`;
};

const formatEndDateInputValue = (value: string | null): string => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  date.setMilliseconds(date.getMilliseconds() - 1);

  return formatDateInputValue(date.toISOString());
};

const toStartOfDayIsoStringOrNull = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const date = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toEndOfDayIsoStringOrNull = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const date = new Date(`${trimmed}T00:00:00`);
  date.setDate(date.getDate() + 1);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const addMonths = (value: Date, amount: number): Date => {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
};

const formatPopupDateRangeText = (startDate: string, endDate: string): string => {
  if (!startDate && !endDate) {
    return '상시 노출';
  }

  if (startDate && endDate) {
    return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
  }

  if (startDate) {
    return `${formatDate(startDate)}부터`;
  }

  return `${formatDate(endDate)}까지`;
};

const isDateInRange = (date: string, startDate: string, endDate: string): boolean => {
  if (!startDate) {
    return false;
  }

  if (!endDate) {
    return date === startDate;
  }

  return date >= startDate && date <= endDate;
};

const buildPopupLabelFromFilename = (filename: string): string => {
  return filename.replace(/\.[^.]+$/, '').trim() || '홈 팝업';
};

const POPUP_IMAGE_MAX_WIDTH = 1200;
const POPUP_IMAGE_MAX_HEIGHT = 1600;
const POPUP_IMAGE_WEBP_QUALITY = 0.82;

const shouldSkipClientImageOptimization = (file: File): boolean => {
  const contentType = file.type.toLowerCase();
  return (
    !contentType.startsWith('image/') || contentType.includes('gif') || contentType.includes('svg')
  );
};

const buildOptimizedPopupFilename = (filename: string): string => {
  const basename = filename.replace(/\.[^.]+$/, '').trim() || 'popup-image';
  return `${basename}.webp`;
};

const loadPopupImageElement = async (file: File): Promise<HTMLImageElement> => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => {
        resolve(image);
      };
      image.onerror = () => {
        reject(new Error('팝업 이미지 파일을 읽지 못했습니다.'));
      };
    });
    image.src = objectUrl;
    return await loaded;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const calculatePopupImageSize = (width: number, height: number) => {
  const ratio = Math.min(POPUP_IMAGE_MAX_WIDTH / width, POPUP_IMAGE_MAX_HEIGHT / height, 1);

  return {
    height: Math.max(1, Math.round(height * ratio)),
    resized: ratio < 1,
    width: Math.max(1, Math.round(width * ratio)),
  };
};

const canvasToWebpBlob = async (canvas: HTMLCanvasElement): Promise<Blob | null> => {
  return await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/webp', POPUP_IMAGE_WEBP_QUALITY);
  });
};

const optimizePopupImageFile = async (file: File): Promise<File> => {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return file;
  }

  if (shouldSkipClientImageOptimization(file)) {
    return file;
  }

  try {
    const image = await loadPopupImageElement(file);
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;

    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return file;
    }

    const targetSize = calculatePopupImageSize(sourceWidth, sourceHeight);
    const canvas = document.createElement('canvas');
    canvas.width = targetSize.width;
    canvas.height = targetSize.height;

    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, targetSize.width, targetSize.height);

    const optimizedBlob = await canvasToWebpBlob(canvas);
    if (!optimizedBlob) {
      return file;
    }

    if (!targetSize.resized && optimizedBlob.size >= file.size) {
      return file;
    }

    return new File([optimizedBlob], buildOptimizedPopupFilename(file.name), {
      lastModified: Date.now(),
      type: 'image/webp',
    });
  } catch {
    return file;
  }
};

const createFormState = (popup?: PopupItem | null): PopupFormState => {
  if (!popup) {
    return createEmptyForm();
  }

  return {
    imageAlt: popup.altText,
    imageAssetId: popup.imageAssetId,
    imagePreviewObjectUrl: null,
    imageUrl: popup.imageUrl,
    pendingImageFile: null,
    published: popup.published,
    sortOrder: popup.sortOrder,
    visibleEndAt: formatEndDateInputValue(popup.visibleEndAt),
    visibleStartAt: formatDateInputValue(popup.visibleStartAt),
  };
};

const formatVisibilityWindow = (popup: PopupItem): string => {
  if (!popup.visibleStartAt && !popup.visibleEndAt) {
    return '상시 노출';
  }

  if (popup.visibleStartAt && popup.visibleEndAt) {
    return `${formatDisplayDate(popup.visibleStartAt)} ~ ${formatDisplayDate(
      new Date(Date.parse(popup.visibleEndAt) - 1).toISOString(),
    )}`;
  }

  if (popup.visibleStartAt) {
    return `${formatDisplayDate(popup.visibleStartAt)}부터`;
  }

  const visibleEndAt = popup.visibleEndAt;
  if (!visibleEndAt) {
    return '상시 노출';
  }

  return `${formatDisplayDate(new Date(Date.parse(visibleEndAt) - 1).toISOString())}까지`;
};

const getNextSortOrder = (popups: PopupItem[]): number => {
  if (!popups.length) {
    return 0;
  }

  return Math.max(...popups.map((popup) => popup.sortOrder)) + 1;
};

const isPopupVisibleNow = (popup: PopupItem, now = Date.now()): boolean => {
  if (!popup.published) {
    return false;
  }

  const visibleStartAt = popup.visibleStartAt ? Date.parse(popup.visibleStartAt) : null;
  const visibleEndAt = popup.visibleEndAt ? Date.parse(popup.visibleEndAt) : null;

  if (visibleStartAt !== null && visibleStartAt > now) {
    return false;
  }

  if (visibleEndAt !== null && visibleEndAt < now) {
    return false;
  }

  return true;
};

const comparePopupDisplayOrder = (left: PopupItem, right: PopupItem): number => {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
};

const AdminPopupsSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const popupsQuery = useAdminPopupsQuery();
  const [previewPopupId, setPreviewPopupId] = useState<number | null>(null);
  const [editingPopupIdState, setEditingPopupId] = useState<number | null>(null);
  const [formState, setFormState] = useState<PopupFormState>(createEmptyForm());
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<PopupAdminTab>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [hoveredCalendarDate, setHoveredCalendarDate] = useState<string | null>(null);

  useEffect(() => {
    const previewObjectUrl = formState.imagePreviewObjectUrl;

    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    };
  }, [formState.imagePreviewObjectUrl]);

  const popups = useMemo(() => popupsQuery.data ?? [], [popupsQuery.data]);
  const rightCalendarMonth = useMemo(() => addMonths(calendarMonth, 1), [calendarMonth]);
  const leftCalendarCells = useMemo(
    () => buildCalendarCells(toMonthValue(calendarMonth)),
    [calendarMonth],
  );
  const rightCalendarCells = useMemo(
    () => buildCalendarCells(toMonthValue(rightCalendarMonth)),
    [rightCalendarMonth],
  );
  const visibleRangeText = useMemo(
    () => formatPopupDateRangeText(formState.visibleStartAt, formState.visibleEndAt),
    [formState.visibleEndAt, formState.visibleStartAt],
  );
  const previewVisibleEndAt =
    formState.visibleEndAt ||
    (formState.visibleStartAt &&
    hoveredCalendarDate &&
    hoveredCalendarDate >= formState.visibleStartAt
      ? hoveredCalendarDate
      : '');
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
        await Promise.all(
          popups
            .filter((item) => item.id !== popup.id && item.published)
            .map((item) => unpublishAdminPopupLive(item.id)),
        );
      }
      await refreshPopups();
      setEditingPopupId(null);
      setFormState(createEmptyForm(popup.sortOrder + 1));
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
      setEditingPopupId(null);
      setFormState(createEmptyForm(getNextSortOrder(popups)));
      showToast({
        message: '팝업을 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (popupId: number) => {
      await Promise.all(
        popups
          .filter((popup) => popup.id !== popupId && popup.published)
          .map((popup) => unpublishAdminPopupLive(popup.id)),
      );

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
        setEditingPopupId(null);
        setFormState(createEmptyForm(getNextSortOrder(popups)));
      }

      showToast({
        message: '팝업을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const startCreate = () => {
    setEditingPopupId(null);
    const nextFormState = createEmptyForm(getNextSortOrder(popups));
    setFormState(nextFormState);
    setCalendarMonth(new Date());
    setActiveTab('form');
  };

  const startEdit = (popup: PopupItem) => {
    const nextFormState = createFormState(popup);
    setEditingPopupId(popup.id);
    setFormState(nextFormState);
    setCalendarMonth(
      nextFormState.visibleStartAt
        ? new Date(`${nextFormState.visibleStartAt}T00:00:00`)
        : new Date(),
    );
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

  const handleCalendarDateSelect = (dateValue: string) => {
    setFormState((current) => {
      if (!current.visibleStartAt || current.visibleEndAt) {
        return {
          ...current,
          visibleEndAt: '',
          visibleStartAt: dateValue,
        };
      }

      if (dateValue < current.visibleStartAt) {
        return {
          ...current,
          visibleEndAt: '',
          visibleStartAt: dateValue,
        };
      }

      setIsDatePickerOpen(false);

      return {
        ...current,
        visibleEndAt: dateValue,
      };
    });
  };

  const resetVisibleRange = () => {
    setFormState((current) => ({
      ...current,
      visibleEndAt: '',
      visibleStartAt: '',
    }));
  };

  const handleSubmit = async () => {
    const imageAlt = formState.imageAlt.trim();
    const visibleStartAt = toStartOfDayIsoStringOrNull(formState.visibleStartAt);
    const visibleEndAt = toEndOfDayIsoStringOrNull(formState.visibleEndAt);

    if (formState.imageAssetId === null && formState.pendingImageFile === null) {
      showToast({ message: '팝업 이미지를 첨부해 주세요.', variant: 'error' });
      return;
    }

    if (!imageAlt) {
      showToast({ message: '이미지 설명을 입력해 주세요.', variant: 'error' });
      return;
    }

    if (
      (formState.visibleStartAt && !formState.visibleEndAt) ||
      (!formState.visibleStartAt && formState.visibleEndAt)
    ) {
      showToast({ message: '노출기간은 시작일과 종료일을 모두 선택해 주세요.', variant: 'error' });
      return;
    }

    if (visibleStartAt && visibleEndAt && new Date(visibleStartAt) > new Date(visibleEndAt)) {
      showToast({ message: '노출 시작일은 종료일보다 늦을 수 없습니다.', variant: 'error' });
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
      visibleEndAt,
      visibleStartAt,
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
        <article className={styles['panel']}>
          <div className={styles['form']}>
            <div className={styles['popupMediaField']}>
              <div className={styles['popupFileField']}>
                <p className={styles['fieldLabel']}>팝업 이미지</p>
                <label className={styles['popupFilePicker']} data-disabled={isUploadingImage}>
                  <input
                    accept='image/*'
                    className={styles['srOnly']}
                    disabled={isUploadingImage}
                    name='popupImageFile'
                    onChange={(event) => {
                      handleImageFileChange(event.target.files?.[0] ?? null);
                      event.currentTarget.value = '';
                    }}
                    type='file'
                  />
                  <span className={styles['popupFileButton']}>
                    {isUploadingImage ? '업로드 중' : '파일 선택'}
                  </span>
                  <span className={styles['popupFileName']}>
                    {formState.pendingImageFile?.name ??
                      (formState.imageUrl ? '등록된 이미지' : '선택된 파일 없음')}
                  </span>
                </label>
              </div>

              {formState.imageUrl ? (
                <div className={styles['thumbnailPreview']}>
                  <img
                    alt={formState.imageAlt || '팝업 이미지 미리보기'}
                    className={styles['thumbnailPreviewImage']}
                    src={formState.imageUrl}
                  />
                  {formState.pendingImageFile ? (
                    <p className={styles['thumbnailFileCaption']}>
                      등록 대기 중 · {formState.pendingImageFile.name}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className={styles['thumbnailEmptyState']}>이미지를 선택해 주세요.</div>
              )}
            </div>

            <TextField
              label='이미지 설명'
              name='popupImageAlt'
              onChange={(event) => {
                setFormState((current) => ({ ...current, imageAlt: event.target.value }));
              }}
              placeholder='이미지 설명'
              value={formState.imageAlt}
            />

            <div className={styles['popupDateRangeField']}>
              <p className={styles['fieldLabel']}>노출기간</p>
              <div className={styles['popupDateRangePicker']}>
                <button
                  className={classNames(
                    styles['popupDateRangeTrigger'],
                    isDatePickerOpen && styles['popupDateRangeTriggerActive'],
                  )}
                  onClick={() => {
                    setIsDatePickerOpen((current) => !current);
                  }}
                  type='button'
                >
                  <span aria-hidden='true' className={styles['popupDateRangeIcon']} />
                  <span>{visibleRangeText}</span>
                </button>

                {isDatePickerOpen ? (
                  <div
                    className={styles['popupDateRangePopover']}
                    onMouseLeave={() => {
                      setHoveredCalendarDate(null);
                    }}
                  >
                    <div className={styles['popupDateRangeCalendarGrid']}>
                      {[
                        { cells: leftCalendarCells, key: 'left', month: calendarMonth },
                        { cells: rightCalendarCells, key: 'right', month: rightCalendarMonth },
                      ].map((calendar) => (
                        <div
                          className={styles['paymentDatePickerCalendarPanel']}
                          key={calendar.key}
                        >
                          <div className={styles['paymentDatePickerCalendarHead']}>
                            {calendar.key === 'left' ? (
                              <button
                                className={styles['paymentDatePickerNav']}
                                onClick={() => {
                                  setCalendarMonth((previous) => addMonths(previous, -1));
                                }}
                                type='button'
                              >
                                이전
                              </button>
                            ) : (
                              <span className={styles['paymentDatePickerNavSpacer']} />
                            )}
                            <strong className={styles['paymentDatePickerMonthLabel']}>
                              {formatMonthLabel(toMonthValue(calendar.month))}
                            </strong>
                            {calendar.key === 'right' ? (
                              <button
                                className={styles['paymentDatePickerNav']}
                                onClick={() => {
                                  setCalendarMonth((previous) => addMonths(previous, 1));
                                }}
                                type='button'
                              >
                                다음
                              </button>
                            ) : (
                              <span className={styles['paymentDatePickerNavSpacer']} />
                            )}
                          </div>
                          <div className={styles['paymentDatePickerWeekdays']}>
                            {calendarWeekdays.map((label) => (
                              <span key={`${calendar.key}-weekday-${label}`}>{label}</span>
                            ))}
                          </div>
                          <div className={styles['paymentDatePickerDays']}>
                            {calendar.cells.map((cell, index) => {
                              const dateValue = cell.date;
                              const isInRange = Boolean(
                                dateValue &&
                                  cell.isCurrentMonth &&
                                  isDateInRange(
                                    dateValue,
                                    formState.visibleStartAt,
                                    previewVisibleEndAt,
                                  ),
                              );
                              const isSelectedStart = Boolean(
                                dateValue &&
                                  cell.isCurrentMonth &&
                                  formState.visibleStartAt === dateValue,
                              );
                              const isSelectedEnd = Boolean(
                                dateValue &&
                                  cell.isCurrentMonth &&
                                  formState.visibleEndAt === dateValue,
                              );

                              return (
                                <button
                                  aria-label={dateValue ? formatDate(dateValue) : undefined}
                                  className={`${styles['paymentDatePickerDay']} ${
                                    !cell.isCurrentMonth
                                      ? styles['paymentDatePickerDayOutside']
                                      : ''
                                  } ${isInRange ? styles['paymentDatePickerDayInRange'] : ''} ${
                                    isSelectedStart
                                      ? styles['paymentDatePickerDaySelectedStart']
                                      : ''
                                  } ${
                                    isSelectedEnd ? styles['paymentDatePickerDaySelectedEnd'] : ''
                                  }`}
                                  disabled={!cell.isCurrentMonth || !dateValue}
                                  key={`${calendar.key}-${dateValue ?? 'empty'}-${String(index)}`}
                                  onClick={() => {
                                    if (dateValue) {
                                      handleCalendarDateSelect(dateValue);
                                    }
                                  }}
                                  onMouseEnter={() => {
                                    setHoveredCalendarDate(dateValue);
                                  }}
                                  type='button'
                                >
                                  {dateValue ? Number(dateValue.slice(-2)) : ''}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className={styles['popupDateRangeActions']}>
                      <button
                        className={styles['tableActionButton']}
                        disabled={!formState.visibleStartAt && !formState.visibleEndAt}
                        onClick={() => {
                          resetVisibleRange();
                          setIsDatePickerOpen(false);
                        }}
                        type='button'
                      >
                        상시 노출
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles['actionRow']}>
              <Button
                disabled={createMutation.isPending || updateMutation.isPending || isUploadingImage}
                onClick={() => {
                  void handleSubmit();
                }}
                type='button'
              >
                {isUploadingImage
                  ? '이미지 업로드 중...'
                  : createMutation.isPending || updateMutation.isPending
                    ? '저장 중...'
                    : editingPopupId === null
                      ? '팝업 등록'
                      : '팝업 수정'}
              </Button>
              <Button onClick={startCreate} type='button' variant='secondary'>
                새 팝업 작성
              </Button>
              {formState.imageUrl ? (
                <Button
                  onClick={() => {
                    setFormState((current) => ({
                      ...current,
                      imageAlt: '',
                      imageAssetId: null,
                      imagePreviewObjectUrl: null,
                      imageUrl: '',
                      pendingImageFile: null,
                    }));
                  }}
                  type='button'
                  variant='secondary'
                >
                  이미지 제거
                </Button>
              ) : null}
            </div>
          </div>
        </article>
      ) : null}

      {activeTab === 'list' ? (
        <article className={styles['panelWide']}>
          <div className={styles['panelToolbar']}>
            <p className={styles['metaText']}>총 {popups.length}개</p>
            <Button onClick={startCreate} size='sm' type='button'>
              새 팝업 등록
            </Button>
          </div>

          {!popups.length ? (
            <section className={styles['stateSection']}>
              <h3 className={styles['stateTitle']}>표시할 팝업이 없습니다.</h3>
            </section>
          ) : (
            <div className={styles['tableWrap']}>
              <table className={`${styles['table']} ${styles['popupTable']}`}>
                <thead>
                  <tr>
                    <th scope='col'>팝업</th>
                    <th scope='col'>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {popups.map((popup) => {
                    const isCurrentDisplayPopup = currentDisplayPopup?.id === popup.id;

                    return (
                      <tr key={popup.id}>
                        <td>
                          <div className={styles['cellStack']}>
                            <span className={styles['noticeTitleRow']}>
                              <span className={styles['cellPrimary']}>
                                {popup.altText || '홈 팝업'}
                              </span>
                              {isCurrentDisplayPopup ? (
                                <span className={styles['badgeSuccess']}>노출중</span>
                              ) : popup.published ? (
                                <span className={styles['badge']}>예약/기간 외</span>
                              ) : (
                                <span className={styles['badgeDanger']}>중지</span>
                              )}
                            </span>
                            <span className={styles['cellSecondary']}>
                              {formatVisibilityWindow(popup)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={styles['tableActionGroup']}>
                            <button
                              className={styles['tableActionButton']}
                              onClick={() => {
                                setPreviewPopupId(popup.id);
                              }}
                              type='button'
                            >
                              보기
                            </button>
                            <button
                              className={styles['tableActionButton']}
                              onClick={() => {
                                startEdit(popup);
                              }}
                              type='button'
                            >
                              수정
                            </button>
                            {popup.published ? (
                              <button
                                className={styles['tableActionButton']}
                                onClick={() => {
                                  unpublishMutation.mutate(popup.id);
                                }}
                                type='button'
                              >
                                중지
                              </button>
                            ) : (
                              <button
                                className={styles['tableActionButton']}
                                onClick={() => {
                                  publishMutation.mutate(popup.id);
                                }}
                                type='button'
                              >
                                노출
                              </button>
                            )}
                            <button
                              className={styles['tableActionButtonDanger']}
                              onClick={() => {
                                if (!window.confirm('이 팝업을 삭제하시겠습니까?')) {
                                  return;
                                }

                                deleteMutation.mutate(popup.id);
                              }}
                              type='button'
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      ) : null}

      {previewPopup ? (
        <Modal
          onClose={() => {
            setPreviewPopupId(null);
          }}
          size='lg'
          title={previewPopup.altText || '팝업 미리보기'}
        >
          <div className={styles['popupPreviewModalBody']}>
            <div className={styles['metaRow']}>
              {currentDisplayPopup?.id === previewPopup.id ? (
                <span className={styles['badgeSuccess']}>노출중</span>
              ) : previewPopup.published ? (
                <span className={styles['badge']}>예약/기간 외</span>
              ) : (
                <span className={styles['badgeDanger']}>중지</span>
              )}
            </div>

            <div className={styles['thumbnailPreview']}>
              <img
                alt={previewPopup.altText || '팝업 이미지'}
                className={styles['thumbnailPreviewImage']}
                src={previewPopup.imageUrl}
              />
            </div>

            <div className={styles['cellStack']}>
              <p className={styles['metaText']}>{previewPopup.altText || '홈 팝업'}</p>
              <p className={styles['metaText']}>{formatVisibilityWindow(previewPopup)}</p>
            </div>

            <div className={styles['actionRow']}>
              <Button
                onClick={() => {
                  startEdit(previewPopup);
                }}
                size='sm'
                type='button'
                variant='secondary'
              >
                수정
              </Button>
              {previewPopup.published ? (
                <Button
                  disabled={unpublishMutation.isPending}
                  onClick={() => {
                    unpublishMutation.mutate(previewPopup.id);
                  }}
                  size='sm'
                  type='button'
                  variant='secondary'
                >
                  중지
                </Button>
              ) : (
                <Button
                  disabled={publishMutation.isPending}
                  onClick={() => {
                    publishMutation.mutate(previewPopup.id);
                  }}
                  size='sm'
                  type='button'
                >
                  노출
                </Button>
              )}
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
};

export default AdminPopupsSection;
