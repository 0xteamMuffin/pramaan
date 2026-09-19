# Research — Free / Low-Cost AI Providers (LLM · OCR · Embeddings · Forgery)

> **Scope:** OCR + field extraction from certificates (PDF/image), LLM compliance reasoning, cross-checking, embeddings/RAG, forgery detection — optimized for ~₹0 budget and a **reliable live demo**, via a **pluggable provider layer**.
> **Currency:** pages fetched 2026 (env date Sep 2026). Free-tier limits change often — **re-verify the day before demo.**

> ⚠️ **Two 2026 changes that break older SIH tutorials:**
> - **GitHub Models is retired** (as of Jul 30, 2026). Don't design around it.
> - **Hugging Face free Inference is token-metered** now — Free ≈ **$0.10/month** credits ($2 PRO). No longer a viable free API.

---

## A) LLM APIs with FREE tiers

| Provider | Free limit | Free-tier models | Best for | Live-demo risk |
|---|---|---|---|---|
| **Google Gemini (AI Studio key)** | Free tier; per-model RPM/RPD shown in AI Studio (historically Flash ~10–15 RPM / 250–1000 RPD; ~250K–1M TPM). Free data used for training; not in some EEA/UK regions. | Gemini 2.5 Flash / Flash-Lite / Pro + 3.x Flash — **all multimodal (vision)**; Gemini Embedding | **Best "one key does everything"**: reasoning + doc vision OCR + embeddings | Low–moderate (occasional 429s → keep fallback) |
| **Groq** | Free plan per-model, e.g. `openai/gpt-oss-120b` & `20b`: **30 RPM, 1000 RPD, 8K TPM, 200K TPD**; Whisper 20 RPM/2K RPD. *(Llama models now enterprise-gated on Groq.)* | GPT-OSS 120B/20B, Qwen3-class, Whisper | **Fastest tokens/sec (~500–1000 t/s)** → snappy demo, structured output, tool use | Low latency risk; **1K RPD cap** tight for batch |
| **OpenRouter** | `:free` models: **20 RPM**; **50 RPD** (or **1000 RPD** if you've bought ≥$10 lifetime) | Rotating free open models (Llama/Qwen/Gemma/DeepSeek/Mistral) | **One API → many models**; ideal "pluggable" backbone + failover | Free models rotate/deprecate — don't hard-code one |
| **Mistral (La Plateforme)** | Free "Experiment" tier: ~1 req/s, 500K tok/min, ~1B tok/month (phone verify + data opt-in); Studio free plan $10/mo credits | Mistral Small/Medium, **Mistral OCR**, Voxtral, Codestral | Generous monthly budget; **best-in-class OCR** (see B) | Data-training opt-in; EU-centric |
| **Cerebras** | **Trial only: $5, 30-day expiry**; 5 RPM, 30K TPM, 1M TPD | gpt-oss-120b, qwen-3.8-27b | Extremely fast short eval | **High** — credits expire; not "always free" |
| **Together / Cohere / HF** | Together ~$1–5 signup credit; **Cohere trial 1000 calls/mo** (+ free Rerank/Embed!); HF ~$0.10/mo | varies | Cohere **Rerank + Embeddings** are the real gems | Credit-limited |
| **GitHub Models** | **RETIRED** | — | — | Do not use |

**Takeaways (reasoning):** Gemini free = best default (reasoning + vision + embeddings in one key). Groq = best speed fallback. OpenRouter = best pluggability backbone. Cerebras/Together/HF = eval-only.

---

## B) OCR / Document AI (text + structured fields from certificates)

### Open-source (runs locally, zero marginal cost)
| Tool | License | Indic support | Tables/layout/stamps | Notes |
|---|---|---|---|---|
| **PaddleOCR** (PP-OCRv6, PaddleOCR-VL 0.9B, PP-StructureV3) | Apache 2.0 | **Excellent** (109+ langs incl. Devanagari, Bengali, Tamil, Telugu; **seal/stamp recognition**) | Yes — tables, layout, formulas, seals, charts → MD/JSON | **Best open-source for Indian govt docs**, runs CPU/GPU |
| **Surya / Chandra** (Datalab) | Apache 2.0 code | 91 langs (Hindi/Bengali) | Layout, reading order, tables, math | Strong second; managed API gives $5 credits |
| **Tesseract** | Apache 2.0 | Many incl. Indic | Weak on tables | Mature, light, lower accuracy on noisy scans |
| **EasyOCR / docTR** | Apache 2.0 | EasyOCR 80+ (Devanagari); docTR Latin-strong | Basic / good pipeline | Easy to use |

### Vision-Language extraction (image → JSON directly)
- **Gemini Flash (free)** — send certificate image/PDF, ask for JSON fields. Multilingual + layout + reasoning in one call → best "free + easy" extractor.
- **Mistral OCR** — purpose-built doc OCR (handwriting, tables, MD/JSON); free via console playground + $10/mo credits.
- **Local VLMs** (Qwen-VL / PaddleOCR-VL / Surya) via Ollama/vLLM — offline extraction.

### Cloud Document AI free tiers
| Service | Free allowance | Best for |
|---|---|---|
| **Google Document AI** | First **1000 pages/mo free per processor** + $300/90-day GCP trial | Structured extraction, ID parsers |
| **AWS Textract** | Free 3 months (1000 pages OCR/mo; Analyze ID 100/mo) | Forms/tables/ID key-value |
| **Azure Document Intelligence** | Free F0 ≈ 500 pages/mo | Prebuilt ID/invoice models |

**Best for Indian govt docs:** (1) PaddleOCR-VL/PP-StructureV3 offline (seals + Indic + tables); (2) Gemini Flash vision (free, JSON); (3) Google Document AI / Textract free tiers for high-confidence ID fields.

---

## C) Supporting infra (free / open-source)

**Embeddings / RAG:** `bge-m3` (local, multilingual 100+ langs, dense/sparse/ColBERT) = **best free multilingual default**; `multilingual-e5-large` alt; Gemini embeddings when online; Cohere Embed+Rerank (free trial) for top-k precision. `sentence-transformers all-MiniLM` for fast English.

**Vector DB:** **Chroma** (embedded, simplest for demo) · **pgvector** (if already on Postgres — one DB for app + vectors) · **Qdrant** (hybrid filter, free 1GB cloud) · FAISS (in-memory).

**Local LLM runtime — Ollama** (the demo insurance): reasoning (Qwen3 7B, Llama 3.x 8B, Gemma 2/3 9B, Phi-4-mini); vision (`qwen2-vl`, `llava`, `minicpm-v`); embeddings (`nomic-embed-text`, `bge-m3`). **Why it matters: a locally cached model means the demo works even if venue Wi-Fi dies or a free API 429s.**

**Forgery / tamper detection (layered — no single tool is definitive):**
| Layer | Tool | Catches |
|---|---|---|
| Metadata/provenance | **ExifTool**, **PyMuPDF**, **pikepdf**, pdfid/pdf-parser | Photoshop edits, mismatched dates, **PDF incremental-update saves** (classic tamper), spoofed producers |
| Pixel forensics | **ELA** (Pillow/ImageMagick), noise/quantization | Spliced/pasted regions |
| Copy-move | OpenCV SIFT/ORB | Duplicated seals/signatures/text |
| Deep localization | **TruFor**, **PhotoHolmes**, **Sherloq** | Learned manipulation heatmaps (GPU) |
| Semantic | LLM + RAG over reference records | Field inconsistencies, impossible dates, fake authority names |

---

## D) Recommended DEFAULT stack + fallbacks (demo-reliable)

> **Design principle:** every capability has a **cloud-free primary + offline-local fallback**, so a dead network never kills the demo.

```yaml
# providers.yaml (config-driven; swap providers without touching app code)
llm:
  chain: [gemini_flash, groq_gptoss, openrouter_free, ollama_local]
ocr:
  chain: [gemini_vision, paddleocr_local, docai_cloud]
embeddings:
  chain: [bge_m3_local, gemini_embed]
vectordb: chroma            # or pgvector if Postgres
forgery:
  steps: [metadata_exiftool, pdf_incremental_check, ela, copy_move, trufor_optional, llm_field_crosscheck]
```

Because Groq, OpenRouter, Together, Cerebras and Ollama all speak the **OpenAI-compatible API**, a single `openai_compat` adapter covers most — only Gemini + OCR engines need special adapters.

**Why it's right for SIH:** $0 steady-state (Gemini free + local Paddle/bge-m3/Chroma/Ollama); reliable (offline fallbacks — runs fully offline); Indian-doc fit (Paddle/Surya + bge-m3 handle Indic + tables + seals); pluggable (judges see Gemini→Groq→local swap live); explainable forgery evidence (metadata diffs, ELA heatmaps, field mismatches).

**Avoid list (2026):** ❌ GitHub Models (retired); ❌ HF free Inference as workhorse; ⚠️ Cerebras/Together (expiring credits); ⚠️ Groq Llama (enterprise-gated → use gpt-oss instead).

---

## Primary source URLs
- Gemini: ai.google.dev/gemini-api/docs/rate-limits · /pricing
- Groq: console.groq.com/docs/rate-limits · /models
- OpenRouter: openrouter.ai/docs/api-reference/limits
- Mistral: mistral.ai/pricing · /solutions/document-ai
- Cerebras: inference-docs.cerebras.ai/support/rate-limits · Together: together.ai/pricing · Cohere: docs.cohere.com/docs/rate-limits · HF: huggingface.co/docs/inference-providers/en/pricing
- Textract: aws.amazon.com/textract/pricing · Document AI: cloud.google.com/document-ai/pricing · Azure: azure.microsoft.com/en-us/pricing/details/ai-document-intelligence
- PaddleOCR: github.com/PaddlePaddle/PaddleOCR · Surya: github.com/datalab-to/surya · Tesseract/EasyOCR/docTR
- Embeddings: sbert.net · github.com/FlagOpen/FlagEmbedding · Vector DBs: pgvector, trychroma.com, qdrant.tech · Ollama: ollama.com
- Forensics: exiftool.org · github.com/photoholmes/photoholmes · github.com/grip-unina/TruFor · github.com/GuidoBartoli/sherloq
- Free-tier tracker: github.com/cheahjs/free-llm-api-resources
