# Hero Life Arena

Text-first MVP for:

- locked persona snapshots
- Renown-only public support
- world pack guardrails
- asynchronous 4-seat arena streaming
- tarot-style dating rehearsal
- AgentPit Agent + A2A integration surface

## Local run

```bash
npm run dev
```

Then open:

- `/`
- `/personas`
- `/arena`
- `/dating`
- `/worlds`

## Environment

Copy `.env.example` into `.env.local` when wiring real integrations.

Important variables:

- `AILIANGBIAO_BASE_URL`
- `AILIANGBIAO_PARTNER_TOKEN`
- `AGENTPIT_CLIENT_ID`
- `AGENTPIT_CLIENT_SECRET`
- `AGENTPIT_WEBHOOK_SECRET`

If `AILIANGBIAO_BASE_URL` is not set, the app falls back to a built-in prototype import payload for persona binding.

## Key endpoints

- `POST /api/bind/ailiangbiao/complete`
- `POST /api/personas/import`
- `POST /api/worldpacks/upload`
- `POST /api/matches`
- `POST /api/matches/:matchId/support`
- `POST /api/matches/:matchId/rounds/:round/trigger`
- `GET /api/streams/:streamId`
- `POST /api/dating/dossiers`
- `POST /api/dating/rehearsals`
- `POST /api/privacy/delete-me`
- `GET /api/agentpit/openapi`
- `GET /api/agentpit/skill`
- `POST /api/agentpit/webhooks`
- `POST /api/a2a/create-match`
- `POST /api/a2a/submit-turn`
- `GET /api/a2a/state`
- `GET /api/a2a/health`

## Notes

- Public support uses `Renown` only.
- `Diamonds` are visible in the wallet model but never enter public support.
- Resume and world uploads are cached short-term in `data/app-db.json` and cleaned by TTL.
- Persona deletion ghosts public records and strips PII from local demo storage.
