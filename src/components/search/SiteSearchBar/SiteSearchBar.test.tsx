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

    expect(screen.getByRole('button', { name: '교육후기' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '교육후기' }));

    const reviewSearchInput = screen.getByRole('searchbox', { name: '교육후기 검색' });

    expect(reviewSearchInput).toHaveAttribute(
      'placeholder',
      '후기 제목, 과정명, 만족도 키워드처럼 찾고 싶은 후기를 입력해 주세요.',
    );

    fireEvent.change(reviewSearchInput, {
      target: { value: '후기' },
    });
    fireEvent.click(screen.getByRole('button', { name: '교육후기 검색' }));

    expect(handleSubmitSearch).toHaveBeenCalledWith('review', '후기');
  });
});
