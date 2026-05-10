import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import CommonFooter from '@/components/layout/CommonFooter/CommonFooter';
import { routePaths } from '@/routes/routeRegistry';

const FooterLocationIndicator = () => {
  const location = useLocation();

  return <div data-testid='footer-location'>{location.pathname}</div>;
};

afterEach(() => {
  cleanup();
});

describe('CommonFooter', () => {
  it('renders footer navigation, business information, and brand logo', () => {
    render(
      <MemoryRouter>
        <CommonFooter />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '소노스쿨' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '교육후기' })).toHaveAttribute(
      'href',
      routePaths.reviews,
    );
    expect(screen.getByRole('link', { name: '네이버블로그' })).toHaveAttribute(
      'href',
      'https://blog.naver.com/sonoschool',
    );
    expect(screen.getByText('139-17-02906')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '031-934-6224' })).toHaveAttribute(
      'href',
      'tel:0319346224',
    );
    expect(screen.getByRole('link', { name: 'sonoschool@naver.com' })).toHaveAttribute(
      'href',
      'mailto:sonoschool@naver.com',
    );
    expect(screen.getByText('2018-성남분당B-0062')).toBeInTheDocument();
    expect(
      screen.getByText('경기도 화성시 동탄구 동탄신리천로5길 79, 3832동 603호'),
    ).toBeInTheDocument();
    expect(screen.getByAltText('SONO SCHOOL 로고')).toBeInTheDocument();

    const legalLinks = screen.getByLabelText('푸터 정책 링크');

    expect(legalLinks).toHaveTextContent('이용약관개인정보처리방침');
  });

  it('navigates to the admin login page after five rapid clicks on the copyright text', () => {
    render(
      <MemoryRouter initialEntries={[routePaths.home]}>
        <CommonFooter />
        <FooterLocationIndicator />
      </MemoryRouter>,
    );

    const adminTriggerButton = screen.getByRole('button', {
      name: 'Copyright 2026 소노스쿨 국제초음파연수원. All right reserved. Built by newzest studio.',
    });

    fireEvent.click(adminTriggerButton);
    fireEvent.click(adminTriggerButton);
    fireEvent.click(adminTriggerButton);
    fireEvent.click(adminTriggerButton);
    fireEvent.click(adminTriggerButton);

    expect(screen.getByTestId('footer-location')).toHaveTextContent(routePaths.adminLogin);
  });
});
