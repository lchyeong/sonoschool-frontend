import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

interface PopupFixture {
  height: number;
  id: number;
  width: number;
}

const POPUP_GAP = 12;

const buildSvgDataUrl = ({ height, id, width }: PopupFixture): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(
    height,
  )}" viewBox="0 0 ${String(width)} ${String(height)}"><rect width="100%" height="100%" fill="#${
    id % 2 === 0 ? '34b29f' : '31576f'
  }"/></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const mockActivePopups = async (fixtures: PopupFixture[], page: Page) => {
  await page.route('**/api/v1/popups/active', async (route) => {
    const corsHeaders = {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
    };

    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ headers: corsHeaders, status: 204 });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        data: fixtures.map((fixture, index) => ({
          altText: `레이아웃 검증 팝업 ${String(index + 1)}`,
          createdAt: '2026-07-11T00:00:00Z',
          id: fixture.id,
          imageAssetId: fixture.id + 1000,
          imageUrl: buildSvgDataUrl(fixture),
          published: true,
          sortOrder: index,
          updatedAt: '2026-07-11T00:00:00Z',
          visibleEndAt: null,
          visibleStartAt: null,
        })),
        timestamp: '2026-07-11T00:00:00Z',
      }),
      contentType: 'application/json',
      headers: corsHeaders,
      status: 200,
    });
  });
};

test('keeps a small popup at its original ratio without covering it with the action row', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await mockActivePopups([{ height: 80, id: 101, width: 100 }], page);

  await page.goto('/');

  const image = page.getByRole('img', { name: '레이아웃 검증 팝업 1' });
  const panel = page.getByRole('dialog', { name: '레이아웃 검증 팝업 1' });
  const actionRow = panel.getByRole('button', { name: '닫기' }).locator('..');
  await expect(image).toBeVisible();

  const imageBox = await image.boundingBox();
  const panelBox = await panel.boundingBox();
  const actionBox = await actionRow.boundingBox();

  expect(imageBox).not.toBeNull();
  expect(panelBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(imageBox?.width).toBeCloseTo(100, 0);
  expect(imageBox?.height).toBeCloseTo(80, 0);
  expect(panelBox?.width).toBeCloseTo(imageBox?.width ?? 0, 0);
  expect((imageBox?.width ?? 0) / (imageBox?.height ?? 1)).toBeCloseTo(100 / 80, 2);
  expect(panelBox?.x).toBeCloseTo(24, 0);
  expect(actionBox?.y ?? 0).toBeGreaterThanOrEqual((imageBox?.y ?? 0) + (imageBox?.height ?? 0));
  await expect(image).toHaveCSS('object-fit', 'contain');
});

test('places three original-ratio popups from left to right with a small fixed gap', async ({
  page,
}) => {
  const fixtures = [
    { height: 180, id: 201, width: 300 },
    { height: 300, id: 202, width: 240 },
    { height: 200, id: 203, width: 320 },
  ];
  await page.setViewportSize({ height: 900, width: 1440 });
  await mockActivePopups(fixtures, page);

  await page.goto('/');

  const images = fixtures.map((_, index) =>
    page.getByRole('img', { name: `레이아웃 검증 팝업 ${String(index + 1)}` }),
  );
  await expect(images[2]).toBeVisible();

  const boxes = await Promise.all(images.map((image) => image.boundingBox()));

  boxes.forEach((box, index) => {
    expect(box).not.toBeNull();
    expect(box?.width).toBeCloseTo(fixtures[index].width, 0);
    expect(box?.height).toBeCloseTo(fixtures[index].height, 0);
    expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(
      fixtures[index].width / fixtures[index].height,
      2,
    );
  });
  expect(boxes[1]?.x ?? 0).toBeCloseTo((boxes[0]?.x ?? 0) + (boxes[0]?.width ?? 0) + POPUP_GAP, 0);
  expect(boxes[2]?.x ?? 0).toBeCloseTo((boxes[1]?.x ?? 0) + (boxes[1]?.width ?? 0) + POPUP_GAP, 0);
});

test('keeps popup actions left-aligned in one row while narrow panels scale them down', async ({
  page,
}) => {
  const fixtures = [
    { height: 110, id: 251, width: 180 },
    { height: 120, id: 252, width: 160 },
    { height: 140, id: 253, width: 100 },
  ];
  await page.setViewportSize({ height: 700, width: 624 });
  await mockActivePopups(fixtures, page);

  await page.goto('/');

  const panels = fixtures.map((_, index) =>
    page.getByRole('dialog', { name: `레이아웃 검증 팝업 ${String(index + 1)}` }),
  );
  const actionRows = panels.map((panel) =>
    panel.getByRole('button', { name: '닫기' }).locator('..'),
  );
  const dismissControls = panels.map((panel) => panel.getByRole('checkbox').locator('..'));
  const closeButtons = panels.map((panel) => panel.getByRole('button', { name: '닫기' }));

  await expect(panels[2]).toBeVisible();

  const panelBoxes = await Promise.all(panels.map((panel) => panel.boundingBox()));
  const actionBoxes = await Promise.all(actionRows.map((actionRow) => actionRow.boundingBox()));
  const dismissBoxes = await Promise.all(
    dismissControls.map((dismissControl) => dismissControl.boundingBox()),
  );
  const closeBoxes = await Promise.all(
    closeButtons.map((closeButton) => closeButton.boundingBox()),
  );

  for (const [index, actionRow] of actionRows.entries()) {
    await expect(actionRow).toHaveCSS('display', 'grid');
    await expect(dismissControls[index]).toHaveCSS('justify-content', 'flex-start');
    await expect(dismissControls[index]).toHaveCSS('white-space', 'nowrap');
    expect(actionBoxes[index]?.width).toBeCloseTo(panelBoxes[index]?.width ?? 0, 0);
    expect(dismissBoxes[index]?.y).toBeCloseTo(closeBoxes[index]?.y ?? 0, 0);
    expect(dismissBoxes[index]?.height).toBeCloseTo(closeBoxes[index]?.height ?? 0, 0);
    expect((dismissBoxes[index]?.x ?? 0) + (dismissBoxes[index]?.width ?? 0)).toBeLessThanOrEqual(
      closeBoxes[index]?.x ?? 0,
    );
  }

  expect(actionBoxes[2]?.height ?? 0).toBeLessThan(actionBoxes[0]?.height ?? 0);
});

test('keeps a tall original at its natural size even when it extends beyond the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await mockActivePopups([{ height: 1600, id: 301, width: 1200 }], page);

  await page.goto('/');

  const image = page.getByRole('img', { name: '레이아웃 검증 팝업 1' });
  const panel = page.getByRole('dialog', { name: '레이아웃 검증 팝업 1' });
  const popupGrid = page.locator('[class*="popupGrid"]');
  await expect(image).toBeVisible();

  const imageBox = await image.boundingBox();
  const panelBox = await panel.boundingBox();

  expect(imageBox).not.toBeNull();
  expect(panelBox).not.toBeNull();
  expect(imageBox?.width).toBeCloseTo(1200, 0);
  expect(imageBox?.height).toBeCloseTo(1600, 0);
  expect((imageBox?.width ?? 0) / (imageBox?.height ?? 1)).toBeCloseTo(1200 / 1600, 2);
  expect(panelBox?.width).toBeCloseTo(imageBox?.width ?? 0, 0);
  expect((panelBox?.y ?? 0) + (panelBox?.height ?? 0)).toBeGreaterThan(900);
  await expect(popupGrid).toHaveCSS('overflow-y', 'visible');
});
