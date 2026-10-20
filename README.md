# OAuth app setup guides

Look up an app and get a shareable guide to getting your own OAuth app set up and approved: how hard it is, how long it takes (including the approval wait), what can block you, what an agent can do for you, and where you take over.

Built for the Composio APM (toolkits) take-home.

> Status: skeleton. Sections marked TODO are filled in as milestones land.

## Live demo
TODO

## Run locally
```bash
cp .env.example .env.local   # add ANTHROPIC_API_KEY and COMPOSIO_API_KEY
npm install
npm run dev                  # http://localhost:3000
npm run generate -- jira     # build a library guide from the command line
```

## How it works
TODO: pipeline diagram (resolve -> Composio check -> docs + community research + setup attempt -> verify -> write).

## What I learned about the problem
TODO

## Key decisions
See [docs/decisions.md](docs/decisions.md). Scoring rules: [docs/rubric.md](docs/rubric.md).

## How I checked the guides
See [docs/verification-log.md](docs/verification-log.md).

## Limitations
TODO

## Project layout
```
app/                  Next.js pages + /api/generate (streams pipeline progress)
lib/schema.ts         Guide format (zod); every claim carries an evidence label
lib/pipeline/         resolver, docs + community researchers, attempt agent, verifier, writer
lib/composio.ts       Live managed-OAuth check against Composio's toolkit API
data/toolkits/        Snapshot of Composio's managed vs bring-your-own OAuth list
data/guides/          Library guides (JSON)
data/attempts/        Setup-attempt logs and screenshots
docs/                 Rubric, decisions, verification log, account setup
scripts/generate.ts   CLI for library builds
```
