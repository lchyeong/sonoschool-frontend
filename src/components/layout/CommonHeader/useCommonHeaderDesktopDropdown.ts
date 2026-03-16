import type { RefObject } from 'react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import type { HeaderNavigationItem } from '@/utils/buildHeaderNavigation';

import { DESKTOP_DROPDOWN_ANIMATION_DURATION_MS } from './commonHeaderShared';

interface UseCommonHeaderDesktopDropdownOptions {
  headerRef: RefObject<HTMLElement | null>;
}

interface UseCommonHeaderDesktopDropdownResult {
  // 현재 열려 있는 1차 메뉴 id입니다.
  openedDesktopItemId: string | null;
  // 닫힘 애니메이션이 끝날 때까지 잠깐 DOM에 남겨 둘 메뉴 데이터입니다.
  renderedDesktopDropdownItem: HeaderNavigationItem | null;
  // CSS 기준으로 드롭다운이 "보이는 상태"인지 나타냅니다.
  isDesktopDropdownVisible: boolean;
  // 특정 메뉴를 여는 함수입니다.
  openDesktopMenu: (item: HeaderNavigationItem) => void;
  // 현재 열려 있는 메뉴를 닫는 함수입니다.
  closeDesktopMenu: () => void;
}

// 이 커스텀 훅은 "데스크톱 드롭다운 메뉴 상태"만 전담합니다.
// CommonHeader 본문에서 애니메이션 세부 구현을 숨기고,
// 상위 파일은 `열기`, `닫기`, `현재 열린 메뉴`만 읽을 수 있게 도와줍니다.
export const useCommonHeaderDesktopDropdown = ({
  headerRef,
}: UseCommonHeaderDesktopDropdownOptions): UseCommonHeaderDesktopDropdownResult => {
  // 닫힘 애니메이션이 끝난 뒤 DOM 제거를 예약하는 타이머 ref입니다.
  // `useRef`를 쓰는 이유는 값을 바꿔도 재렌더링이 필요 없기 때문입니다.
  const desktopDropdownCloseTimeoutRef = useRef<number | null>(null);
  // 열림 애니메이션을 다음 frame에 시작하기 위한 requestAnimationFrame id ref입니다.
  const desktopDropdownOpenFrameRef = useRef<number | null>(null);

  // 현재 논리적으로 어떤 1차 메뉴가 열려 있는지 id를 저장합니다.
  const [openedDesktopItemId, setOpenedDesktopItemId] = useState<string | null>(null);
  // 실제 드롭다운 DOM에 그릴 메뉴 데이터를 저장합니다.
  // 닫힘 애니메이션 중에도 내용이 바로 사라지지 않게 유지하는 데 필요합니다.
  const [renderedDesktopDropdownItem, setRenderedDesktopDropdownItem] =
    useState<HeaderNavigationItem | null>(null);
  // CSS transition 기준으로 드롭다운이 보이는 상태인지 관리합니다.
  const [isDesktopDropdownVisible, setIsDesktopDropdownVisible] = useState(false);

  // 이전에 예약된 타이머와 animation frame을 한 번에 정리하는 함수입니다.
  // 빠르게 다른 메뉴를 여닫을 때 오래된 예약 작업이 뒤늦게 실행되는 것을 막습니다.
  const clearDesktopDropdownAnimationHandles = () => {
    // 닫힘 타이머가 남아 있으면 취소합니다.
    if (desktopDropdownCloseTimeoutRef.current !== null) {
      window.clearTimeout(desktopDropdownCloseTimeoutRef.current);
      desktopDropdownCloseTimeoutRef.current = null;
    }

    // 열림 애니메이션 예약도 함께 취소합니다.
    if (desktopDropdownOpenFrameRef.current !== null) {
      window.cancelAnimationFrame(desktopDropdownOpenFrameRef.current);
      desktopDropdownOpenFrameRef.current = null;
    }
  };

  // 데스크톱 드롭다운을 여는 함수입니다.
  const openDesktopMenu = (item: HeaderNavigationItem) => {
    // 이전 메뉴에서 남아 있던 예약 작업을 먼저 비웁니다.
    clearDesktopDropdownAnimationHandles();
    // 실제 패널에 그릴 메뉴 내용을 저장합니다.
    setRenderedDesktopDropdownItem(item);
    // 어떤 메뉴가 열렸는지 id를 저장합니다.
    setOpenedDesktopItemId(item.id);

    // 이미 보이는 상태라면 다시 열림 애니메이션을 시작할 필요가 없습니다.
    if (isDesktopDropdownVisible) {
      return;
    }

    // DOM이 먼저 반영된 뒤 CSS transition이 자연스럽게 시작되도록
    // requestAnimationFrame을 두 번 기다립니다.
    desktopDropdownOpenFrameRef.current = window.requestAnimationFrame(() => {
      desktopDropdownOpenFrameRef.current = window.requestAnimationFrame(() => {
        setIsDesktopDropdownVisible(true);
        desktopDropdownOpenFrameRef.current = null;
      });
    });
  };

  // 데스크톱 드롭다운을 닫는 함수입니다.
  const closeDesktopMenu = () => {
    // 남아 있던 예약 작업을 먼저 정리합니다.
    clearDesktopDropdownAnimationHandles();
    // 논리적으로는 메뉴를 닫은 상태로 바꿉니다.
    setOpenedDesktopItemId(null);
    // 화면상 보이는 상태도 false로 바꿉니다.
    setIsDesktopDropdownVisible(false);

    // 현재 렌더링 중인 패널이 없다면 더 할 일이 없습니다.
    if (!renderedDesktopDropdownItem) {
      return;
    }

    // 닫힘 애니메이션이 끝난 뒤에만 DOM에서 제거해야
    // 사용자가 "부드럽게 닫힌다"고 느낄 수 있습니다.
    desktopDropdownCloseTimeoutRef.current = window.setTimeout(() => {
      setRenderedDesktopDropdownItem(null);
      desktopDropdownCloseTimeoutRef.current = null;
    }, DESKTOP_DROPDOWN_ANIMATION_DURATION_MS);
  };

  // 헤더 바깥을 클릭했을 때 메뉴를 닫는 이벤트 함수입니다.
  // `useEffectEvent` 덕분에 effect 안에서도 최신 close 함수와 상태를 안전하게 사용할 수 있습니다.
  const handleOutsidePointerDown = useEffectEvent((event: PointerEvent) => {
    // 클릭 대상이 실제 DOM 노드인지 먼저 확인합니다.
    const target = event.target;
    if (!(target instanceof Node)) return;

    // 클릭한 위치가 헤더 내부라면 닫지 않습니다.
    const headerElement = headerRef.current;
    if (!headerElement || headerElement.contains(target)) return;

    // 헤더 바깥 클릭일 때만 드롭다운을 닫습니다.
    closeDesktopMenu();
  });

  // 훅을 사용하는 컴포넌트가 사라질 때
  // 남아 있는 타이머와 animation frame을 정리합니다.
  useEffect(() => {
    return () => {
      if (desktopDropdownCloseTimeoutRef.current !== null) {
        window.clearTimeout(desktopDropdownCloseTimeoutRef.current);
      }

      if (desktopDropdownOpenFrameRef.current !== null) {
        window.cancelAnimationFrame(desktopDropdownOpenFrameRef.current);
      }
    };
  }, []);

  // 데스크톱 드롭다운이 실제로 열려 있을 때만
  // 전역 pointerdown 이벤트를 등록해 outside click을 감지합니다.
  useEffect(() => {
    if (!openedDesktopItemId) return;

    // add/removeEventListener에 같은 함수 참조를 쓰기 위해 래퍼 함수를 둡니다.
    const handlePointerDown = (event: PointerEvent) => {
      handleOutsidePointerDown(event);
    };

    // 브라우저 전체에서 pointerdown을 감지합니다.
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [openedDesktopItemId]);

  // 상위 컴포넌트가 필요한 값과 함수만 반환합니다.
  return {
    closeDesktopMenu,
    isDesktopDropdownVisible,
    openDesktopMenu,
    openedDesktopItemId,
    renderedDesktopDropdownItem,
  };
};
