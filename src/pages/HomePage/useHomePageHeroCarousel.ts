import { useState } from 'react';

interface UseHomePageHeroCarouselOptions {
  slideCount: number;
}

export const useHomePageHeroCarousel = ({ slideCount }: UseHomePageHeroCarouselOptions) => {
  // 현재 "선택된" 슬라이드 인덱스를 기억합니다.
  // 숫자 0은 첫 번째 슬라이드를 뜻합니다.
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // 서버 응답이 바뀌어 슬라이드 개수가 줄어도 안전하게 렌더링할 수 있도록,
  // 현재 인덱스가 범위를 벗어나면 첫 슬라이드로 되돌립니다.
  const displayedSlideIndex = activeSlideIndex < slideCount ? activeSlideIndex : 0;
  // 슬라이드가 2개 이상일 때만 이전/다음 이동이 의미가 있습니다.
  const canNavigate = slideCount > 1;

  // `direction`은 -1(이전) 또는 1(다음)만 받을 수 있게 타입으로 제한합니다.
  const handleMoveSlide = (direction: -1 | 1) => {
    // 슬라이드가 하나도 없으면 이동 계산을 하지 않습니다.
    if (!slideCount) {
      return;
    }

    setActiveSlideIndex((currentIndex) => {
      // `%` 연산을 이용해 마지막 슬라이드 다음에는 처음으로,
      // 첫 슬라이드 이전에는 마지막으로 자연스럽게 순환시킵니다.
      return (currentIndex + direction + slideCount) % slideCount;
    });
  };

  // progress bar 애니메이션이 끝났을 때 자동으로 다음 슬라이드로 넘깁니다.
  const handleProgressAnimationEnd = () => {
    if (!canNavigate) {
      return;
    }

    handleMoveSlide(1);
  };

  return {
    displayedSlideIndex,
    handleMoveSlide,
    handleProgressAnimationEnd,
  };
};
