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

const DEFAULT_COURSE_NAVIGATION: HeaderNavigationItem[] = [
  {
    id: 'fixed-doctor-courses',
    label: '의사과정',
    to: routePaths.programCatalog('doctor-course'),
    description: '의사 대상 오프라인 심화 과정을 전공과 학습 방식에 따라 확인할 수 있습니다.',
    children: [
      {
        id: 'fixed-doctor-internal-medicine',
        label: '내과과정',
        to: routePaths.programCatalog('doctor-course', 'internal-medicine'),
      },
      {
        id: 'fixed-doctor-cardiology',
        label: '심장과정',
        to: routePaths.programCatalog('doctor-course', 'cardiology'),
        description: '심초음파 기본부터 임상 판단까지 단계적으로 익히는 의사 대상 과정입니다.',
      },
      {
        id: 'fixed-doctor-msk-intensive',
        label: 'MSK 스캔집중과정',
        to: routePaths.programCatalog('doctor-course', 'msk-scan-intensive'),
        description: '근골격 초음파 스캔 실습을 짧은 기간에 집중적으로 훈련하는 과정입니다.',
      },
      {
        id: 'fixed-doctor-pocus',
        label: '응급/POCUS과정',
        to: routePaths.programCatalog('doctor-course', 'pocus'),
        children: [
          {
            id: 'fixed-doctor-pocus-fast',
            label: 'FAST 집중과정',
            to: routePaths.programCatalog('doctor-course', 'pocus', 'fast'),
          },
        ],
      },
    ],
    isFixed: true,
  },
  {
    id: 'fixed-general-courses',
    label: '일반과정',
    to: routePaths.programCatalog('general-course'),
    children: [
      {
        id: 'fixed-general-abdomen',
        label: '복부과정',
        to: routePaths.programCatalog('general-course', 'abdomen'),
      },
      {
        id: 'fixed-general-cardiology',
        label: '심장과정',
        to: routePaths.programCatalog('general-course', 'cardiology'),
      },
      {
        id: 'fixed-general-neck',
        label: '두경부과정',
        to: routePaths.programCatalog('general-course', 'neck-course'),
      },
      {
        id: 'fixed-general-msk',
        label: '근골격과정',
        to: routePaths.programCatalog('general-course', 'musculoskeletal'),
      },
      {
        id: 'fixed-general-women',
        label: '여성초음파과정',
        to: routePaths.programCatalog('general-course', 'women-ultrasound'),
      },
      {
        id: 'fixed-general-breast',
        label: '유방과정',
        to: routePaths.programCatalog('general-course', 'breast'),
      },
      {
        id: 'fixed-general-pocus',
        label: '응급/POCUS과정',
        to: routePaths.programCatalog('general-course', 'pocus'),
      },
    ],
    isFixed: true,
  },
  {
    id: 'fixed-online-courses',
    label: '온라인과정',
    to: routePaths.programCatalog('online-course'),
    children: [
      {
        id: 'fixed-online-theory-scan',
        label: '이론+스캔',
        to: routePaths.programCatalog('online-course', 'theory-and-scan'),
      },
      {
        id: 'fixed-online-ardms',
        label: 'ARDMS 시험 대비',
        to: routePaths.programCatalog('online-course', 'ardms-exam-prep'),
      },
      {
        id: 'fixed-online-hybrid-pediatric',
        label: '소아초음파 하이브리드 과정',
        to: routePaths.programCatalog('online-course', 'hybrid-course', 'pediatric-hybrid'),
      },
      {
        id: 'fixed-online-hybrid-abdomen-urinary',
        label: '상복부·비뇨기 하이브리드 과정',
        to: routePaths.programCatalog('online-course', 'hybrid-course', 'abdomen-urinary-hybrid'),
      },
      {
        id: 'fixed-online-hybrid-gi-tract',
        label: 'GI tract 실습 포함 과정',
        to: routePaths.programCatalog('online-course', 'hybrid-course', 'gi-tract-hybrid'),
      },
      {
        id: 'fixed-online-hybrid-neck',
        label: '두경부 실습 포함 과정',
        to: routePaths.programCatalog('online-course', 'hybrid-course', 'neck-hybrid'),
      },
    ],
    isFixed: true,
  },
];

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

  const fixedCoursePaths = new Set(DEFAULT_COURSE_NAVIGATION.map((item) => item.to));
  const dynamicNavigationByPath = new Map(
    dynamicNavigationItems.map((item) => [item.to, cloneNavigationItem(item)]),
  );

  const resolvedCourseNavigation = DEFAULT_COURSE_NAVIGATION.map((item) => {
    const dynamicMatch = dynamicNavigationByPath.get(item.to);

    if (!dynamicMatch) {
      return item;
    }

    return {
      ...dynamicMatch,
      id: item.id,
      isFixed: true,
      label: item.label,
      to: item.to,
    };
  });

  const remainingDynamicNavigation = dynamicNavigationItems
    .filter((item) => !fixedCoursePaths.has(item.to))
    .map(cloneNavigationItem);

  return [
    fixedLeadingNavigation,
    ...resolvedCourseNavigation,
    ...remainingDynamicNavigation,
    ...fixedTrailingNavigation,
  ];
};
