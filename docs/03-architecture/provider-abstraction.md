# Provider Abstraction Layer

The layer that makes PRAMAAN honest, reliable, and configurable. It hides *where* data comes from (real API, faithful mock, scraped snapshot) and *which* AI backend runs, behind stable interfaces selected by config — enabling **live↔mock toggling**, **fallback chains**, and **offline mode**.

Two provider families:
- **Government data providers** (`GovProvider`) — one per check.
- **AI providers** (`LLMProvider`, `OCRProvider`, `EmbeddingProvider`).

---

## 1. Government providers

```python
class GovProvider(Protocol):
    check_key: str                       # "gst", "pan", "udyam", ...
    mode: Literal["live","mock","snapshot"]
    def verify(self, req: VerifyRequest) -> VerifyResult: ...
    # VerifyResult carries: data, source, method, observed_at, confidence, raw
```

Each check has up to three implementations:
| Impl | When used | Example |
|---|---|---|
| `LiveAdapter` | aggregator sandbox available | GST/PAN/MCA/Udyam via Sandbox.co.in |
| `MockAdapter` | no realistic access / offline / demo | EPFO, ESIC, NSIC, BIS, Startup, GeM/OEM |
| `SnapshotAdapter` | public data, no API | debarment (World Bank + CPPP) |

**Provenance:** every `verify()` records a `provider_call` (mode, endpoint, latency) and stamps the result with `source/method/observed_at` → shown as a badge in the UI (`LIVE` / `SIMULATED` / `SNAPSHOT`).

**Mock fidelity:** mock responses mirror the **exact field names** of the real aggregator/portal payloads (from the API-availability research), so swapping mock→live later is a config change, not a rewrite. Mocks are **deterministic** (keyed by input id) for reproducible demos.

### Live vs Mock vs Snapshot decision (from research)
| Check | Default mode | Notes |
|---|---|---|
| GST, PAN, MCA, Udyam, DigiLocker, Bank | **live** (sandbox) → mock fallback | Sandbox.co.in / Cashfree |
| EPFO, ESIC, NSIC, BIS, Startup India, GeM/OEM | **mock** | No student-accessible API |
| Debarment/blacklist | **snapshot** | World Bank + CPPP scrape → local fuzzy search |

---

## 2. AI providers

All chat-style backends speak the **OpenAI-compatible** API, so one adapter covers Groq/OpenRouter/Together/Cerebras/Ollama; only Gemini and OCR engines need bespoke adapters.

```python
class LLMProvider(Protocol):
    def complete(self, messages, *, json_schema=None, **kw) -> LLMResult: ...
class OCRProvider(Protocol):
    def extract(self, file_bytes, *, hints=None) -> OCRResult: ...   # {text, blocks, tables, fields}
class EmbeddingProvider(Protocol):
    def embed(self, texts: list[str]) -> list[Vector]: ...
```

**Fallback chain with retry-on-429/5xx/timeout:**
```python
def run_with_fallback(chain, call):
    last = None
    for provider in chain:
        try:
            return call(provider)
        except (RateLimit, ProviderError, Timeout) as e:
            last = e; continue
    raise AllProvidersFailed(last)
```

---

## 3. Configuration (`providers.yaml`)

A single config file drives everything; secrets come from env. A starter lives at repo root as [`providers.example.yaml`](../../providers.example.yaml).

```yaml
mode_defaults: { government: live_then_mock, offline: false }

government:
  gst:    { chain: [sandbox_gst, mock_gst] }
  pan:    { chain: [sandbox_pan, mock_pan] }
  mca:    { chain: [sandbox_mca, mock_mca] }
  udyam:  { chain: [sandbox_udyam, mock_udyam] }
  digilocker: { chain: [sandbox_digilocker, mock_digilocker] }
  epfo:   { chain: [mock_epfo] }
  esic:   { chain: [mock_esic] }
  nsic:   { chain: [mock_nsic] }
  bis:    { chain: [mock_bis] }
  startup:{ chain: [mock_startup] }
  oem:    { chain: [mock_oem] }
  debarment: { chain: [snapshot_debarment] }

llm:
  chain: [gemini_flash, groq_gptoss, openrouter_free, ollama_local]
  providers:
    gemini_flash:    { type: gemini,        model: "gemini-2.5-flash", api_key_env: GEMINI_API_KEY }
    groq_gptoss:     { type: openai_compat,  base_url: "https://api.groq.com/openai/v1",     model: "openai/gpt-oss-120b", api_key_env: GROQ_API_KEY }
    openrouter_free: { type: openai_compat,  base_url: "https://openrouter.ai/api/v1",       model: "meta-llama/llama-3.1-8b-instruct:free", api_key_env: OPENROUTER_API_KEY }
    ollama_local:    { type: openai_compat,  base_url: "http://localhost:11434/v1",          model: "qwen3:8b", api_key_env: NONE }

ocr:
  chain: [gemini_vision, paddleocr_local, docai_cloud]
  providers:
    gemini_vision:   { type: gemini_vision,  model: "gemini-2.5-flash" }
    paddleocr_local: { type: paddleocr,      pipeline: "PP-StructureV3", lang: "multi" }
    docai_cloud:     { type: google_document_ai, processor_env: DOCAI_PROCESSOR }

embeddings:
  chain: [bge_m3_local, gemini_embed]
  providers:
    bge_m3_local:    { type: sentence_transformers, model: "BAAI/bge-m3" }
    gemini_embed:    { type: gemini,        model: "gemini-embedding-001" }

vectordb: { type: pgvector }          # or { type: chroma, path: "./.chroma" }

forgery:
  steps: [metadata_exiftool, pdf_incremental_check, ela, copy_move, trufor_optional, llm_field_crosscheck]
```

---

## 4. Operational behaviors
- **Live↔mock toggle (UI + config):** judges can flip GST from `live` to `mock` on stage.
- **Offline mode:** `mode_defaults.offline: true` forces all AI chains to local (Ollama/PaddleOCR/bge-m3) and all gov providers to mock/snapshot → **zero internet**.
- **Caching:** gov responses cached per `(check_key, id, mode)` with TTL; OCR cached per `file_hash`.
- **Rate-limit safety:** per-provider RPM budget + backoff; automatic promotion to next in chain.
- **Observability:** every call → `provider_call` row (mode, latency, status) for the audit trail and the "which source served this" badge.

## 5. Why this wins points
- **Honesty:** the UI literally labels what's real. Survives judge scrutiny.
- **Reliability:** fallback + offline = demo can't die.
- **Extensibility:** adding a new check = implement one interface + add fixtures; adding a new LLM = one config line.
- **Production story:** the same interface swaps sandbox → GSP/authorized-entity prod keys with no app changes.
