import type { CSSProperties } from 'react';

export interface AdminImageCropValue {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export const ADMIN_IMAGE_CROP_MIN_ZOOM = 0.25;
export const ADMIN_IMAGE_CROP_MAX_ZOOM = 2;

export const DEFAULT_ADMIN_IMAGE_CROP: AdminImageCropValue = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
};

export const normalizeAdminImageCrop = (
  value?: Partial<AdminImageCropValue> | null,
): AdminImageCropValue => {
  const offsetX =
    typeof value?.offsetX === 'number' && Number.isFinite(value.offsetX) ? value.offsetX : 0;
  const offsetY =
    typeof value?.offsetY === 'number' && Number.isFinite(value.offsetY) ? value.offsetY : 0;
  const zoom = typeof value?.zoom === 'number' && Number.isFinite(value.zoom) ? value.zoom : 1;

  return {
    offsetX: Math.max(-100, Math.min(100, offsetX)),
    offsetY: Math.max(-100, Math.min(100, offsetY)),
    zoom: Math.max(ADMIN_IMAGE_CROP_MIN_ZOOM, Math.min(ADMIN_IMAGE_CROP_MAX_ZOOM, zoom)),
  };
};

export const getAdminImageCropObjectStyle = (value: AdminImageCropValue): CSSProperties => {
  const crop = normalizeAdminImageCrop(value);
  const objectPosition = `${String(50 + crop.offsetX / 2)}% ${String(50 + crop.offsetY / 2)}%`;

  return {
    objectPosition,
    transform: `scale(${String(crop.zoom)})`,
    transformOrigin: objectPosition,
  };
};
