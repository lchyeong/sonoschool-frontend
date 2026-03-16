import { describe, expect, it } from 'vitest';

import { routePaths } from '@/routes/routeRegistry';
import { buildHeaderNavigation } from '@/utils/buildHeaderNavigation';

describe('buildHeaderNavigation', () => {
  it('places fixed menus around dynamic items in the correct order', () => {
    const navigation = buildHeaderNavigation([
      { id: 'dynamic-1', label: '동적 메뉴 1', to: '/dynamic-1' },
      { id: 'dynamic-2', label: '동적 메뉴 2', to: '/dynamic-2' },
    ]);

    expect(navigation.map((item) => item.label)).toEqual([
      '소노스쿨',
      '동적 메뉴 1',
      '동적 메뉴 2',
      '교육후기',
      '공지사항',
      'Q&A',
      '자료실',
    ]);
    expect(navigation[0]?.to).toBe(routePaths.home);
    expect(navigation.at(-4)?.to).toBe(routePaths.reviews);
    expect(navigation.at(-3)?.to).toBe(routePaths.notices);
    expect(navigation.at(-2)?.to).toBe(routePaths.qna);
    expect(navigation.at(-1)?.to).toBe(routePaths.resources);
  });

  it('limits dynamic items to six while preserving order', () => {
    const navigation = buildHeaderNavigation(
      Array.from({ length: 8 }, (_, index) => ({
        id: `dynamic-${String(index + 1)}`,
        label: `동적 메뉴 ${String(index + 1)}`,
        to: `/dynamic-${String(index + 1)}`,
      })),
    );

    expect(navigation).toHaveLength(11);
    expect(navigation.slice(1, 7).map((item) => item.label)).toEqual([
      '동적 메뉴 1',
      '동적 메뉴 2',
      '동적 메뉴 3',
      '동적 메뉴 4',
      '동적 메뉴 5',
      '동적 메뉴 6',
    ]);
  });

  it('preserves optional descriptions across nested navigation items', () => {
    const navigation = buildHeaderNavigation([
      {
        id: 'dynamic-1',
        label: '동적 메뉴 1',
        to: '/dynamic-1',
        description: '1뎁스 소개글',
        children: [
          {
            id: 'dynamic-1-child',
            label: '동적 메뉴 2',
            to: '/dynamic-1/child',
            description: '2뎁스 소개글',
            children: [
              {
                id: 'dynamic-1-grandchild',
                label: '동적 메뉴 3',
                to: '/dynamic-1/child/grandchild',
                description: '3뎁스 소개글',
              },
            ],
          },
        ],
      },
    ]);

    expect(navigation[1]?.description).toBe('1뎁스 소개글');
    expect(navigation[1]?.children?.[0]?.description).toBe('2뎁스 소개글');
    expect(navigation[1]?.children?.[0]?.children?.[0]?.description).toBe('3뎁스 소개글');
  });
});
