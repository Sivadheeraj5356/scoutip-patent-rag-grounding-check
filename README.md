# Scout IP Patent RAG Grounding Check

A client-side QA check for patent-search answers, built with Scout IP's problem in mind: an AI system that lets non-experts search 150M+ patents only works if every claim it makes is traceable to a real patent chunk - and if one tenant's corpus never leaks into another's answer.

Paste the retrieved chunks and the generated answer; the tool flags:

- **UNCITED_CLAIM** - an answer sentence with no citation at all
- **CITATION_NOT_IN_CORPUS** - a citation pointing at a chunk that was never retrieved
- **UNSUPPORTED_CLAIM** - the cited chunk does not actually support the claim (coverage below 60%)
- **CROSS_TENANT_CITATION** - a claim grounded in another tenant's corpus (isolation breach)
- **OUT_OF_TENANT_CHUNK_RETRIEVED** - foreign-tenant material present in the retrieval set
- **EMPTY_RETRIEVAL** - the answer makes claims with no in-tenant retrieval at all

Grounding is measured with transparent keyword coverage so every flag is explainable - the harness shape (claims, citations, tenants, thresholds) is the product, not the scorer.

## Use

Open `index.html`:

```text
US10123456 | acme | A lithium battery electrode with silicon nanowire anode...
```

```text
The patent describes a silicon nanowire anode. [US10123456]
```

## Test

```bash
npm test
```

The project uses plain HTML, CSS and JavaScript with the Node.js built-in test runner. It has no external services, build step or secrets.

## Limitations

This tool uses keyword-overlap heuristics, not semantic verification:

- The 60% coverage threshold is a tunable heuristic, not a measure of entailment. Correctly grounded paraphrases can fail it; textually similar but wrong claims can pass it.
- Tenant scoping uses the tenant labels you paste; it cannot verify how the real retrieval pipeline scoped the corpus.
- Tests verify the heuristics match their intended sample patterns; they do not prove answers are truly grounded.
