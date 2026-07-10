import { type Editor, Node } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import { NodeSelection, Selection } from '@tiptap/pm/state';

import type { NoticeLinkPreviewMetadata } from './NoticeLinkPreview';

interface LinkPreviewCardPosition {
  nodeSize: number;
  position: number;
}

const getAttribute = (element: HTMLElement, name: string): string => {
  return element.getAttribute(name)?.trim() ?? '';
};

const getNodeAttribute = (attributes: Record<string, unknown>, name: string): string => {
  const value = attributes[name];
  return typeof value === 'string' ? value : '';
};

const getSafeWebUrl = (value: string): string => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
};

const createTextElement = (attribute: string, text: string): DOMOutputSpec => {
  return ['span', { [attribute]: '' }, text];
};

const LinkPreviewCard = Node.create({
  name: 'linkPreviewCard',

  group: 'block',

  atom: true,

  draggable: true,

  selectable: true,

  addAttributes() {
    return {
      description: {
        default: '',
        parseHTML: (element: HTMLElement) => getAttribute(element, 'data-description'),
        rendered: false,
      },
      domain: {
        default: '',
        parseHTML: (element: HTMLElement) => getAttribute(element, 'data-domain'),
        rendered: false,
      },
      imageUrl: {
        default: null,
        parseHTML: (element: HTMLElement) => getAttribute(element, 'data-image-url') || null,
        rendered: false,
      },
      siteName: {
        default: '',
        parseHTML: (element: HTMLElement) => getAttribute(element, 'data-site-name'),
        rendered: false,
      },
      title: {
        default: '',
        parseHTML: (element: HTMLElement) => getAttribute(element, 'data-title'),
        rendered: false,
      },
      url: {
        default: '',
        parseHTML: (element: HTMLElement) =>
          getAttribute(element, 'data-url') ||
          element.querySelector<HTMLAnchorElement>('a[href]')?.href ||
          '',
        rendered: false,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'article[data-link-preview-card]' }];
  },

  renderHTML({ node }) {
    const attributes = node.attrs as Record<string, unknown>;
    const description = getNodeAttribute(attributes, 'description');
    const domain = getNodeAttribute(attributes, 'domain');
    const imageUrl = getSafeWebUrl(getNodeAttribute(attributes, 'imageUrl'));
    const siteName = getNodeAttribute(attributes, 'siteName');
    const title = getNodeAttribute(attributes, 'title') || domain;
    const url = getSafeWebUrl(getNodeAttribute(attributes, 'url'));
    const media: DOMOutputSpec = imageUrl
      ? [
          'span',
          { 'data-link-preview-media': '' },
          [
            'img',
            {
              alt: '',
              draggable: 'false',
              loading: 'lazy',
              referrerpolicy: 'no-referrer',
              src: imageUrl,
            },
          ],
        ]
      : [
          'span',
          { 'data-link-preview-placeholder': '' },
          (siteName || domain).slice(0, 1).toUpperCase(),
        ];
    const bodyChildren: DOMOutputSpec[] = [['strong', { 'data-link-preview-title': '' }, title]];

    if (description) {
      bodyChildren.push(createTextElement('data-link-preview-description', description));
    }

    bodyChildren.push(createTextElement('data-link-preview-domain', domain));

    return [
      'article',
      {
        'data-description': description,
        'data-domain': domain,
        'data-image-url': imageUrl,
        'data-link-preview-card': '',
        'data-site-name': siteName,
        'data-title': title,
        'data-url': url,
      },
      [
        'a',
        {
          'aria-label': `${title} 링크 미리보기`,
          href: url,
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
        media,
        ['span', { 'data-link-preview-body': '' }, ...bodyChildren],
      ],
    ];
  },
});

const findInsertedCard = (editor: Editor, url: string): LinkPreviewCardPosition | null => {
  const { doc, selection } = editor.state;

  if (
    selection instanceof NodeSelection &&
    selection.node.type.name === LinkPreviewCard.name &&
    selection.node.attrs['url'] === url
  ) {
    return {
      nodeSize: selection.node.nodeSize,
      position: selection.from,
    };
  }

  const candidates: LinkPreviewCardPosition[] = [];

  doc.descendants((node, position) => {
    if (node.type.name === LinkPreviewCard.name && node.attrs['url'] === url) {
      candidates.push({ nodeSize: node.nodeSize, position });
    }
  });

  return (
    candidates.toSorted((left, right) => {
      const leftDistance = Math.abs(left.position + left.nodeSize - selection.from);
      const rightDistance = Math.abs(right.position + right.nodeSize - selection.from);
      return leftDistance - rightDistance;
    })[0] ?? null
  );
};

const moveCursorAfterCard = (editor: Editor, card: LinkPreviewCardPosition): void => {
  const { doc, schema } = editor.state;
  const cardEnd = card.position + card.nodeSize;
  const $cardEnd = doc.resolve(cardEnd);
  let transaction = editor.state.tr;

  if (!$cardEnd.nodeAfter?.isTextblock) {
    const paragraphType = schema.nodes['paragraph'];
    const insertionIndex = $cardEnd.index();

    if (!$cardEnd.parent.canReplaceWith(insertionIndex, insertionIndex, paragraphType)) {
      return;
    }

    transaction = transaction.insert(cardEnd, paragraphType.create());
  }

  transaction = transaction.setSelection(Selection.near(transaction.doc.resolve(cardEnd + 1), 1));
  editor.view.dispatch(transaction);
};

export const insertLinkPreviewCard = (
  editor: Editor,
  metadata: NoticeLinkPreviewMetadata,
  position = editor.state.selection.to,
): boolean => {
  const insertionPosition = Math.min(Math.max(0, position), editor.state.doc.content.size);
  const didInsert = editor.commands.insertContentAt(
    insertionPosition,
    {
      attrs: metadata,
      type: LinkPreviewCard.name,
    },
    { updateSelection: true },
  );

  if (!didInsert) {
    return false;
  }

  const insertedCard = findInsertedCard(editor, metadata.url);
  if (insertedCard) {
    moveCursorAfterCard(editor, insertedCard);
  }

  editor.view.focus();

  return true;
};

export default LinkPreviewCard;
