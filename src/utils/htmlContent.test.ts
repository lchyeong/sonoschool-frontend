import { describe, expect, it } from 'vitest';

import {
  normalizeRichTextHtmlForStorage,
  sanitizeRichTextHtml,
  sanitizeRichTextHtmlForDisplay,
} from './htmlContent';

describe('htmlContent rich text sanitizer', () => {
  it('편집기 표 너비 속성을 보존한다', () => {
    const sanitizedHtml = sanitizeRichTextHtml(`
      <table>
        <tbody>
          <tr>
            <td colwidth="120" style="text-align: right; vertical-align: middle; font-weight: 700;">제목</td>
            <td colwidth="180">내용</td>
          </tr>
        </tbody>
      </table>
    `);

    expect(sanitizedHtml).toContain('colwidth="120"');
    expect(sanitizedHtml).toContain('colwidth="180"');
    expect(sanitizedHtml).toContain('text-align: right');
    expect(sanitizedHtml).toContain('vertical-align: middle');
    expect(sanitizedHtml).toContain('font-weight: 700');
  });

  it('공지 상세 표시용 HTML에 편집기 컬럼 너비를 적용한다', () => {
    const displayHtml = sanitizeRichTextHtmlForDisplay(`
      <table>
        <tbody>
          <tr>
            <td colwidth="120">제목</td>
            <td colwidth="180">내용</td>
          </tr>
        </tbody>
      </table>
    `);
    const document = new DOMParser().parseFromString(displayHtml, 'text/html');
    const table = document.querySelector('table');
    const tableScroll = document.querySelector('[data-rich-text-table-scroll="true"]');

    expect(table?.style.width).toBe('300px');
    expect(table?.style.minWidth).toBe('300px');
    expect(table?.getAttribute('data-rich-text-column-widths')).toBe('true');
    expect(table?.querySelectorAll('col')).toHaveLength(2);
    expect(table?.querySelector('col')?.style.width).toBe('120px');
    expect(table?.querySelector('td')?.style.width).toBe('120px');
    expect(tableScroll?.getAttribute('aria-label')).toBe('표 영역');
    expect(tableScroll?.getAttribute('role')).toBe('region');
    expect(tableScroll?.getAttribute('tabindex')).toBe('0');
    expect(tableScroll?.firstElementChild).toBe(table);
  });

  it('저장 전 colgroup 컬럼 폭을 셀 colwidth로 연결한다', () => {
    const normalizedHtml = normalizeRichTextHtmlForStorage(`
      <table>
        <colgroup>
          <col style="width: 180px">
          <col style="width: 420px">
          <col style="width: 160px">
        </colgroup>
        <tbody>
          <tr>
            <th>구분</th>
            <th>준비서류</th>
            <th>내용</th>
          </tr>
          <tr>
            <td>여권사본</td>
            <td>영문이름의 철자, 이름 순서 또는</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    `);
    const document = new DOMParser().parseFromString(normalizedHtml, 'text/html');
    const table = document.querySelector('table');
    const firstHeaderCell = document.querySelector('th');
    const bodyCell = document.querySelector<HTMLTableCellElement>(
      'tr:nth-child(2) td:nth-child(2)',
    );

    expect(table?.style.width).toBe('760px');
    expect(table?.getAttribute('data-rich-text-column-widths')).toBeNull();
    expect(firstHeaderCell?.getAttribute('colwidth')).toBe('180');
    expect(bodyCell?.getAttribute('colwidth')).toBe('420');
    expect(bodyCell?.style.width).toBe('420px');
  });

  it('min-width만 있는 colgroup은 고정 컬럼 폭으로 저장하지 않는다', () => {
    const normalizedHtml = normalizeRichTextHtmlForStorage(`
      <table>
        <colgroup>
          <col style="min-width: 25px">
          <col style="min-width: 25px">
        </colgroup>
        <tbody>
          <tr>
            <th>준비서류</th>
            <th>내용</th>
          </tr>
        </tbody>
      </table>
    `);
    const document = new DOMParser().parseFromString(normalizedHtml, 'text/html');
    const table = document.querySelector('table');

    expect(table?.style.width).toBe('');
    expect(document.querySelector('th')?.getAttribute('colwidth')).toBeNull();
  });

  it('첫 행이 아닌 셀의 컬럼 너비도 공지 상세 표시용 HTML에 반영한다', () => {
    const displayHtml = sanitizeRichTextHtmlForDisplay(`
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>준비서류</th>
            <th>내용</th>
          </tr>
          <tr>
            <td colwidth="180">여권사본</td>
            <td colwidth="420">sdsd</td>
            <td colwidth="160"></td>
          </tr>
        </tbody>
      </table>
    `);
    const document = new DOMParser().parseFromString(displayHtml, 'text/html');
    const table = document.querySelector('table');
    const firstColumn = table?.querySelector<HTMLTableColElement>('col');
    const passportCell = document.querySelector<HTMLTableCellElement>('tr:nth-child(2) td');

    expect(table?.style.width).toBe('760px');
    expect(table?.querySelectorAll('col')).toHaveLength(3);
    expect(firstColumn?.style.width).toBe('180px');
    expect(passportCell?.style.width).toBe('180px');
    expect(passportCell?.style.minWidth).toBe('180px');
  });

  it('컬럼 너비 정보가 없는 표는 내용 기준 자동 레이아웃으로 남겨둔다', () => {
    const displayHtml = sanitizeRichTextHtmlForDisplay(`
      <table>
        <colgroup><col><col><col></colgroup>
        <tbody>
          <tr>
            <td>여권사본</td>
            <td>영문이름의 철자, 이름 순서 또는</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    `);
    const document = new DOMParser().parseFromString(displayHtml, 'text/html');
    const table = document.querySelector('table');

    expect(table?.getAttribute('data-rich-text-column-widths')).toBeNull();
    expect(table?.style.width).toBe('');
    expect(table?.querySelectorAll('col')).toHaveLength(3);
  });
});
