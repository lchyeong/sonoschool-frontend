import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import HomeFeaturedReviewsSection from '@/pages/HomePage/HomeFeaturedReviewsSection/HomeFeaturedReviewsSection';

describe('HomeFeaturedReviewsSection', () => {
  it('links review cards to public program detail paths', () => {
    render(
      <MemoryRouter>
        <HomeFeaturedReviewsSection />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /대표 후기 자세히 보기/ })).toHaveAttribute(
      'href',
      '/programs/doctor-course/internal-medicine/abdomen-practice',
    );
    expect(screen.getByRole('link', { name: /FAST 실습에서 손목 각도보다/ })).toHaveAttribute(
      'href',
      '/programs/doctor-course/pocus/fast/fast-intensive-workshop',
    );
    expect(screen.getByRole('link', { name: /짧은 증례 브리핑이 갑상선/ })).toHaveAttribute(
      'href',
      '/programs/general-course/neck-course/thyroid-basic-scan-6-weeks/thyroid-nodule-reading-practice-4-weeks',
    );
    expect(screen.getByRole('link', { name: /어깨 스캔 반복 실습에서/ })).toHaveAttribute(
      'href',
      '/programs/general-course/musculoskeletal/shoulder-ultrasound-basic-6-weeks',
    );
  });
});
