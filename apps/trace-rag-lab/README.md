# Trace RAG Lab

Trace RAG Lab is a portfolio-ready AI engineering project: an inspectable retrieval-augmented generation (RAG) workbench with ingestion, hybrid retrieval, grounded answers, security, feedback, and evaluation.

## Run

```bash
npm start
```

Open `http://localhost:4175`.

## What it demonstrates

- Corpus normalization and lightweight lexical retrieval
- Grounded answer generation with source citations
- Confidence and latency signals for observability
- An evaluation suite with pass-rate reporting
- A provider-agnostic seam where a hosted embedding model or LLM can be added later

## Upgrade map

- **Embeddings:** deterministic hashed term vectors provide semantic-style similarity without a model download.
- **Vector search:** cosine similarity is combined with exact lexical overlap for hybrid retrieval.
- **LLM seam:** the response reports `provider-ready` when an `OPENAI_API_KEY` is present; the local extractive fallback remains deterministic and free.
- **Ingestion:** sign in, choose a `.txt`, `.md`, `.csv`, or `.json` file, and ingest it into the indexed corpus. Large files are chunk-counted for a production-ready ingestion contract.
- **Evaluation:** the regression suite reports pass rate, retrieval recall proxy, grounded-answer rate, and average confidence.
- **Feedback:** helpful / needs-work ratings are persisted for later tuning.
- **Observability:** query, ingestion, and evaluation events are audited in `/api/observability` and shown in the UI.
- **Access control:** account creation, session cookies, engineer roles, and public/private document visibility are included.
- **Security basics:** payload size limits, query length limits, generic login errors, HttpOnly cookies, and VIN-redaction guidance are included.

The local implementation deliberately uses deterministic retrieval and extractive answers so the behavior is explainable and the demo has no secrets or paid dependencies. For a hosted model, replace `groundedAnswer()` with a provider call that receives only the retrieved citations and preserves the evaluation contract.
