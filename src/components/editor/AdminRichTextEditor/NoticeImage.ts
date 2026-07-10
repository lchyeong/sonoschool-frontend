import { type Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { NodeSelection, Selection } from '@tiptap/pm/state';

interface NoticeImageAttributes {
  alt?: string;
  src: string;
  storageUrl?: string | null;
}

interface ImagePosition {
  nodeSize: number;
  position: number;
}

const NoticeImage = Image.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      storageUrl: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-storage-url'),
        renderHTML: (attributes: { storageUrl?: string | null }) => {
          if (!attributes.storageUrl) {
            return {};
          }

          return {
            'data-storage-url': attributes.storageUrl,
          };
        },
      },
    };
  },
});

const findInsertedImage = (editor: Editor, src: string): ImagePosition | null => {
  const { doc, selection } = editor.state;

  if (
    selection instanceof NodeSelection &&
    selection.node.type.name === NoticeImage.name &&
    selection.node.attrs['src'] === src
  ) {
    return {
      nodeSize: selection.node.nodeSize,
      position: selection.from,
    };
  }

  const candidates: ImagePosition[] = [];

  doc.descendants((node, position) => {
    if (node.type.name === NoticeImage.name && node.attrs['src'] === src) {
      candidates.push({
        nodeSize: node.nodeSize,
        position,
      });
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

const moveCursorAfterImage = (editor: Editor, image: ImagePosition): void => {
  const { doc, schema } = editor.state;
  const imageEnd = image.position + image.nodeSize;
  const $imageEnd = doc.resolve(imageEnd);
  let transaction = editor.state.tr;

  if (!$imageEnd.nodeAfter?.isTextblock) {
    const paragraphType = schema.nodes['paragraph'];
    const insertionIndex = $imageEnd.index();

    if (!$imageEnd.parent.canReplaceWith(insertionIndex, insertionIndex, paragraphType)) {
      return;
    }

    transaction = transaction.insert(imageEnd, paragraphType.create());
  }

  transaction = transaction.setSelection(Selection.near(transaction.doc.resolve(imageEnd + 1), 1));
  editor.view.dispatch(transaction.scrollIntoView());
};

export const insertNoticeImage = (editor: Editor, attributes: NoticeImageAttributes): boolean => {
  const didInsert = editor
    .chain()
    .focus()
    .insertContent({
      attrs: attributes,
      type: NoticeImage.name,
    })
    .run();

  if (!didInsert) {
    return false;
  }

  const insertedImage = findInsertedImage(editor, attributes.src);
  if (insertedImage) {
    moveCursorAfterImage(editor, insertedImage);
  }

  return true;
};

export default NoticeImage;
