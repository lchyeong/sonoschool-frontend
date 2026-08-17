import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import QuickMenu from './QuickMenu';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('QuickMenu', () => {
  it('shows the quick menu expanded without requiring page scroll', () => {
    render(
      <MemoryRouter>
        <QuickMenu />
      </MemoryRouter>,
    );

    expect(screen.getByRole('complementary', { name: '빠른 메뉴' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '빠른 메뉴 닫기' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: '페이지 상단으로 이동' })).toBeInTheDocument();
  });

  it('toggles the quick menu actions', () => {
    render(
      <MemoryRouter>
        <QuickMenu />
      </MemoryRouter>,
    );

    const toggleButton = screen.getByRole('button', { name: '빠른 메뉴 닫기' });

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggleButton);

    expect(screen.getByRole('button', { name: '빠른 메뉴 열기' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('link', { name: '카톡채널' })).not.toBeInTheDocument();
    expect(document.querySelector('[inert]')).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(screen.getByRole('button', { name: '빠른 메뉴 열기' }));

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
    expect(screen.getByRole('link', { name: '카페' })).toHaveAttribute(
      'href',
      'https://cafe.naver.com/sonoschool1',
    );
    expect(screen.getByRole('link', { name: '오픈채팅' })).toHaveAttribute(
      'href',
      'https://open.kakao.com/o/p1EtBkwi',
    );
    expect(screen.getByRole('link', { name: '오픈채팅' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: '오픈채팅' })).toHaveAttribute('rel', 'noreferrer');
  });

  it('keeps the top button separate from the quick menu toggle', () => {
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
