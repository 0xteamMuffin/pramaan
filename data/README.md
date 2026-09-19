# Data — Synthetic Fixtures, Generators & Blacklist Snapshots

All data here is **synthetic** (fake but format-valid) or **public snapshots**. No real PII. Spec: [`docs/05-data/dummy-dataset-spec.md`](../docs/05-data/dummy-dataset-spec.md).

```
data/
├── generators/     # gen_ids.py, gen_bidders.py, gen_documents.py, gen_tenders.py, seed.py
├── fixtures/       # generated bidders/tenders + gov/ mock responses (per check/id)
│   └── gov/         # mock adapter payloads mirroring real aggregator field names
└── blacklists/     # debarment snapshots (World Bank + CPPP) as CSV/JSON + capture date
```

## Generate & seed (planned)
```bash
python data/generators/seed.py --reset   # idempotent; deterministic (fixed seed)
```

## Rules
- Format-valid IDs (PAN/GSTIN/Udyam/CIN/DIN) so real validation runs.
- Cross-linked via PAN so consistency checks are meaningful.
- Planted frauds map 1:1 to detectors (forgery, mismatch, debarment, shell, cartel).
- Deterministic → reproducible demos + regression tests (golden outcomes table in the spec).
