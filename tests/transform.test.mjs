import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collapseWhitespace,
  prettyJson,
  removeDuplicateLines,
  sortLines,
  titleCase,
  trimLines,
} from '../src/transform.mjs';

test('trimLines removes leading and trailing whitespace per line', () => {
  assert.equal(trimLines('  alpha  \r\n beta\n'), 'alpha\nbeta\n');
});

test('collapseWhitespace normalizes spaces without merging lines', () => {
  assert.equal(collapseWhitespace('a   b\n  c\td'), 'a b\nc d');
});

test('removeDuplicateLines keeps first occurrence and skips blank lines', () => {
  assert.equal(removeDuplicateLines('A\nA\n\nB\n A '), 'A\nB');
});

test('sortLines sorts non-empty lines', () => {
  assert.equal(sortLines('z\na\n\nB'), 'a\nB\nz');
});

test('prettyJson creates readable JSON', () => {
  assert.equal(prettyJson('{"ok":true,"items":[1,2]}'), '{\n  "ok": true,\n  "items": [\n    1,\n    2\n  ]\n}');
});

test('titleCase converts common word boundaries', () => {
  assert.equal(titleCase('hello QUICK_TEXT'), 'Hello Quick_Text');
});
