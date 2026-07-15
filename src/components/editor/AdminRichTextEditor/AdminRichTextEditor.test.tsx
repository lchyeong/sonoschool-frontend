import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AdminRichTextEditor from './AdminRichTextEditor';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AdminRichTextEditor 링크 UI', () => {
  it('링크 버튼을 누르면 기존 주소 입력창을 사용한다', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);
    render(<AdminRichTextEditor onChange={vi.fn()} value='<p>공지 본문</p>' />);

    fireEvent.click(await screen.findByRole('button', { name: '링크 넣기' }));

    expect(promptSpy).toHaveBeenCalledWith('링크 주소를 입력해 주세요.', '');
    expect(screen.queryByRole('textbox', { name: '링크 주소' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '미리보기 카드 삽입' })).not.toBeInTheDocument();
  });
});

describe('AdminRichTextEditor 표 삽입', () => {
  it('표 삽입 시 첫 행을 헤더 셀로 만든다', async () => {
    const onChange = vi.fn();
    render(<AdminRichTextEditor onChange={onChange} value='<p>공지 본문</p>' />);

    fireEvent.click(await screen.findByRole('button', { name: '표 넣기' }));

    await waitFor(() => {
      const latestContent = onChange.mock.calls.at(-1)?.[0] as string | undefined;
      expect(latestContent).toContain('<th');
      expect(latestContent).toContain('<td');
    });
  });

  it('커서가 표 안에 있으면 중첩 표 삽입 버튼을 비활성화한다', async () => {
    render(
      <AdminRichTextEditor
        onChange={vi.fn()}
        value='<table><tbody><tr><td><p>표 셀</p></td></tr></tbody></table>'
      />,
    );

    expect(
      await screen.findByRole('button', { name: '표 안에는 표를 넣을 수 없습니다' }),
    ).toBeDisabled();
  });
});
