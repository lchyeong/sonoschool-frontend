import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from '@/pages/HomePage/HomePage';

describe('HomePage', () => {
  it('renders template title', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'React CSR 템플릿' })).toBeInTheDocument();
  });
});
