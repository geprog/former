import type { JSONContent } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';

/** The document of a formula: a paragraph per line of the text. */
export function textToContent(text: string): JSONContent {
  return {
    type: 'doc',
    content: text.split('\n').map(line => ({
      type: 'paragraph',
      ...(line
        ? {
            content: [
              { type: 'text', text: line },
            ],
          }
        : {}),
    })),
  };
}

/** The text of the document of a formula, its paragraphs are its lines. */
export function docToText(doc: Node): string {
  return doc.textBetween(0, doc.content.size, '\n');
}

// the position in the document and the offset in the text where each paragraph starts
function paragraphStarts(doc: Node): { pos: number; offset: number; length: number }[] {
  const starts: { pos: number; offset: number; length: number }[] = [];
  let offset = 0;
  doc.forEach((paragraph, pos) => {
    starts.push({ pos: pos + 1, offset, length: paragraph.content.size });
    offset += paragraph.content.size + 1;
  });
  return starts;
}

/** The offset in the text of a position in the document. */
export function posToOffset(doc: Node, pos: number): number {
  const starts = paragraphStarts(doc);
  const paragraph = [...starts].reverse().find(start => start.pos <= pos) ?? starts[0];
  if (!paragraph) {
    return 0;
  }
  return paragraph.offset + Math.min(Math.max(pos - paragraph.pos, 0), paragraph.length);
}

/** The position in the document of an offset in the text. */
export function offsetToPos(doc: Node, offset: number): number {
  const starts = paragraphStarts(doc);
  const paragraph = [...starts].reverse().find(start => start.offset <= offset) ?? starts[0];
  if (!paragraph) {
    return 1;
  }
  return paragraph.pos + Math.min(offset - paragraph.offset, paragraph.length);
}
