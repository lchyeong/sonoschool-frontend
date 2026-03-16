import { routePaths } from '@/routes/routeRegistry';
import type { SiteNavigationItem } from '@/types/siteNavigation';
export interface HeaderNavigationItem extends SiteNavigationItem {
  isFixed?: boolean | undefined;
}

const cloneNavigationItem = (item: SiteNavigationItem): HeaderNavigationItem => {
  return {
    ...item,
    children: item.children?.map(cloneNavigationItem),
  };
};

export const buildHeaderNavigation = (
  dynamicNavigationItems: readonly SiteNavigationItem[],
): HeaderNavigationItem[] => {
  const fixedLeadingNavigation: HeaderNavigationItem = {
    id: 'fixed-home',
    label: '소노스쿨',
    to: routePaths.home,
    isFixed: true,
  };

  const fixedTrailingNavigation: HeaderNavigationItem[] = [
    {
      id: 'fixed-reviews',
      label: '교육후기',
      to: routePaths.reviews,
      isFixed: true,
    },
    {
      id: 'fixed-notices',
      label: '공지사항',
      to: routePaths.notices,
      isFixed: true,
    },
    {
      id: 'fixed-qna',
      label: 'Q&A',
      to: routePaths.qna,
      isFixed: true,
    },
    {
      id: 'fixed-resources',
      label: '자료실',
      to: routePaths.resources,
      isFixed: true,
    },
  ];

  return [
    fixedLeadingNavigation,
    // 서버에서 받은 동적 메뉴는 최대 6개까지만 사용합니다.
    // 헤더 폭과 레이아웃을 보호하기 위한 제한입니다.
    // `slice(0, 6)`은 원본 배열을 자르되 원본 자체는 바꾸지 않습니다.
    // 그 뒤 `map(cloneNavigationItem)`으로 각 항목을 안전하게 복사합니다.
    ...dynamicNavigationItems.slice(0, 6).map(cloneNavigationItem),
    ...fixedTrailingNavigation,
  ];
};
