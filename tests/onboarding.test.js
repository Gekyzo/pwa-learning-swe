import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShow, textParts } from '#onboarding';

test('shouldShow is true for no flag and no stored state', () => {
  assert.equal(shouldShow({ seen: false, hasState: false }), true);
});

test('shouldShow is false for a stored state', () => {
  assert.equal(shouldShow({ seen: false, hasState: true }), false);
});

test('shouldShow is false after the walkthrough was seen', () => {
  assert.equal(shouldShow({ seen: true, hasState: false }), false);
  assert.equal(shouldShow({ seen: true, hasState: true }), false);
});

test('textParts marks the text between backticks as a key', () => {
  assert.deepEqual(textParts('Toca `↻` en lo de siempre.'), [
    { text: 'Toca ', key: false },
    { text: '↻', key: true },
    { text: ' en lo de siempre.', key: false },
  ]);
});

test('textParts gives one plain part for a text with no backtick', () => {
  assert.deepEqual(textParts('Desliza la pantalla.'), [{ text: 'Desliza la pantalla.', key: false }]);
});

test('textParts reads keys at the start and at the end, and leaves out empty parts', () => {
  assert.deepEqual(textParts('`+` y `↻`'), [
    { text: '+', key: true },
    { text: ' y ', key: false },
    { text: '↻', key: true },
  ]);
});

test('textParts keeps a backtick with no pair as text', () => {
  assert.deepEqual(textParts('Abre `menú'), [{ text: 'Abre `menú', key: false }]);
  assert.deepEqual(textParts('`+` y `fin'), [
    { text: '+', key: true },
    { text: ' y `fin', key: false },
  ]);
});

test('textParts reads an icon of the sprite at the start of a key, with or without text', () => {
  assert.deepEqual(textParts('Con `#cart-add`. En `#menu Menú` planificas.'), [
    { text: 'Con ', key: false },
    { text: '', key: true, icon: 'cart-add' },
    { text: '. En ', key: false },
    { text: 'Menú', key: true, icon: 'menu' },
    { text: ' planificas.', key: false },
  ]);
});

test('textParts reads a # that is not at the start of a key, or a lone #, as text', () => {
  assert.deepEqual(textParts('`a #menu` y `#`'), [
    { text: 'a #menu', key: true },
    { text: ' y ', key: false },
    { text: '#', key: true },
  ]);
});

test('textParts marks the text between two ** as bold', () => {
  assert.deepEqual(textParts('Toca **Guardar** y sigue.'), [
    { text: 'Toca ', key: false },
    { text: 'Guardar', key: false, strong: true },
    { text: ' y sigue.', key: false },
  ]);
});

test('textParts reads a key beside bold text and a key inside it', () => {
  assert.deepEqual(textParts('**Abre** `↻`'), [
    { text: 'Abre', key: false, strong: true },
    { text: ' ', key: false },
    { text: '↻', key: true },
  ]);
  assert.deepEqual(textParts('**Toca `#menu Menú` ya**'), [
    { text: 'Toca ', key: false, strong: true },
    { text: 'Menú', key: true, icon: 'menu', strong: true },
    { text: ' ya', key: false, strong: true },
  ]);
});

test('textParts keeps a ** with no pair as text', () => {
  assert.deepEqual(textParts('2 ** 3'), [{ text: '2 ** 3', key: false }]);
  assert.deepEqual(textParts('**a** y **b'), [
    { text: 'a', key: false, strong: true },
    { text: ' y **b', key: false },
  ]);
  assert.deepEqual(textParts('`**` y **b'), [
    { text: '**', key: true },
    { text: ' y **b', key: false },
  ]);
});
