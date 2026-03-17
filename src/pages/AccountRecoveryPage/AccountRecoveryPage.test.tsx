import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import AccountRecoveryPage from '@/pages/AccountRecoveryPage/AccountRecoveryPage';

describe('AccountRecoveryPage', () => {
  it('switches between recovery modes and keeps the submit action disabled', () => {
    render(
      <MemoryRouter>
        <AccountRecoveryPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: '아이디/비밀번호 찾기' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '아이디 찾기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '준비 중' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '비밀번호 재설정' }));

    expect(screen.getByRole('heading', { level: 2, name: '비밀번호 재설정' })).toBeInTheDocument();
    expect(screen.getByLabelText('아이디')).toBeInTheDocument();
  });
});
