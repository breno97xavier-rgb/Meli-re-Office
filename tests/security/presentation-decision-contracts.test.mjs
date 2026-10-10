import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeItemApprovalStatus,
  normalizePresentationStatus,
  normalizePublicPresentationData,
} from '../../src/services/presentationDecisionContracts.ts';

test('current DB enums map to existing decision UI without hiding unknown statuses', () => {
  assert.equal(normalizeItemApprovalStatus('adjustments_requested'), 'changes_requested');
  assert.equal(normalizeItemApprovalStatus('approved'), 'approved');
  assert.equal(normalizeItemApprovalStatus('pending'), 'pending');
  assert.equal(normalizeItemApprovalStatus('rejected'), 'rejected');
  assert.equal(normalizeItemApprovalStatus(null), 'pending');
  assert.equal(normalizeItemApprovalStatus('future_status'), 'future_status');
  assert.equal(normalizePresentationStatus('under_review'), 'in_review');
  assert.equal(normalizePresentationStatus('approved_with_adjustments'), 'changes_requested');
  assert.equal(normalizePresentationStatus('archived'), 'archived');
});

test('nested public payload preserves presentation identity and translated decisions after reload', () => {
  const expiry = '2030-01-01T00:00:00Z';
  const raw = {
    presentation: { id: 'presentation-a', title: 'Round 2', round_number: 2,
      status: 'approved_with_adjustments', client: { id: 'client-a', name: 'Fictitious' } },
    items: [{ id: 'item-a', display_order: 1, client_approval_status: 'adjustments_requested',
      content: { id: 'content-a' }, client_feedback: 'Revise the caption', assets: [] }],
    access: { expires_at: expiry },
  };
  const result = normalizePublicPresentationData(raw);
  assert.equal(result.id, 'presentation-a');
  assert.equal(result.client_id, 'client-a');
  assert.equal(result.title, 'Round 2');
  assert.equal(result.round_number, 2);
  assert.equal(result.status, 'changes_requested');
  assert.equal(result.items[0].presentation_id, 'presentation-a');
  assert.equal(result.items[0].content_id, 'content-a');
  assert.equal(result.items[0].client_approval_status, 'changes_requested');
  assert.equal(result.items[0].client_feedback, 'Revise the caption');
  assert.equal(result.access_info.expires_at, expiry);
  assert.equal(raw.items[0].client_approval_status, 'adjustments_requested');
});

test('flat legacy payload and PostgREST array envelope remain supported', () => {
  const raw = { id: 'p', title: 'Test', status: 'under_review',
    client: [{ id: 'c', name: 'Fictitious' }],
    items: [{ id: 'second', display_order: 2, content: [{ id: 'c2' }], assets: [] },
      { id: 'first', display_order: 1, content: { id: 'c1' }, assets: [] }] };
  const result = normalizePublicPresentationData([raw]);
  assert.equal(result.id, 'p');
  assert.equal(result.status, 'in_review');
  assert.equal(result.client.id, 'c');
  assert.deepEqual(result.items.map(item => item.id), ['first', 'second']);
  assert.equal(result.items[1].content_id, 'c2');
  assert.equal(result.items[0].client_approval_status, 'pending');
});

test('invalid public envelope fails explicitly', () => {
  for (const raw of [null, undefined, 'invalid', []]) {
    assert.throws(() => normalizePublicPresentationData(raw), /INVALID_DATA/);
  }
});
