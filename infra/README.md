# Infra

Local/demo deployment. Production path is documented (not built) in [`docs/03-architecture/system-architecture.md`](../docs/03-architecture/system-architecture.md#5-deployment-view).

```
infra/
└── docker/     # Dockerfiles + docker-compose (web, api, db[pgvector], optional ollama)
```

## Planned one-command spin-up
```bash
docker compose -f infra/docker/docker-compose.yml up
# web  -> :3000   api -> :8000   db -> :5432   ollama -> :11434 (optional, offline mode)
```

Services:
- **web** — Next.js frontend
- **api** — FastAPI backend + background workers
- **db** — Postgres 16 + pgvector
- **ollama** *(optional)* — local LLM/OCR fallback for offline demo safety
