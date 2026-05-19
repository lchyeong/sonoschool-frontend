import { useNavigate } from 'react-router-dom';

import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import Button from '@/components/ui/Button/Button';
import SectionTabs from '@/components/ui/SectionTabs/SectionTabs';
import { routePaths } from '@/routes/routeRegistry';

import styles from './AdminConsolePage.module.scss';
import type { AnsweredFilterValue, ScopeFilterValue } from './adminQnaUtils';

interface AdminQnaFilterPanelProps {
  answeredFilter: AnsweredFilterValue;
  answeredFilterOptions: Array<{ count?: number; label: string; value: AnsweredFilterValue }>;
  keyword: string;
  onAnsweredFilterChange: (value: AnsweredFilterValue) => void;
  onKeywordChange: (value: string) => void;
  onScopeFilterChange: (value: ScopeFilterValue) => void;
  scopeFilter: ScopeFilterValue;
  scopeFilterOptions: Array<{ count?: number; label: string; value: ScopeFilterValue }>;
}

const AdminQnaFilterPanel = ({
  answeredFilter,
  answeredFilterOptions,
  keyword,
  onAnsweredFilterChange,
  onKeywordChange,
  onScopeFilterChange,
  scopeFilter,
  scopeFilterOptions,
}: AdminQnaFilterPanelProps) => {
  const navigate = useNavigate();

  return (
    <div className={styles['qnaFilterPanel']}>
      <div className={styles['qnaTabStack']}>
        <SectionTabs
          ariaLabel='Q&A 유형'
          items={scopeFilterOptions}
          onChange={onScopeFilterChange}
          value={scopeFilter}
        />
        <SectionTabs
          ariaLabel='답변 상태'
          items={answeredFilterOptions}
          onChange={onAnsweredFilterChange}
          value={answeredFilter}
        />
      </div>
      <div className={styles['qnaSearchActionRow']}>
        <UnifiedSearchBar
          className={styles['adminSearchBarWide']}
          inputAriaLabel='Q&A 검색'
          onChange={onKeywordChange}
          onSubmit={() => undefined}
          placeholder='제목, 내용, 작성자, 프로그램명 검색'
          value={keyword}
        />
        <Button
          onClick={() => {
            void navigate(routePaths.adminQnaNoticeCreate);
          }}
          type='button'
        >
          공지 작성
        </Button>
      </div>
    </div>
  );
};

export default AdminQnaFilterPanel;
