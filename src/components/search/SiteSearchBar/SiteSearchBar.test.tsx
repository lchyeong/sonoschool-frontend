import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SiteSearchBar from '@/components/search/SiteSearchBar/SiteSearchBar';

afterEach(() => {
  cleanup();
});

describe('SiteSearchBar', () => {
  it('opens the scope dropdown and submits the selected scope', () => {
    const handleSubmitSearch = vi.fn();

    render(<SiteSearchBar onSubmitSearch={handleSubmitSearch} />);

    fireEvent.click(screen.getByRole('button', { name: '강의' }));

    expect(screen.queryByRole('button', { name: '교육후기' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '공지사항' }));

    const noticeSearchInput = screen.getByRole('searchbox', { name: '공지사항 검색' });

    expect(noticeSearchInput).toHaveAttribute(
      'placeholder',
      '모집 일정, 준비물, 신청 안내처럼 확인하고 싶은 내용을 입력해 주세요.',
    );

    fireEvent.change(noticeSearchInput, {
      target: { value: '모집' },
    });
    fireEvent.click(screen.getByRole('button', { name: '공지사항 검색' }));

    expect(handleSubmitSearch).toHaveBeenCalledWith('notice', '모집');
  });
});
