// Patent RAG grounding QA: verifies that every claim in an answer is grounded
// in a retrieved patent chunk, that citations point at real chunks, and that
// retrieval respects tenant scoping. Pure functions, no DOM.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PatentGroundingCheck = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const STOP = new Set(['the','a','an','and','or','of','to','in','for','on','is','are','was','were','with','that','this','by','as','at','from','it','its','be','been','has','have','had']);
  function keywords(s) {
    return new Set((s.toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 2 && !STOP.has(t)));
  }
  function overlap(a, b) {
    const ka = keywords(a), kb = keywords(b);
    if (!ka.size || !kb.size) return 0;
    let hit = 0;
    for (const t of ka) if (kb.has(t)) hit++;
    return hit / ka.size; // coverage of the claim's keywords by the chunk
  }
  function splitClaims(answer) {
    return answer.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 12);
  }
  // chunks: [{id, tenant, text}], claims derived from answer; citations: {claimIndex: chunkId}
  function check({ chunks, answer, citations, tenant }) {
    const findings = [];
    const inScope = chunks.filter((c) => !tenant || c.tenant === tenant);
    const outScope = chunks.filter((c) => tenant && c.tenant !== tenant);
    const byId = new Map(chunks.map((c) => [c.id, c]));
    const claims = splitClaims(answer);
    claims.forEach((claim, i) => {
      const citeId = citations ? citations[String(i)] : undefined;
      if (citeId === undefined) {
        findings.push({ level: 'error', code: 'UNCITED_CLAIM', text: `Claim ${i + 1} has no citation: "${claim.slice(0, 80)}..."` });
      } else {
        const chunk = byId.get(citeId);
        if (!chunk) {
          findings.push({ level: 'error', code: 'CITATION_NOT_IN_CORPUS', text: `Claim ${i + 1} cites "${citeId}", which is not a retrieved chunk.` });
        } else if (tenant && chunk.tenant !== tenant) {
          findings.push({ level: 'error', code: 'CROSS_TENANT_CITATION', text: `Claim ${i + 1} cites "${citeId}" from tenant "${chunk.tenant}" while answering for tenant "${tenant}" - isolation breach.` });
        } else if (overlap(claim, chunk.text) < 0.6) {
          findings.push({ level: 'error', code: 'UNSUPPORTED_CLAIM', text: `Claim ${i + 1} may not be grounded in cited chunk "${citeId}" - keyword overlap ${(overlap(claim, chunk.text) * 100).toFixed(0)}%, below the 60% heuristic threshold: "${claim.slice(0, 80)}...". A true paraphrase can score low; review manually.` });
        }
      }
    });
    for (const c of outScope) {
      findings.push({ level: 'warn', code: 'OUT_OF_TENANT_CHUNK_RETRIEVED', text: `Chunk "${c.id}" belongs to tenant "${c.tenant}" but was in the retrieval set for tenant "${tenant}".` });
    }
    if (inScope.length === 0 && claims.length)
      findings.push({ level: 'error', code: 'EMPTY_RETRIEVAL', text: 'No in-tenant chunks retrieved but the answer makes claims anyway - hallucination risk.' });
    return { claims, findings, stats: { claims: claims.length, chunks: chunks.length, inScope: inScope.length } };
  }
  return { keywords, overlap, splitClaims, check };
});
