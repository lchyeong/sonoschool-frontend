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

describe('AdminRichTextEditor 문단과 목록', () => {
  it('제목 단계와 목록 도구의 범례를 명확하게 표시한다', async () => {
    render(<AdminRichTextEditor onChange={vi.fn()} value='<p>공지 본문</p>' />);

    expect(
      await screen.findByRole('button', { name: '제목 1 · 큰 제목 (32px)' }),
    ).toHaveTextContent('제목 1');
    expect(screen.getByRole('button', { name: '제목 2 · 중간 제목 (24px)' })).toHaveTextContent(
      '제목 2',
    );
    expect(screen.getByRole('button', { name: '글머리 목록' })).toHaveTextContent('글머리');
    expect(screen.getByRole('button', { name: '번호 목록' })).toHaveTextContent('번호');
    expect(screen.getByRole('button', { name: '목록 내어쓰기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '목록 들여쓰기' })).toBeDisabled();
  });

  it('제목 1과 제목 2를 실제 제목 태그로 적용한다', async () => {
    const onChange = vi.fn();
    render(<AdminRichTextEditor onChange={onChange} value='<p>공지 본문</p>' />);

    fireEvent.click(await screen.findByRole('button', { name: '제목 1 · 큰 제목 (32px)' }));
    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]).toContain('<h1>공지 본문</h1>');
    });

    fireEvent.click(screen.getByRole('button', { name: '제목 2 · 중간 제목 (24px)' }));
    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]).toContain('<h2>공지 본문</h2>');
    });
  });

  it('일반 본문에 글머리 목록을 적용한다', async () => {
    const onChange = vi.fn();
    render(<AdminRichTextEditor onChange={onChange} value='<p>공지 본문</p>' />);

    fireEvent.click(await screen.findByRole('button', { name: '글머리 목록' }));

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]).toContain('<ul><li><p>공지 본문</p></li></ul>');
    });
  });

  it('표 셀 안에 번호 목록을 적용한다', async () => {
    const onChange = vi.fn();
    render(
      <AdminRichTextEditor
        onChange={onChange}
        value='<table><tbody><tr><td><p>표 셀</p></td></tr></tbody></table>'
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: '번호 목록' }));

    await waitFor(() => {
      const latestContent = onChange.mock.calls.at(-1)?.[0] as string | undefined;
      expect(latestContent).toContain('<td');
      expect(latestContent).toContain('<ol><li><p>표 셀</p></li></ol>');
    });
  });
});

describe('AdminRichTextEditor 글꼴과 폰트 사이즈', () => {
  it('실제 기본 글꼴과 기본 폰트 사이즈를 명확하게 표시한다', async () => {
    render(<AdminRichTextEditor onChange={vi.fn()} value='<p>공지 본문</p>' />);

    expect(await screen.findByRole('combobox', { name: '글꼴' })).toHaveDisplayValue('Wanted Sans');
    expect(screen.getByRole('combobox', { name: '폰트 사이즈' })).toHaveDisplayValue('16px');
    expect(screen.getByRole('option', { name: '12px' })).toHaveValue('12px');
    expect(screen.getByRole('option', { name: '32px' })).toHaveValue('32px');
    expect(screen.getByRole('option', { name: '나눔명조' })).toHaveValue('Nanum Myeongjo');
    expect(screen.queryByRole('option', { name: '고정폭' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '깔끔한 고딕체' })).not.toBeInTheDocument();
  });

  it('선택한 글꼴과 폰트 사이즈를 본문에 적용한다', async () => {
    const onChange = vi.fn();
    render(<AdminRichTextEditor onChange={onChange} value='<p>공지 본문</p>' />);

    const editor = await screen.findByRole('textbox');
    fireEvent.focus(editor);
    fireEvent.keyDown(editor, { code: 'KeyA', ctrlKey: true, key: 'a' });

    fireEvent.change(await screen.findByRole('combobox', { name: '글꼴' }), {
      target: { value: 'Nanum Myeongjo' },
    });
    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]).toContain('font-family: &quot;Nanum Myeongjo&quot;');
    });

    fireEvent.change(screen.getByRole('combobox', { name: '폰트 사이즈' }), {
      target: { value: '24px' },
    });
    await waitFor(() => {
      const latestContent = onChange.mock.calls.at(-1)?.[0] as string | undefined;
      expect(latestContent).toContain('font-family: &quot;Nanum Myeongjo&quot;');
      expect(latestContent).toContain('font-size: 24px');
    });
  });
});
