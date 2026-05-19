import type { PopupItem } from '@/types/popup';

export interface PopupFormState {
  imageAlt: string;
  imageAssetId: number | null;
  imagePreviewObjectUrl: string | null;
  imageUrl: string;
  pendingImageFile: File | null;
  published: boolean;
  sortOrder: number;
}

export type PopupAdminTab = 'form' | 'list';

const POPUP_IMAGE_MAX_WIDTH = 1200;
const POPUP_IMAGE_MAX_HEIGHT = 1600;
const POPUP_IMAGE_WEBP_QUALITY = 0.82;

export const createEmptyPopupForm = (sortOrder = 0): PopupFormState => ({
  imageAlt: '',
  imageAssetId: null,
  imagePreviewObjectUrl: null,
  imageUrl: '',
  pendingImageFile: null,
  published: true,
  sortOrder,
});

export const createPopupFormState = (popup?: PopupItem | null): PopupFormState => {
  if (!popup) {
    return createEmptyPopupForm();
  }

  return {
    imageAlt: popup.altText,
    imageAssetId: popup.imageAssetId,
    imagePreviewObjectUrl: null,
    imageUrl: popup.imageUrl,
    pendingImageFile: null,
    published: popup.published,
    sortOrder: popup.sortOrder,
  };
};

export const formatPopupDisplayDate = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${String(year)}.${month}.${day}`;
};

export const buildPopupLabelFromFilename = (filename: string): string => {
  return filename.replace(/\.[^.]+$/, '').trim() || '홈 팝업';
};

export const formatVisibilityWindow = (popup: PopupItem): string => {
  if (!popup.visibleStartAt && !popup.visibleEndAt) {
    return '상시 노출';
  }

  if (popup.visibleStartAt && popup.visibleEndAt) {
    return `${formatPopupDisplayDate(popup.visibleStartAt)} ~ ${formatPopupDisplayDate(
      new Date(Date.parse(popup.visibleEndAt) - 1).toISOString(),
    )}`;
  }

  if (popup.visibleStartAt) {
    return `${formatPopupDisplayDate(popup.visibleStartAt)}부터`;
  }

  const visibleEndAt = popup.visibleEndAt;
  if (!visibleEndAt) {
    return '상시 노출';
  }

  return `${formatPopupDisplayDate(new Date(Date.parse(visibleEndAt) - 1).toISOString())}까지`;
};

export const getNextPopupSortOrder = (popups: PopupItem[]): number => {
  if (!popups.length) {
    return 0;
  }

  return Math.max(...popups.map((popup) => popup.sortOrder)) + 1;
};

export const isPopupVisibleNow = (popup: PopupItem, now = Date.now()): boolean => {
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

export const comparePopupDisplayOrder = (left: PopupItem, right: PopupItem): number => {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
};

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

export const optimizePopupImageFile = async (file: File): Promise<File> => {
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
