import type { FormulaSource } from './types';
import { all, create } from 'mathjs';
import { describe, expect, it, vi } from 'vitest';
import { reactive, readonly } from 'vue';
import { createFormulaEngine } from './engine';
import { formulaSource, valueSource } from './sources';

const math = create(all);

describe('createFormulaEngine', () => {
  describe('evaluate', () => {
    const engine = createFormulaEngine({ math });

    it('evaluates formulas with the form data', () => {
      expect(engine.evaluate('$a * 2 + $group.b', {
        data: {
          a: 2,
          group: { b: 1 },
        },
      })).toBe(5);
    });

    it('evaluates missing values to an empty string, which counts as 0 in calculations', () => {
      expect(engine.evaluate('$missing', { data: {} })).toBe('');
      expect(engine.evaluate('$a + 1', {
        data: { a: null },
      })).toBe(1);
      expect(engine.evaluate('$group.missing.deeper + 1', { data: {} })).toBe(1);
      expect(engine.evaluate('$a ?? 3', {
        data: { a: null },
      })).toBe('');
    });

    it('fails on variables without value if asked to, except for lists', () => {
      const variables = [
        { name: 'rows', type: 'list' as const },
      ];
      expect(engine.evaluateDetailed('$a * 2', { data: {}, missing: 'fail' })).toMatchObject({
        ok: false,
        error: { code: 'missing-value' },
      });
      expect(engine.evaluateDetailed('$group.a * 2', {
        data: { group: {} },
        missing: 'fail',
      })).toMatchObject({
        ok: false,
        error: { code: 'missing-value' },
      });
      expect(engine.evaluate('$a * 2', {
        data: { a: 0 },
        missing: 'fail',
      })).toBe(0);
      expect(engine.evaluate('size($rows)', { data: {}, variables, missing: 'fail' })).toEqual([0]);
    });

    it('evaluates lists without data to an empty list', () => {
      const variables = [
        { name: 'rows', type: 'list' as const },
      ];
      expect(engine.evaluate('sum(map($rows, f($rows_item) = $rows_item.width))', { data: {}, variables })).toBe(0);
      expect(engine.evaluate('sum(map($rows, f($rows_item) = $rows_item.width))', {
        data: {
          rows: [
            { width: 2 },
            { width: 3 },
          ],
        },
        variables,
      })).toBe(5);
    });

    it('resolves the item variables of the lists around the formula from its scopes', () => {
      const data = {
        rows: [
          { width: 2 },
          { width: 3 },
        ],
      };
      const scopes = [
        {
          node: { name: 'rows' },
          data: data.rows[1],
          path: ['rows', 1],
        },
        { data, path: [] },
      ];
      expect(engine.evaluate('$rows_item.width * 10', { scopes })).toBe(30);
    });

    it('prefers the closest item of nested lists with the same name', () => {
      const outer = {
        rows: [
          {
            rows: [
              { x: 'inner' },
            ],
          },
        ],
        x: 'outer',
      };
      const scopes = [
        {
          node: { name: 'rows' },
          data: outer.rows[0]!.rows[0],
          path: ['rows', 0, 'rows', 0],
        },
        {
          node: { name: 'rows' },
          data: outer.rows[0],
          path: ['rows', 0],
        },
        { data: outer, path: [] },
      ];
      expect(engine.evaluate('$rows_item.x', { scopes })).toBe('inner');
    });

    it('checks the type of the result', () => {
      expect(engine.evaluate('1 + 1', { expect: 'number' })).toBe(2);
      expect(engine.evaluate('1 + 1', { expect: 'boolean' })).toBeUndefined();
      expect(engine.evaluate('1 > 0', { expect: 'boolean' })).toBe(true);
      expect(engine.evaluate('"2026-01-31"', { expect: 'date' })).toBe('2026-01-31');
      expect(engine.evaluate('"tomorrow"', { expect: 'date' })).toBeUndefined();
      // a unit, e.g. from a variable without prefix, is never a result
      expect(engine.evaluate('cm')).toBeUndefined();
    });

    it('converts matrices to lists', () => {
      expect(engine.evaluate('[1, 2] * 2')).toEqual([2, 4]);
    });

    it('ignores comments and line breaks', () => {
      expect(engine.evaluate('1 + # one\n2 # two')).toBe(3);
    });

    it('reports why a formula can\'t be evaluated', () => {
      expect(engine.evaluateDetailed('').ok).toBe(false);
      expect(engine.evaluateDetailed('1 +')).toMatchObject({
        ok: false,
        error: { code: 'syntax' },
      });
      expect(engine.evaluateDetailed('1; 2')).toMatchObject({
        ok: false,
        error: { code: 'statements' },
      });
      expect(engine.evaluateDetailed('"a" == "b"')).toMatchObject({
        ok: false,
        error: { code: 'evaluation' },
      });
      expect(engine.evaluateDetailed('1', { expect: 'boolean' })).toMatchObject({
        ok: false,
        error: { code: 'type-mismatch' },
      });
    });

    it('disables functions that could break out of the formula', () => {
      expect(engine.evaluateDetailed('evaluate("1 + 1")')).toMatchObject({
        ok: false,
        error: { code: 'disabled-function' },
      });
      expect(engine.evaluateDetailed('import({ x: 1 })')).toMatchObject({
        ok: false,
        error: { code: 'disabled-function' },
      });
      expect(math.evaluate('1 + 1')).toBe(2);
    });

    it('doesn\'t change the data with functions changing their arguments or assignments', () => {
      const data = {
        tags: [3, 1, 2],
        roof: { width: 1 },
        rows: [
          { width: 2 },
        ],
      };
      expect(engine.evaluate('sort($tags)', { data })).toEqual([1, 2, 3]);
      expect(engine.evaluate('sort($tags, "desc")', { data })).toEqual([3, 2, 1]);
      expect(engine.evaluate('sort($tags)[1] + $tags[1]', { data })).toBe(4);
      expect(engine.evaluate('$roof.width = 5', { data })).toBe(5);
      expect(engine.evaluate('map($rows, f(row) = row.width = 7)', { data })).toEqual([7]);
      expect(data).toEqual({
        tags: [3, 1, 2],
        roof: { width: 1 },
        rows: [
          { width: 2 },
        ],
      });
    });

    it('works on read-only data, e.g. of a form node', () => {
      const data = readonly(reactive({
        tags: [3, 1, 2],
        rows: [
          { width: 2 },
          { width: 1 },
        ],
      }));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(engine.evaluate('sort($tags)', { data })).toEqual([1, 2, 3]);
      expect(engine.evaluate('sort(map($rows, f($rows_item) = $rows_item.width))', { data })).toEqual([1, 2]);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('doesn\'t change the data with assignments', () => {
      const data = { a: 1 };
      expect(engine.evaluate('f(x) = x * 2; f($a)', { data })).toBeUndefined();
      expect(engine.evaluate('map([1, 2], f(x) = x * $a)', { data })).toEqual([1, 2]);
      expect(data).toEqual({ a: 1 });
    });

    it('provides custom functions', () => {
      const withFunctions = createFormulaEngine({
        math,
        functions: {
          double: {
            fn: (x: number) => x * 2,
          },
        },
      });
      expect(withFunctions.evaluate('double(21)')).toBe(42);
    });

    it('caches compiled formulas', () => {
      expect(engine.compile('1 + 2')).toBe(engine.compile('1 + 2'));
    });

    it('supports other prefixes', () => {
      const engineWithPrefix = createFormulaEngine({ math, prefix: 'v_' });
      expect(engineWithPrefix.evaluate('v_a * 2', {
        data: { a: 2 },
      })).toBe(4);
    });
  });

  describe('sources', () => {
    it('resolves the variables of sources after the form data', () => {
      const engine = createFormulaEngine({
        math,
        sources: [
          valueSource({
            id: 'settings',
            values: { vat: 0.19, a: 'source' },
          }),
        ],
      });
      expect(engine.evaluate('$vat * 100', { data: {} })).toBe(19);
      expect(engine.evaluate('$a', {
        data: { a: 'form' },
      })).toBe('form');
      expect(engine.evaluate('$a', { data: {} })).toBe('source');
    });

    it('prefers the sources given to the evaluation over the ones of the engine', () => {
      const engine = createFormulaEngine({
        math,
        sources: [
          valueSource({
            id: 'engine',
            values: { a: 1 },
          }),
        ],
      });
      expect(engine.evaluate('$a', {
        sources: [
          valueSource({
            id: 'given',
            values: { a: 2 },
          }),
        ],
      })).toBe(2);
    });

    it('evaluates named formulas once per evaluation', () => {
      let calls = 0;
      const source = formulaSource({
        id: 'calculations',
        formulas: { area: '$width * $height', double: 'count() * $area * 2' },
        functions: {
          count: {
            fn: () => ++calls && 1,
          },
        },
      });
      const engine = createFormulaEngine({
        math,
        sources: [source],
      });
      expect(engine.evaluate('$double + $area', {
        data: { width: 2, height: 3 },
      })).toBe(18);
      expect(calls).toBe(1);
    });

    it('fails on named formulas referencing themselves', () => {
      const engine = createFormulaEngine({
        math,
        sources: [
          formulaSource({
            id: 'calc',
            formulas: { a: '$b + 1', b: '$a + 1' },
          }),
        ],
      });
      expect(engine.evaluateDetailed('$a')).toMatchObject({
        ok: false,
        error: { code: 'cycle' },
      });
      const namespaced = createFormulaEngine({
        math,
        sources: [
          formulaSource({
            id: 'calc',
            namespace: 'calc',
            formulas: { a: '$calc.a + 1' },
          }),
        ],
      });
      expect(namespaced.evaluateDetailed('$calc.a')).toMatchObject({
        ok: false,
        error: { code: 'cycle' },
      });
    });

    it('marks results using pending sources', () => {
      const source: FormulaSource = {
        ...valueSource({ id: 'remote', values: {} }),
        pending: () => true,
        roots: () => ['remote'],
      };
      const engine = createFormulaEngine({
        math,
        sources: [source],
      });
      expect(engine.evaluateDetailed('$remote + 1')).toEqual({ ok: true, value: 1, pending: true });
      expect(engine.evaluateDetailed('1')).toEqual({ ok: true, value: 1, pending: false });
    });

    it('lists the names reserved by sources', () => {
      const engine = createFormulaEngine({
        math,
        sources: [
          valueSource({
            id: 'settings',
            values: { vat: 0.19 },
          }),
          valueSource({
            id: 'house',
            namespace: 'house',
            values: { today: '2026-11-19' },
          }),
        ],
      });
      expect(engine.reservedNames([
        formulaSource({
          id: 'calc',
          formulas: { area: '1' },
        }),
      ])).toEqual(['area', 'vat', 'house']);
    });
  });
});
