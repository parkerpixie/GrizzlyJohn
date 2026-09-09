'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const families = require('../feeling-families.js');
const { recommendSkills, patternSkills, haltNextMoves } = require('../john-skill-routing.js');

function names(feelings) {
  return recommendSkills(feelings, { familyApi: families }).map(item => item.skill);
}

test('positive and grounded check-ins do not manufacture therapy homework', () => {
  assert.deepEqual(names(['Happy']), []);
  assert.deepEqual(names(['Grounded', 'Grateful']), []);
});

test('tired starts with HALT and then points to body-basics support', () => {
  assert.deepEqual(names(['Tired']).slice(0, 2), ['HALT', 'ABC Please']);
});

test('lonely starts with HALT and then Opposite Action', () => {
  assert.deepEqual(names(['Lonely']).slice(0, 2), ['HALT', 'Opposite Action']);
});

test('anger checks HALT first without losing the best-fit next skill', () => {
  assert.deepEqual(names(['Furious']).slice(0, 2), ['HALT', 'STOP']);
  assert.deepEqual(names(['Disrespected']).slice(0, 2), ['HALT', 'DEAR MAN']);
  assert.deepEqual(names(['Resentful']).slice(0, 2), ['HALT', 'Radical Acceptance']);
});

test('high nervous-system activation keeps TIPP first and HALT visible', () => {
  const panicked = names(['Panicked']);
  assert.equal(panicked[0], 'TIPP');
  assert.equal(panicked[1], 'HALT');
  const overwhelmed = names(['Overwhelmed']);
  assert.equal(overwhelmed[0], 'TIPP');
  assert.equal(overwhelmed[1], 'HALT');
});

test('worry uses Check The Facts rather than forcing HALT into every check-in', () => {
  const worried = names(['Worried']);
  assert.equal(worried[0], 'Check The Facts');
  assert.equal(worried.includes('HALT'), false);
});

test('mixed HALT-related states synthesize instead of duplicating tools', () => {
  const mixed = names(['Lonely', 'Frustrated', 'Tired']);
  assert.equal(mixed[0], 'HALT');
  assert.equal(new Set(mixed).size, mixed.length);
  assert.ok(mixed.includes('Opposite Action') || mixed.includes('STOP'));
  assert.ok(mixed.length <= 3);
});

test('body-first mixed states keep regulation ahead of analysis', () => {
  const mixed = names(['Flooded', 'Lonely']);
  assert.deepEqual(mixed.slice(0, 2), ['TIPP', 'HALT']);
});

test('pattern routing connects recurring families to practical tools', () => {
  assert.deepEqual(patternSkills({ familyId: 'anger' }), ['HALT', 'STOP', 'Check The Facts']);
  assert.deepEqual(patternSkills({ familyId: 'overwhelmed' }), ['TIPP', 'HALT', 'IMPROVE']);
  assert.deepEqual(patternSkills({ familyId: 'neutral' }), ['HALT', 'ABC Please']);
  assert.deepEqual(patternSkills({ familyId: 'sad', detail: 'Showing up as: Lonely · Heavy' }), ['HALT', 'Opposite Action', 'Self Soothe']);
  assert.deepEqual(patternSkills({ familyId: 'bright' }), []);
});

test('HALT answers produce concrete next moves and follow-up skills', () => {
  const moves = haltNextMoves(['Hungry', 'Angry', 'Lonely', 'Tired']);
  assert.deepEqual(moves.map(item => item.need), ['Hungry', 'Angry', 'Lonely', 'Tired']);
  assert.ok(moves.find(item => item.need === 'Angry' && item.skill === 'STOP'));
  assert.ok(moves.find(item => item.need === 'Lonely' && item.skill === 'Opposite Action'));
  assert.ok(moves.find(item => item.need === 'Tired' && item.skill === 'ABC Please'));
  assert.deepEqual(haltNextMoves([]), []);
});
