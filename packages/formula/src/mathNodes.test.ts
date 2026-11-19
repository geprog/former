import type { AccessorNode } from 'mathjs';
import { all, create } from 'mathjs';
import { describe, expect, it } from 'vitest';
import { dotProperty } from './mathNodes';

const math = create(all);

describe('dotProperty', () => {
  it('reads the property of a dot notation accessor', () => {
    const accessor = math.parse('$roof.width') as AccessorNode;
    expect(dotProperty(accessor.index)).toBe('width');
    expect(dotProperty((math.parse('$a.b.c') as AccessorNode).index)).toBe('c');
  });
});
