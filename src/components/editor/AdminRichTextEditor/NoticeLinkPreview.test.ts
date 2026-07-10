import { describe, expect, it, vi } from 'vitest';

import { parseNoticeLinkPreviewHtml, resolveNoticeLinkPreview } from './NoticeLinkPreview';

describe('NoticeLinkPreview', () => {
  it('Open Graph 메타데이터와 상대 이미지 주소를 카드 데이터로 변환한다', () => {
    const metadata = parseNoticeLinkPreviewHtml(
      `
        <html>
          <head>
            <meta property="og:site_name" content="테스트 서비스" />
            <meta property="og:title" content="새 공지" />
            <meta property="og:description" content="공지 설명입니다." />
            <meta property="og:url" content="/notices/10" />
            <meta property="og:image" content="/images/notice.png" />
          </head>
        </html>
      `,
      'https://example.com/original',
    );

    expect(metadata).toEqual({
      description: '공지 설명입니다.',
      domain: 'example.com',
      imageUrl: 'https://example.com/images/notice.png',
      siteName: '테스트 서비스',
      title: '새 공지',
      url: 'https://example.com/notices/10',
    });
  });

  it('SonoSchool 주소는 브라우저의 외부 HTML 조회 없이 사이트 OG 카드로 만든다', async () => {
    const fetcher = vi.fn<typeof fetch>();

    const metadata = await resolveNoticeLinkPreview('https://sonoschool.kr/', {
      fetcher,
      locationOrigin: 'http://localhost:5173',
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(metadata).toEqual({
      description: 'SONO SCHOOL은 초음파 교육과 학습 정보를 제공하는 교육 사이트입니다.',
      domain: 'sonoschool.kr',
      imageUrl: 'https://sonoschool.kr/SRDMS_OG.png',
      siteName: 'SONO SCHOOL',
      title: 'SONO SCHOOL',
      url: 'https://sonoschool.kr/',
    });
  });

  it('동일 출처 페이지는 직접 읽고 외부 사이트는 도메인 카드로 안전하게 대체한다', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('<title>내부 공지</title><meta name="description" content="내부 설명" />', {
        headers: { 'content-type': 'text/html; charset=utf-8' },
        status: 200,
      }),
    );

    const internal = await resolveNoticeLinkPreview('/notices/3', {
      fetcher,
      locationOrigin: 'https://service.example.com',
    });
    const external = await resolveNoticeLinkPreview('https://external.example.com/page', {
      fetcher,
      locationOrigin: 'https://service.example.com',
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(internal?.title).toBe('내부 공지');
    expect(internal?.description).toBe('내부 설명');
    expect(external).toMatchObject({
      domain: 'external.example.com',
      imageUrl: null,
      title: 'external.example.com',
    });
  });

  it('카드에 사용할 수 없는 프로토콜은 거부한다', async () => {
    await expect(resolveNoticeLinkPreview('mailto:help@example.com')).resolves.toBeNull();
    await expect(resolveNoticeLinkPreview('javascript:alert(1)')).resolves.toBeNull();
  });
});
