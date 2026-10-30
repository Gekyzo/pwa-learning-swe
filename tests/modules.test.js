import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODULES, switchModule, visibleSections } from '#modules';

test('MODULES is saved', () => {
  assert.deepEqual(MODULES, ['saved']);
});

test('visibleSections with no module off is the full navigation', () => {
  assert.deepEqual(visibleSections([]), ['feed', 'saved', 'settings']);
});

test('visibleSections without saved keeps the feed and settings', () => {
  assert.deepEqual(visibleSections(['saved']), ['feed', 'settings']);
});

test('visibleSections ignores an unknown id', () => {
  assert.deepEqual(visibleSections(['shops']), ['feed', 'saved', 'settings']);
});

test('switchModule turns a module off and on', () => {
  assert.deepEqual(switchModule([], 'saved', false), ['saved']);
  assert.deepEqual(switchModule(['saved'], 'saved', true), []);
  assert.deepEqual(switchModule([], 'saved', true), []);
});

test('switchModule ignores an unknown id and does not change its input', () => {
  const off = ['saved'];
  assert.deepEqual(switchModule(off, 'shops', false), ['saved']);
  assert.deepEqual(off, ['saved']);
});
