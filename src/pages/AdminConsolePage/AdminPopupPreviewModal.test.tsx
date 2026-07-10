import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import styles from './AdminConsolePage.module.scss';
import AdminPopupPreviewModal from './AdminPopupPreviewModal';

afterEach(() => {
  cleanup();
});

describe('AdminPopupPreviewModal', () => {
  it('renders the popup image with the original-size preview layout', () => {
    render(
      <AdminPopupPreviewModal
        displayedPopupIds={[2]}
        isPublishPending={false}
        isUnpublishPending={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onPublish={vi.fn()}
        onUnpublish={vi.fn()}
        popup={{
          altText: '원본 크기 팝업 샘플',
          createdAt: '2026-07-11T00:00:00Z',
          id: 2,
          imageAssetId: 27,
          imageUrl: '/popup-original.png',
          published: true,
          sortOrder: 0,
          updatedAt: '2026-07-11T00:00:00Z',
          visibleEndAt: null,
          visibleStartAt: null,
        }}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: '원본 크기 팝업 샘플' });
    const image = screen.getByRole('img', { name: '원본 크기 팝업 샘플' });
    const overlay = dialog.parentElement;

    expect(dialog).toHaveClass(styles['popupPreviewModalPanel']);
    expect(overlay).toHaveClass(styles['popupPreviewModalOverlay']);
    expect(image).toHaveClass(styles['thumbnailPreviewImage']);
    expect(image.parentElement).toHaveClass(styles['thumbnailPreview']);
  });
});
