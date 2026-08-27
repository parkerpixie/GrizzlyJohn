'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { derivePatternObservations } = require('../wisdom-patterns.js');

const now = new Date(2026, 7, 25, 12, 0, 0);
const date = offset => { const value = new Date(now); value.setDate(value.getDate() - offset); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; };

test('does not manufacture patterns from one or two records', () => {
  const result = derivePatternObservations([
    { date: date(0), feelings: [{ word: 'Apprehensive' }] }, { date: date(1), feelings: [{ word: 'Apprehensive' }] }
  ], [{ date: date(0), skill: 'TIPP' }, { date: date(1), skill: 'TIPP' }], { now });
  assert.deepEqual(result, []);
});

test('summarizes repeated feelings and skill use in plain language', () => {
  const checkIns = [0, 1, 2].map(offset => ({ date: date(offset), feelings: [{ word: 'Apprehensive' }] }));
  const sessions = [0, 1, 2].map(offset => ({ date: date(offset), skill: 'TIPP' }));
  const result = derivePatternObservations(checkIns, sessions, { now });
  assert.ok(result.some(item => item.category === 'Feelings' && /3 times/.test(item.text)));
  assert.ok(result.some(item => item.category === 'Tools' && /several times/.test(item.text)));
});

test('requires a meaningful weekly check-in difference', () => {
  const checkIns = [0, 1, 2, 3].map(offset => ({ date: date(offset), feelings: [{ word: 'Steady' }] }));
  assert.ok(derivePatternObservations(checkIns, [], { now }).some(item => item.category === 'Check-In Rhythm'));
});
