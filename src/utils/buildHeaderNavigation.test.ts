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
      '의사과정',
      '일반과정',
      '온라인과정',
      '동적 메뉴 1',
      '동적 메뉴 2',
      '교육후기',
      '공지사항',
      'Q&A',
      '자료실',
    ]);
    expect(navigation[0]?.to).toBe(routePaths.home);
    expect(navigation[1]?.to).toBe(routePaths.programCatalog('doctor-course'));
    expect(navigation[2]?.to).toBe(routePaths.programCatalog('general-course'));
    expect(navigation[3]?.to).toBe(routePaths.programCatalog('online-course'));
    expect(navigation.at(-4)?.to).toBe(routePaths.reviews);
    expect(navigation.at(-3)?.to).toBe(routePaths.notices);
    expect(navigation.at(-2)?.to).toBe(routePaths.qna);
    expect(navigation.at(-1)?.to).toBe(routePaths.resources);
  });

  it('keeps the three lecture root menus even when dynamic navigation is empty', () => {
    const navigation = buildHeaderNavigation([]);

    expect(navigation.map((item) => item.label)).toEqual([
      '소노스쿨',
      '의사과정',
      '일반과정',
      '온라인과정',
      '교육후기',
      '공지사항',
      'Q&A',
      '자료실',
    ]);
  });

  it('merges matching lecture roots with dynamic navigation data and keeps extra items after them', () => {
    const navigation = buildHeaderNavigation([
      {
        id: 'dynamic-doctor-course',
        label: '의사과정 실험값',
        to: routePaths.programCatalog('doctor-course'),
        description: '의사과정 설명',
        children: [
          {
            id: 'dynamic-doctor-child',
            label: '심장과정',
            to: '/programs/doctor-course/cardiology',
          },
        ],
      },
      {
        id: 'dynamic-general-course',
        label: '일반과정 실험값',
        to: routePaths.programCatalog('general-course'),
      },
      {
        id: 'dynamic-online-course',
        label: '온라인과정 실험값',
        to: routePaths.programCatalog('online-course'),
      },
      { id: 'dynamic-extra', label: '특별과정', to: '/special-course' },
    ]);

    expect(navigation.slice(0, 5).map((item) => item.label)).toEqual([
      '소노스쿨',
      '의사과정',
      '일반과정',
      '온라인과정',
      '특별과정',
    ]);
    expect(navigation[1]?.description).toBe('의사과정 설명');
    expect(navigation[1]?.children?.[0]?.label).toBe('심장과정');
    expect(navigation[1]?.isFixed).toBe(true);
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

    const dynamicItem = navigation.find((item) => item.id === 'dynamic-1');

    expect(dynamicItem?.description).toBe('1뎁스 소개글');
    expect(dynamicItem?.children?.[0]?.description).toBe('2뎁스 소개글');
    expect(dynamicItem?.children?.[0]?.children?.[0]?.description).toBe('3뎁스 소개글');
  });
});
