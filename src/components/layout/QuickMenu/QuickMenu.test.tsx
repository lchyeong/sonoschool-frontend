import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import QuickMenu from './QuickMenu';

const setWindowScrollY = (scrollY: number) => {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: scrollY,
    writable: true,
  });
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setWindowScrollY(0);
});

describe('QuickMenu', () => {
  it('hides quick menu actions at the top of the page', () => {
    setWindowScrollY(0);

    render(
      <MemoryRouter>
        <QuickMenu />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('complementary', { name: '빠른 메뉴' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '빠른 메뉴 열기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '페이지 상단으로 이동' })).not.toBeInTheDocument();
  });

  it('toggles the quick menu actions', () => {
    setWindowScrollY(120);

    render(
      <MemoryRouter>
        <QuickMenu />
      </MemoryRouter>,
    );

    const toggleButton = screen.getByRole('button', { name: '빠른 메뉴 열기' });

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggleButton);

    expect(screen.getByRole('button', { name: '빠른 메뉴 닫기' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('link', { name: '카톡채널' })).toHaveAttribute(
      'href',
      'https://pf.kakao.com/_xlxlxiqX',
    );
    expect(screen.getByRole('link', { name: '카톡채널' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: '카톡채널' })).toHaveAttribute('rel', 'noreferrer');
    expect(screen.getByRole('link', { name: '블로그' })).toHaveAttribute(
      'href',
      'https://blog.naver.com/sonoschool',
    );
    expect(screen.getByRole('link', { name: '위치안내' })).toHaveAttribute(
      'href',
      '/#home-location',
    );
  });

  it('keeps the top button separate from the quick menu toggle', () => {
    setWindowScrollY(120);

    const scrollToSpy = vi.fn();

    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollToSpy,
      writable: true,
    });

    render(
      <MemoryRouter>
        <QuickMenu />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '빠른 메뉴 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '페이지 상단으로 이동' }));

    expect(scrollToSpy).toHaveBeenCalledWith({
      behavior: 'smooth',
      left: 0,
      top: 0,
    });
    expect(screen.getByRole('button', { name: '빠른 메뉴 열기' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
