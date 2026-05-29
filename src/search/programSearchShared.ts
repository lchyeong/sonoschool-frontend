export const searchScopeValues = ['lecture', 'notice', 'qna', 'resource'] as const;

export type SearchScope = (typeof searchScopeValues)[number];

export interface SearchScopeOption {
  label: string;
  value: SearchScope;
}

interface SearchScopeMetadata {
  browseDescription: string;
  inputLabel: string;
  label: string;
  placeholder: string;
}

// 검색 범위별 메타데이터를 한 곳에 모아 두면,
// 드롭다운 라벨, 입력창 라벨, placeholder, 안내 문구를 여러 화면에서 일관되게 재사용할 수 있습니다.
const searchScopeMetadataMap = {
  lecture: {
    browseDescription:
      '강의 영역의 제목, 소개 문구, 카테고리, 키워드를 기준으로 원하는 프로그램을 찾아보실 수 있습니다.',
    inputLabel: '강의 프로그램 검색',
    label: '강의',
    placeholder: '강의명, 주제, 부위처럼 배우고 싶은 내용을 입력해 주세요.',
  },
  notice: {
    browseDescription:
      '공지사항 영역의 제목, 안내 문구, 카테고리, 키워드를 기준으로 필요한 소식을 찾아보실 수 있습니다.',
    inputLabel: '공지사항 검색',
    label: '공지사항',
    placeholder: '모집 일정, 준비물, 신청 안내처럼 확인하고 싶은 내용을 입력해 주세요.',
  },
  qna: {
    browseDescription:
      'Q&A 영역의 제목, 질문 설명, 카테고리, 키워드를 기준으로 비슷한 질문과 답변을 찾아보실 수 있습니다.',
    inputLabel: 'Q&A 검색',
    label: 'Q&A',
    placeholder: '질문 제목, 검사 포인트, 증상처럼 궁금한 내용을 입력해 주세요.',
  },
  resource: {
    browseDescription:
      '자료실 영역의 제목, 자료 설명, 카테고리, 키워드를 기준으로 필요한 다운로드 자료를 찾아보실 수 있습니다.',
    inputLabel: '자료실 검색',
    label: '자료실',
    placeholder: '체크리스트, 템플릿, 가이드처럼 찾고 싶은 자료명을 입력해 주세요.',
  },
} as const satisfies Record<SearchScope, SearchScopeMetadata>;

export const searchScopeOptions: ReadonlyArray<SearchScopeOption> = searchScopeValues.map(
  (value) => {
    return {
      label: searchScopeMetadataMap[value].label,
      value,
    };
  },
);

export const defaultSearchScope: SearchScope = 'lecture';

export const isSearchScope = (value: string): value is SearchScope => {
  return searchScopeValues.includes(value as SearchScope);
};

export const getSearchScopeLabel = (scope: SearchScope): string => {
  return searchScopeMetadataMap[scope].label;
};

export const getSearchScopeInputLabel = (scope: SearchScope): string => {
  return searchScopeMetadataMap[scope].inputLabel;
};

export const getSearchScopePlaceholder = (scope: SearchScope): string => {
  return searchScopeMetadataMap[scope].placeholder;
};

export const getSearchScopeBrowseDescription = (scope: SearchScope): string => {
  return searchScopeMetadataMap[scope].browseDescription;
};
