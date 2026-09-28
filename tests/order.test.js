import { describe, it, expect } from 'vitest';
import { mergeOrder, moveItem, isDefaultOrder } from '../src/lib/order.js';
import { TOOLS } from '../src/tools/index.js';

const D = ['a', 'b', 'c', 'd', 'e'];

describe('mergeOrder', () => {
  it('returns defaults when nothing is saved or the value is invalid', () => {
    expect(mergeOrder(null, D)).toEqual(D);
    expect(mergeOrder(undefined, D)).toEqual(D);
    expect(mergeOrder('a,b', D)).toEqual(D);
    expect(mergeOrder({ a: 1 }, D)).toEqual(D);
  });
  it('does not mutate the defaults array', () => {
    const d = [...D]; const r = mergeOrder(null, d); r.push('x'); expect(d).toEqual(D);
  });
  it('keeps a complete saved order as-is', () => {
    expect(mergeOrder(['e', 'd', 'c', 'b', 'a'], D)).toEqual(['e', 'd', 'c', 'b', 'a']);
  });
  it('drops unknown ids (tools removed in a later version)', () => {
    expect(mergeOrder(['c', 'gone', 'a', 'b', 'old', 'd', 'e'], D)).toEqual(['c', 'a', 'b', 'd', 'e']);
  });
  it('drops duplicates and non-string junk', () => {
    expect(mergeOrder(['b', 'b', 5, null, 'a', 'c', 'a', 'd', 'e'], D)).toEqual(['b', 'a', 'c', 'd', 'e']);
  });
  it('inserts a new tool right after its default predecessor', () => {
    // 'c' is new: it follows 'b' in the default order
    expect(mergeOrder(['e', 'b', 'a', 'd'], D)).toEqual(['e', 'b', 'c', 'a', 'd']);
  });
  it('puts a new first-in-default tool at the front', () => {
    expect(mergeOrder(['d', 'c', 'b', 'e'], D)).toEqual(['a', 'd', 'c', 'b', 'e']);
  });
  it('appends a new last-in-default tool after its predecessor at the end', () => {
    expect(mergeOrder(['d', 'c', 'b', 'a'], D)).toEqual(['d', 'e', 'c', 'b', 'a']);
    expect(mergeOrder(['b', 'c', 'a', 'd'], D)).toEqual(['b', 'c', 'a', 'd', 'e']);
  });
  it('handles several new tools in a row, keeping their default relative order', () => {
    expect(mergeOrder(['e', 'a'], D)).toEqual(['e', 'a', 'b', 'c', 'd']);
    expect(mergeOrder(['e'], D)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
  it('handles removed + added tools at the same time', () => {
    expect(mergeOrder(['x', 'd', 'y', 'a'], ['a', 'd', 'n1', 'n2'])).toEqual(['d', 'n1', 'n2', 'a']);
  });
  it('empty saved array → defaults', () => {
    expect(mergeOrder([], D)).toEqual(D);
  });
  it('result always contains every current tool exactly once (real tool list)', () => {
    const ids = TOOLS.map((t) => t.id);
    const saved = ['torque', 'nope', ...ids.slice(5).reverse()];
    const r = mergeOrder(saved, ids);
    expect(r.length).toBe(ids.length);
    expect([...r].sort()).toEqual([...ids].sort());
    expect(r[0]).toBe('socket'); // new-to-this-save first default tool goes to the front
  });
});

describe('moveItem', () => {
  it('moves up and down', () => {
    expect(moveItem(D, 3, 0)).toEqual(['d', 'a', 'b', 'c', 'e']);
    expect(moveItem(D, 0, 2)).toEqual(['b', 'c', 'a', 'd', 'e']);
  });
  it('clamps the destination and ignores bad sources', () => {
    expect(moveItem(D, 1, -5)).toEqual(['b', 'a', 'c', 'd', 'e']);
    expect(moveItem(D, 1, 99)).toEqual(['a', 'c', 'd', 'e', 'b']);
    expect(moveItem(D, 9, 0)).toEqual(D);
  });
  it('does not mutate the input', () => {
    const l = [...D]; moveItem(l, 0, 4); expect(l).toEqual(D);
  });
});

describe('isDefaultOrder', () => {
  it('detects the default order', () => {
    expect(isDefaultOrder([...D], D)).toBe(true);
    expect(isDefaultOrder(moveItem(D, 0, 1), D)).toBe(false);
    expect(isDefaultOrder(D.slice(1), D)).toBe(false);
  });
});
