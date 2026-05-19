export interface PopupItem {
  id: number;
  imageAssetId: number;
  imageUrl: string;
  altText: string;
  published: boolean;
  visibleStartAt: string | null;
  visibleEndAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPopupCreatePayload {
  imageAssetId: number;
  altText: string;
  published: boolean;
  visibleStartAt: string | null;
  visibleEndAt: string | null;
  sortOrder: number;
}

export interface AdminPopupUpdatePayload {
  imageAssetId: number;
  altText: string;
  visibleStartAt: string | null;
  visibleEndAt: string | null;
  sortOrder: number;
}
