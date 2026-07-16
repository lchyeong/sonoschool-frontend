import DOMPurify from 'dompurify';

const MAX_TABLE_COLUMN_WIDTH = 3000;
const MIN_TABLE_COLUMN_WIDTH = 96;
const MAX_TABLE_SPAN = 50;

const parseHtml = (html: string): Document | null => {
  if (typeof DOMParser === 'undefined') {
    return null;
  }

  return new DOMParser().parseFromString(html, 'text/html');
};

const escapeHtmlAttribute = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

export const extractTextFromHtml = (html: string): string => {
  const document = parseHtml(html);

  if (!document) {
    return html.replace(/<[^>]+>/g, ' ');
  }

  return document.body.textContent;
};

export const hasRichTextContent = (html: string): boolean => {
  const document = parseHtml(html);

  if (!document) {
    return extractTextFromHtml(html).trim().length > 0 || /<img\b/i.test(html);
  }

  return (
    document.body.textContent.trim().length > 0 ||
    document.body.querySelector('img, table, ul, ol, blockquote') !== null
  );
};

export const summarizeHtmlContent = (html: string, maxLength: number): string => {
  const normalized = extractTextFromHtml(html).replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '본문이 없습니다.';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
};

export const sanitizeRichTextHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['style', 'target', 'rel', 'colspan', 'rowspan', 'colwidth', 'width', 'height'],
    ADD_TAGS: ['colgroup', 'col'],
  });
};

const parseColumnWidths = (value: string | null): number[] => {
  if (!value) {
    return [];
  }

  const widths = value.split(',').map((width) => Number.parseInt(width.trim(), 10));

  if (
    widths.length === 0 ||
    widths.some((width) => !Number.isInteger(width) || width < 1 || width > MAX_TABLE_COLUMN_WIDTH)
  ) {
    return [];
  }

  return widths;
};

const parsePositiveInteger = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_TABLE_COLUMN_WIDTH) {
    return null;
  }

  return parsed;
};

const parseCellSpan = (
  cell: HTMLTableCellElement,
  attributeName: 'colspan' | 'rowspan',
): number => {
  const parsed = Number.parseInt(cell.getAttribute(attributeName) ?? '', 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_TABLE_SPAN) {
    return 1;
  }

  return parsed;
};

const getDirectRowCells = (row: HTMLTableRowElement): HTMLTableCellElement[] => {
  return Array.from(row.children).filter(
    (child): child is HTMLTableCellElement => child.tagName === 'TD' || child.tagName === 'TH',
  );
};

const getExistingColgroup = (table: HTMLTableElement): HTMLElement | null => {
  return (
    (Array.from(table.children).find((child) => child.tagName === 'COLGROUP') as
      | HTMLElement
      | undefined) ?? null
  );
};

const resolveWidthFromStyle = (element: HTMLElement): number | null =>
  parsePositiveInteger(element.style.width);

const resolveExistingColumnWidths = (table: HTMLTableElement): number[] => {
  const colgroup = getExistingColgroup(table);
  if (!colgroup) {
    return [];
  }

  return Array.from(colgroup.children)
    .filter((child): child is HTMLTableColElement => child.tagName === 'COL')
    .map((col) => resolveWidthFromStyle(col) ?? parsePositiveInteger(col.getAttribute('width')))
    .filter((width): width is number => width !== null);
};

const resolveEditorColumnWidths = (table: HTMLTableElement): number[] => {
  const existingColumnWidths = resolveExistingColumnWidths(table);
  const columnWidths: Array<number | undefined> = [...existingColumnWidths];
  const rowSpanOccupancy: number[] = [];
  const rows = Array.from(table.querySelectorAll('tr'));

  rows.forEach((row) => {
    let columnIndex = 0;

    getDirectRowCells(row).forEach((cell) => {
      while ((rowSpanOccupancy[columnIndex] ?? 0) > 0) {
        rowSpanOccupancy[columnIndex] -= 1;
        columnIndex += 1;
      }

      const colspan = parseCellSpan(cell, 'colspan');
      const rowspan = parseCellSpan(cell, 'rowspan');
      const colwidths = parseColumnWidths(cell.getAttribute('colwidth'));
      const usableColwidths = colwidths.length === colspan ? colwidths : [];

      usableColwidths.forEach((width, offset) => {
        columnWidths[columnIndex + offset] = width;
      });

      if (usableColwidths.length === 0 && colspan === 1) {
        const fallbackWidth =
          parsePositiveInteger(cell.getAttribute('width')) ?? resolveWidthFromStyle(cell);
        if (fallbackWidth !== null) {
          columnWidths[columnIndex] = fallbackWidth;
        }
      }

      if (rowspan > 1) {
        for (let offset = 0; offset < colspan; offset += 1) {
          rowSpanOccupancy[columnIndex + offset] = Math.max(
            rowSpanOccupancy[columnIndex + offset] ?? 0,
            rowspan - 1,
          );
        }
      }

      columnIndex += colspan;
    });
  });

  let lastDefinedIndex = -1;
  for (let index = columnWidths.length - 1; index >= 0; index -= 1) {
    if (typeof columnWidths[index] === 'number') {
      lastDefinedIndex = index;
      break;
    }
  }
  if (lastDefinedIndex < 0) {
    return [];
  }

  return columnWidths
    .slice(0, lastDefinedIndex + 1)
    .map((width) => Math.max(MIN_TABLE_COLUMN_WIDTH, width ?? MIN_TABLE_COLUMN_WIDTH));
};

const getCellColumnPositions = (
  table: HTMLTableElement,
): Array<{
  cell: HTMLTableCellElement;
  columnIndex: number;
  colspan: number;
}> => {
  const positions: Array<{
    cell: HTMLTableCellElement;
    columnIndex: number;
    colspan: number;
  }> = [];
  const rowSpanOccupancy: number[] = [];

  Array.from(table.querySelectorAll('tr')).forEach((row) => {
    let columnIndex = 0;

    getDirectRowCells(row).forEach((cell) => {
      while ((rowSpanOccupancy[columnIndex] ?? 0) > 0) {
        rowSpanOccupancy[columnIndex] -= 1;
        columnIndex += 1;
      }

      const colspan = parseCellSpan(cell, 'colspan');
      const rowspan = parseCellSpan(cell, 'rowspan');
      positions.push({ cell, columnIndex, colspan });

      if (rowspan > 1) {
        for (let offset = 0; offset < colspan; offset += 1) {
          rowSpanOccupancy[columnIndex + offset] = Math.max(
            rowSpanOccupancy[columnIndex + offset] ?? 0,
            rowspan - 1,
          );
        }
      }

      columnIndex += colspan;
    });
  });

  return positions;
};

const applyEditorColumnWidths = (table: HTMLTableElement): void => {
  const columnWidths = resolveEditorColumnWidths(table);
  if (columnWidths.length === 0) {
    return;
  }

  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  if (tableWidth <= 0) {
    return;
  }

  const document = table.ownerDocument;
  const colgroup = getExistingColgroup(table) ?? document.createElement('colgroup');
  colgroup.replaceChildren();
  colgroup.setAttribute('data-rich-text-generated', 'true');

  columnWidths.forEach((width) => {
    const col = document.createElement('col');
    col.style.setProperty('width', `${String(width)}px`);
    colgroup.append(col);
  });

  if (!colgroup.parentElement) {
    table.insertBefore(colgroup, table.firstChild);
  }

  table.style.setProperty('width', `${String(tableWidth)}px`);
  table.style.setProperty('min-width', `${String(tableWidth)}px`);
  table.setAttribute('data-rich-text-column-widths', 'true');

  getCellColumnPositions(table).forEach(({ cell, columnIndex, colspan }) => {
    const cellColumnWidths = columnWidths.slice(columnIndex, columnIndex + colspan);
    const cellWidth = cellColumnWidths.reduce((sum, width) => sum + width, 0);
    if (cellWidth <= 0) {
      return;
    }

    if (cellColumnWidths.length === colspan) {
      cell.setAttribute('colwidth', cellColumnWidths.map(String).join(','));
    }
    cell.style.setProperty('width', `${String(cellWidth)}px`);
    cell.style.setProperty('min-width', `${String(cellWidth)}px`);
  });
};

const wrapDisplayTable = (table: HTMLTableElement): void => {
  if (table.parentElement?.hasAttribute('data-rich-text-table-scroll')) {
    return;
  }

  const wrapper = table.ownerDocument.createElement('div');
  wrapper.setAttribute('aria-label', '표 영역');
  wrapper.setAttribute('data-rich-text-table-scroll', 'true');
  wrapper.setAttribute('role', 'region');
  wrapper.setAttribute('tabindex', '0');
  table.replaceWith(wrapper);
  wrapper.append(table);
};

export const normalizeRichTextHtmlForStorage = (html: string): string => {
  const document = parseHtml(html);

  if (!document) {
    return html;
  }

  document.body.querySelectorAll('table').forEach((table) => {
    applyEditorColumnWidths(table);
    table.removeAttribute('data-rich-text-column-widths');
  });

  document.body.querySelectorAll('[data-rich-text-generated]').forEach((element) => {
    element.removeAttribute('data-rich-text-generated');
  });

  return document.body.innerHTML;
};

export const sanitizeRichTextHtmlForDisplay = (html: string): string => {
  const sanitizedHtml = sanitizeRichTextHtml(html);
  const document = parseHtml(sanitizedHtml);

  if (!document) {
    return sanitizedHtml;
  }

  document.body.querySelectorAll('table').forEach((table) => {
    applyEditorColumnWidths(table);
    wrapDisplayTable(table);
  });

  return document.body.innerHTML;
};

export interface HtmlImageMeta {
  alt: string;
  src: string;
}

export const extractFirstImageFromHtml = (html: string): HtmlImageMeta | null => {
  const document = parseHtml(html);

  if (!document) {
    const srcMatch = html.match(/<img[^>]*src=["']([^"']+)["']/i);
    const altMatch = html.match(/<img[^>]*alt=["']([^"']*)["']/i);

    if (!srcMatch?.[1]) {
      return null;
    }

    return {
      alt: altMatch?.[1] ?? '',
      src: srcMatch[1],
    };
  }

  const image = document.body.querySelector('img');
  if (!image) {
    return null;
  }

  const src = image.getAttribute('src')?.trim() ?? '';
  if (!src) {
    return null;
  }

  return {
    alt: image.getAttribute('alt')?.trim() ?? '',
    src,
  };
};

export const buildSingleImageHtml = (src: string, alt: string): string => {
  const normalizedSrc = src.trim();
  if (!normalizedSrc) {
    return '';
  }

  const normalizedAlt = alt.trim();

  return `<p><img src="${escapeHtmlAttribute(normalizedSrc)}" alt="${escapeHtmlAttribute(normalizedAlt)}" /></p>`;
};
