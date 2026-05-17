import type { CSSProperties } from 'react';

export interface ProgramImageCropInput {
  offsetX?: number | null | undefined;
  offsetY?: number | null | undefined;
  zoom?: number | null | undefined;
}

export interface ProgramImageCropValues {
  offsetX: number;
  offsetY: number;
  objectPosition: string;
  zoom: number;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const normalizeCropNumber = (
  value: number | null | undefined,
  fallback: number,
  min: number,
  max: number,
): number => {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;
};

export const getProgramImageCropStyle = (
  crop: ProgramImageCropInput,
): CSSProperties | undefined => {
  const { objectPosition, offsetX, offsetY, zoom } = normalizeProgramImageCrop(crop);

  if (offsetX === 0 && offsetY === 0 && zoom === 1) {
    return undefined;
  }

  return {
    objectPosition,
    transform: `scale(${String(zoom)})`,
    transformOrigin: objectPosition,
  };
};

export const normalizeProgramImageCrop = (crop: ProgramImageCropInput): ProgramImageCropValues => {
  const offsetX = normalizeCropNumber(crop.offsetX, 0, -100, 100);
  const offsetY = normalizeCropNumber(crop.offsetY, 0, -100, 100);
  const zoom = normalizeCropNumber(crop.zoom, 1, MIN_ZOOM, MAX_ZOOM);

  return {
    offsetX,
    offsetY,
    objectPosition: `${String(50 + offsetX / 2)}% ${String(50 + offsetY / 2)}%`,
    zoom,
  };
};
