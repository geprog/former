import { getSchema } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Node } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { docToText, offsetToPos, posToOffset, textToContent } from './text';

const schema = getSchema([Document, Paragraph, Text]);

function docOf(text: string) {
  return Node.fromJSON(schema, textToContent(text));
}

describe('text', () => {
  it('converts the text to a paragraph per line and back', () => {
    for (const text of ['', '$a + 1', '1 +\n2', 'a\n\nb', '\n']) {
      expect(docToText(docOf(text))).toBe(text);
    }
  });

  it('maps offsets in the text to positions in the document and back', () => {
    const text = 'ab\n\ncd';
    const doc = docOf(text);
    for (let offset = 0; offset <= text.length; offset++) {
      expect(posToOffset(doc, offsetToPos(doc, offset))).toBe(offset);
    }
    // `a` is at position 1, after the start of the first paragraph
    expect(offsetToPos(doc, 0)).toBe(1);
    // `c` is in the third paragraph: 1 + (2 + 2) + (0 + 2)
    expect(offsetToPos(doc, 4)).toBe(7);
    expect(doc.textBetween(offsetToPos(doc, 4), offsetToPos(doc, 6))).toBe('cd');
  });
});
