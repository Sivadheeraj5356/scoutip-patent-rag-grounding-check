const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../grounding.js');

const chunks = [
  { id: 'US101', tenant: 'acme', text: 'A lithium battery electrode with silicon nanowire anode for improved cycle life and capacity retention.' },
  { id: 'US202', tenant: 'acme', text: 'Method for queue-based print scheduling across networked office printers.' },
  { id: 'EP9', tenant: 'other-org', text: 'Secret competitor formula for solvent-free coating of battery cathodes.' },
];

test('fully grounded answer passes clean', () => {
  const r = G.check({
    chunks,
    tenant: 'acme',
    answer: 'The patent describes a lithium battery electrode using a silicon nanowire anode. It targets improved cycle life and capacity retention.',
    citations: { '0': 'US101', '1': 'US101' },
  });
  assert.equal(r.findings.filter((f) => f.level === 'error').length, 0);
});

test('uncited claim is an error', () => {
  const r = G.check({ chunks, tenant: 'acme', answer: 'The patent covers quantum dot solar cells with perovskite layers.', citations: {} });
  assert.ok(r.findings.some((f) => f.code === 'UNCITED_CLAIM'));
});

test('citation to unknown chunk is an error', () => {
  const r = G.check({ chunks, tenant: 'acme', answer: 'The patent covers quantum dot solar cells.', citations: { '0': 'US999' } });
  assert.ok(r.findings.some((f) => f.code === 'CITATION_NOT_IN_CORPUS'));
});

test('claim not supported by its cited chunk is an error', () => {
  const r = G.check({
    chunks, tenant: 'acme',
    answer: 'The patent describes a queue-based print scheduling method.',
    citations: { '0': 'US101' },
  });
  assert.ok(r.findings.some((f) => f.code === 'UNSUPPORTED_CLAIM'));
});

test('cross-tenant citation is an isolation breach', () => {
  const r = G.check({
    chunks, tenant: 'acme',
    answer: 'The patent describes a solvent-free coating for battery cathodes.',
    citations: { '0': 'EP9' },
  });
  assert.ok(r.findings.some((f) => f.code === 'CROSS_TENANT_CITATION'));
});

test('out-of-tenant chunk in the retrieval set warns', () => {
  const r = G.check({
    chunks, tenant: 'acme',
    answer: 'The patent describes a lithium battery electrode with silicon nanowire anode.',
    citations: { '0': 'US101' },
  });
  assert.ok(r.findings.some((f) => f.code === 'OUT_OF_TENANT_CHUNK_RETRIEVED' && f.level === 'warn'));
});

test('claims with empty in-tenant retrieval flag hallucination risk', () => {
  const r = G.check({
    chunks: [{ id: 'X1', tenant: 'other-org', text: 'unrelated content entirely' }],
    tenant: 'acme',
    answer: 'The patent describes a lithium battery electrode.',
    citations: { '0': 'X1' },
  });
  assert.ok(r.findings.some((f) => f.code === 'EMPTY_RETRIEVAL'));
});
