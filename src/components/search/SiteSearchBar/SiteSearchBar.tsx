import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import searchIconSrc from '@/assets/icons/search.svg';
import {
  defaultSearchScope,
  getSearchScopeInputLabel,
  getSearchScopeLabel,
  getSearchScopePlaceholder,
  searchScopeOptions,
  type SearchScope,
} from '@/search/programSearchShared';
import { classNames } from '@/utils/classNames';

import styles from './SiteSearchBar.module.scss';

export interface SiteSearchBarProps {
  className?: string | undefined;
  initialQuery?: string | undefined;
  initialScope?: SearchScope | undefined;
  onSubmitSearch: (scope: SearchScope, searchQuery: string) => void;
  placeholder?: string | undefined;
  submitLabel?: string | undefined;
}

const SiteSearchBar = ({
  className,
  initialQuery = '',
  initialScope = defaultSearchScope,
  onSubmitSearch,
  placeholder,
  submitLabel,
}: SiteSearchBarProps) => {
  // 검색창의 현재 입력값을 로컬 상태로 관리합니다.
  // 사용자가 타이핑할 때마다 input을 즉시 다시 그리기 위해 필요합니다.
  const [inputValue, setInputValue] = useState(initialQuery);
  // 현재 선택된 검색 범위(강의, 후기, 공지 등)를 기억합니다.
  const [selectedScope, setSelectedScope] = useState<SearchScope>(initialScope);
  // 범위 드롭다운이 열려 있는지 여부입니다.
  const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);
  // 바깥 클릭 여부를 판단하기 위해 form DOM을 ref로 잡아 둡니다.
  const searchFormRef = useRef<HTMLFormElement | null>(null);
  // Esc로 닫았을 때 다시 포커스를 돌릴 트리거 버튼 ref입니다.
  const scopeTriggerButtonRef = useRef<HTMLButtonElement | null>(null);
  // 메뉴 패널과 input을 접근성 속성으로 연결할 고유 id입니다.
  const scopeMenuId = useId();
  const searchInputId = useId();

  // 선택된 카테고리에 맞춰 입력창 라벨과 placeholder를 동적으로 계산합니다.
  // 강의 외의 범위를 선택했을 때도 UI 문구가 현재 검색 대상과 맞게 유지됩니다.
  const searchInputLabel = getSearchScopeInputLabel(selectedScope);
  const resolvedPlaceholder = placeholder ?? getSearchScopePlaceholder(selectedScope);
  const resolvedSubmitLabel = submitLabel ?? `${getSearchScopeLabel(selectedScope)} 검색`;

  const closeScopeMenu = () => {
    setIsScopeMenuOpen(false);
  };

  // 부모가 URL 변경 등으로 초기 검색어를 바꾸면,
  // 내부 입력 상태도 그 값과 다시 맞춰 줍니다.
  useEffect(() => {
    setInputValue(initialQuery);
  }, [initialQuery]);

  // 부모가 현재 검색 범위를 바꾸면,
  // 드롭다운 내부의 선택 상태도 같은 값으로 동기화합니다.
  useEffect(() => {
    setSelectedScope(initialScope);
  }, [initialScope]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmitSearch(selectedScope, inputValue.trim());
  };

  // input의 change 이벤트 타입을 명시하면
  // 에디터와 ESLint가 값의 타입을 더 안정적으로 추적할 수 있습니다.
  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.currentTarget.value);
  };

  // 검색창 바깥을 누르면 범위 드롭다운을 닫습니다.
  const handleOutsidePointerDown = useEffectEvent((event: PointerEvent) => {
    // `event.target`를 바로 좁혀서 쓰면,
    // 일부 에디터 환경에서 발생하던 `error typed value` 경고를 피하면서도 타입을 안전하게 유지할 수 있습니다.
    if (!(event.target instanceof Node)) {
      return;
    }

    const searchFormElement = searchFormRef.current;
    if (!searchFormElement || searchFormElement.contains(event.target)) {
      return;
    }

    closeScopeMenu();
  });

  // Esc 키를 누르면 범위 드롭다운을 닫고,
  // 키보드 사용자가 다시 트리거 버튼으로 돌아갈 수 있게 포커스를 복구합니다.
  const handleEscapeKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return;
    }

    closeScopeMenu();
    scopeTriggerButtonRef.current?.focus();
  });

  // 드롭다운이 열려 있을 때만 전역 이벤트를 등록해,
  // 불필요한 리스너 유지와 예기치 않은 충돌을 줄입니다.
  useEffect(() => {
    if (!isScopeMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      handleOutsidePointerDown(event);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      handleEscapeKeyDown(event);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isScopeMenuOpen]);

  return (
    <form
      className={classNames(styles['searchForm'], className)}
      onSubmit={handleSubmit}
      ref={searchFormRef}
    >
      <div className={styles['scopeField']}>
        <button
          aria-controls={scopeMenuId}
          aria-expanded={isScopeMenuOpen}
          aria-haspopup='menu'
          className={classNames(
            styles['scopeTriggerButton'],
            isScopeMenuOpen && styles['scopeTriggerButtonOpen'],
          )}
          onClick={() => {
            setIsScopeMenuOpen((currentValue) => !currentValue);
          }}
          ref={scopeTriggerButtonRef}
          type='button'
        >
          <span className={styles['scopeTriggerContent']}>
            {/* 현재 선택된 검색 범위를 버튼 텍스트로 그대로 보여 줍니다. */}
            <span className={styles['scopeTriggerLabel']}>
              {getSearchScopeLabel(selectedScope)}
            </span>
            <span
              aria-hidden='true'
              className={classNames(
                styles['scopeChevronFrame'],
                isScopeMenuOpen && styles['scopeChevronFrameOpen'],
              )}
            >
              <svg
                className={styles['scopeChevron']}
                fill='none'
                focusable='false'
                viewBox='0 0 10 5'
              >
                <path
                  d='M0 0L5 5L10 0'
                  stroke='currentColor'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='1.5'
                />
              </svg>
            </span>
          </span>
        </button>

        <div
          aria-hidden={!isScopeMenuOpen}
          className={classNames(
            styles['scopeMenuPanel'],
            isScopeMenuOpen && styles['scopeMenuPanelOpen'],
          )}
          id={scopeMenuId}
        >
          <div className={styles['scopeMenuViewport']}>
            <ul className={styles['scopeOptionList']}>
              {searchScopeOptions.map((option) => {
                const isSelected = option.value === selectedScope;

                return (
                  <li className={styles['scopeOptionItem']} key={option.value}>
                    <button
                      aria-pressed={isSelected}
                      className={styles['scopeOptionButton']}
                      onClick={() => {
                        setSelectedScope(option.value);
                        closeScopeMenu();
                        scopeTriggerButtonRef.current?.focus();
                      }}
                      type='button'
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* 시각적으로는 숨기지만 스크린 리더에서는
      현재 선택된 카테고리에 맞는 검색창 이름을 읽어 주도록 합니다. */}
      <label className={styles['srOnly']} htmlFor={searchInputId}>
        {searchInputLabel}
      </label>

      <div className={styles['searchInputField']}>
        <div aria-hidden='true' className={styles['searchDivider']} />
        <input
          autoComplete='off'
          className={styles['searchInput']}
          id={searchInputId}
          name='q'
          onChange={handleSearchInputChange}
          placeholder={resolvedPlaceholder}
          type='search'
          value={inputValue}
        />
      </div>

      <button className={styles['submitButton']} type='submit'>
        <img alt='' aria-hidden='true' className={styles['submitIcon']} src={searchIconSrc} />
        <span className={styles['srOnly']}>{resolvedSubmitLabel}</span>
      </button>
    </form>
  );
};

export default SiteSearchBar;
