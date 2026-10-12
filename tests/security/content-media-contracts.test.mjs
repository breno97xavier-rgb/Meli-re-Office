import test from 'node:test';
import assert from 'node:assert/strict';
import { selectContentCover } from '../../src/services/contentMediaContracts.ts';

const asset = (id, asset_type = 'image', display_order = 0, extra = {}) => ({ id, asset_type, display_order, is_current: true, file_url: id, version: 1, ...extra });

test('no media produces an empty cover for the uniform placeholder', () => {
  assert.equal(selectContentCover([], 'feed_single'), undefined);
});
test('carousel shows first active image in slide order without mutating input', () => {
  const items = [asset('second', 'image', 2), asset('historical', 'image', 0, { is_current: false }), asset('first', 'image', 1)];
  assert.equal(selectContentCover(items, 'carousel').id, 'first');
  assert.deepEqual(items.map(item => item.id), ['second', 'historical', 'first']);
});
test('reels prefers thumbnail, then falls back to actual video', () => {
  assert.equal(selectContentCover([asset('video', 'video'), asset('cover', 'thumbnail', 2)], 'reels').id, 'cover');
  assert.equal(selectContentCover([asset('video', 'video')], 'reels').id, 'video');
});
test('story supports video while documents are not rendered as images', () => {
  assert.equal(selectContentCover([asset('document', 'pdf'), asset('video', 'video')], 'story').id, 'video');
  assert.equal(selectContentCover([asset('document', 'pdf')], 'feed_single'), undefined);
});
test('latest current version wins a duplicate display slot', () => {
  assert.equal(selectContentCover([asset('old', 'image'), asset('new', 'image', 0, { version: 2 })], 'feed_single').id, 'new');
});
test('missing storage paths and historical thumbnails cannot become covers', () => {
  assert.equal(selectContentCover([asset('empty', 'image', 0, { file_url: '' }), asset('history', 'thumbnail', 0, { is_current: false })], 'reels'), undefined);
});
