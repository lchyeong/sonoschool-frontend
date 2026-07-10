import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
};

const mockHeaderData = async (page: Page) => {
  await page.route('**/api/v1/navigation/programs', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ headers: corsHeaders, status: 204 });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        items: [
          { id: 'doctor', label: '의사과정', to: '/programs/doctor-course' },
          { id: 'general', label: '일반과정', to: '/programs/general-course' },
          { id: 'online', label: '온라인과정', to: '/programs/online-course' },
          { id: 'workshop', label: '워크숍과정', to: '/programs/workshop' },
          { id: 'certificate', label: '자격시험과정', to: '/programs/certificate' },
          { id: 'hospital', label: '병원출강과정', to: '/programs/hospital' },
        ],
      }),
      contentType: 'application/json',
      headers: corsHeaders,
      status: 200,
    });
  });

  await page.route('**/api/v1/popups/active', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ headers: corsHeaders, status: 204 });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({ data: [], timestamp: '2026-07-11T00:00:00Z' }),
      contentType: 'application/json',
      headers: corsHeaders,
      status: 200,
    });
  });
};

test('keeps the logo and login action inside the header across desktop widths', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1480 });
  await mockHeaderData(page);
  await page.goto('/');

  const header = page.getByRole('banner');
  const logo = header.getByRole('img', { name: 'SONO SCHOOL' });
  const login = header.getByRole('link', { name: '로그인' });
  const mobileMenuButton = header.getByRole('button', { name: '모바일 메뉴 열기' });
  const navigation = header.getByRole('navigation', { name: 'Primary' });
  const navigationLinkLocator = navigation.getByRole('link');

  await expect(logo).toBeVisible();
  await expect(login).toBeVisible();
  await expect(navigationLinkLocator).toHaveCount(10);

  const navigationLinks = await navigationLinkLocator.all();

  await page.setViewportSize({ height: 900, width: 1199 });
  await expect(mobileMenuButton).toBeVisible();
  await expect(login).toBeHidden();

  for (const width of [1200, 1280, 1379, 1380, 1440, 1480, 1536, 1600]) {
    await page.setViewportSize({ height: 900, width });

    await expect(login).toBeVisible();
    await expect(mobileMenuButton).toBeHidden();

    const headerBox = await header.boundingBox();
    const logoBox = await logo.boundingBox();
    const loginBox = await login.boundingBox();
    const navigationBox = await navigation.boundingBox();
    const navigationLinkBoxes = await Promise.all(
      navigationLinks.map(async (link) => link.boundingBox()),
    );

    expect(headerBox).not.toBeNull();
    expect(logoBox).not.toBeNull();
    expect(loginBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    expect(logoBox?.x ?? -1).toBeGreaterThanOrEqual(headerBox?.x ?? 0);
    expect((loginBox?.x ?? 0) + (loginBox?.width ?? 0)).toBeLessThanOrEqual(
      (headerBox?.x ?? 0) + (headerBox?.width ?? 0),
    );
    const areNavigationLinksContained = navigationLinkBoxes.every((linkBox) => {
      if (!linkBox || !navigationBox) return false;

      return (
        linkBox.x >= navigationBox.x &&
        linkBox.x + linkBox.width <= navigationBox.x + navigationBox.width
      );
    });

    expect(
      areNavigationLinksContained,
      `${String(width)}px에서 데스크톱 메뉴가 내비게이션 영역을 벗어나면 안 됩니다.`,
    ).toBe(true);
  }
});
