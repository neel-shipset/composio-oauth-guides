# OAuth App Guides

Look up any app and get a shareable guide to getting **your own OAuth app** set up and approved: how hard it is, how long it takes including the approval wait, what can block you, what an agent can do for you and where you have to take over. Every claim is labelled **tested**, **official**, **community** or **unverified**, and links to its source.

Built for the Composio APM (toolkits) take-home.

- **Live:** TODO (Vercel link)
- **Library:** 9 guides, difficulty 2 to 5: GitHub, Jira, Notion MCP, X, Zoom, Gmail, Slack, Shopify, LinkedIn Ads
- **Live generation:** type any app; about $0.30 and 2-3 minutes per new guide

## The problem, as I understood it

A developer on Composio starts on Composio's managed OAuth app. To go to production they usually need their own: their name on the consent screen, their own scopes, their own quota. For 211 toolkits there is no managed app at all.

Composio already publishes step-by-step credential walkthroughs. What a developer cannot find is the answer to the planning question: **can I get this approved before my launch, and what will stop me?** That answer is spread across policy pages, forum threads and changelogs, and it changes. So every guide leads with a verdict (difficulty, time to testing, time to production, main blocker), and the click-by-click steps come after.

## What a guide contains

1. **Verdict:** difficulty 1-5 on a fixed rubric ([docs/rubric.md](docs/rubric.md)), time to testing, time to production, main blocker, confidence.
2. **Do you need your own app?** Required / recommended for production / not needed, with concrete reasons (for example Atlassian's single 65,000-point hourly quota shared by every site an app is used on).
3. **Stages and steps**, each tagged *agent can do*, *you do* or *either*, with copy-paste values and the reason a human is needed.
4. **Requirements, blockers** (what you see, how to fix it) and **unknowns**, each unknown with a ready-to-send email to the right team.
5. **Sources**, every claim numbered and colour-coded by evidence.
6. **Share:** link, copy as Markdown, copy for Slack, download .md. **Guided setup:** a checklist that remembers progress, with an "I'm stuck" assistant.

## What I learned

- **Half of Composio's "bring your own app" list needs no app.** 102 of the 211 bring-your-own toolkits are MCP servers, and 99 of those use dynamic client registration (`DCR_OAUTH` on each toolkit page): the client registers itself, so the developer creates nothing. I read the Auth line of all 211 toolkit pages ([data/toolkits/byo-auth-schemes.json](data/toolkits/byo-auth-schemes.json)) and checked the live OAuth metadata of the Notion, Atlassian and Linear MCP servers. The Notion MCP guide is the worked example.
- **Review is often not the blocker.** Jira and GitHub need no review; the blockers are customer-side (Atlassian site admins and GitHub org owners who must approve apps). Slack's real gate is a rate limit (1 history request per minute for apps outside the Marketplace). X's is price, not approval.
- **The best reason to bring your own app is often a number.** Atlassian: one 65k-point hourly quota per app across all tenants. GitHub: 2,000 token requests per hour per app. On a shared managed app, every Composio customer draws on the same limit. For Zoom and Shopify, limits are per customer account, so this reason does not apply, and the guides say so.
- **Sources go stale and contradict each other.** 2020 Atlassian forum posts describe a mandatory approval that no longer exists. Composio's own pages disagree on whether Jira is managed and on which redirect URI to use. Zoom's docs disagree on whether beta apps can reach outside users. Guides state these conflicts instead of picking a side silently, and never hard-code a redirect URI.

## How it works

```
query ──▶ resolve      small model + ≤3 web searches: identify the app, pick 5-8 pages
      ──▶ composio     code: read the toolkit page's Auth and managed lines
      ──▶ attempt      code: open the app registration page without signing in
      ──▶ read         code: download the pages, keep only OAuth-relevant paragraphs
      ──▶ extract      one model call: facts, each with an exact quote
      ──▶ check        code: drop any fact whose quote is not on its page; set evidence from the source
      ──▶ write        one model call: the guide, citing only checked facts
```

The model never browses and never labels its own evidence. Evidence comes from where the quote was found: provider docs and Composio pages are official, forum posts are official only when written by provider staff, everything else is community. The writer can only cite facts it was given; anything else important becomes an unknown.

**Library guides** were researched in more depth by Claude Code agents (one per app) following the same format, then spot-checked by me against their sources. **Live guides** come from the pipeline above.

## Key decisions

Full log with reasons: [docs/decisions.md](docs/decisions.md). The main ones:

1. **Verdict first, steps second.** The planning question is the gap; walkthroughs already exist.
2. **Difficulty measures the approval path only.** Price and usage limits go in the summary and main blocker, shown next to the score. One meaning across 100 guides.
3. **Per toolkit, not per company.** LinkedIn is managed by Composio; LinkedIn Ads needs your own app and an Advertising API review.
4. **The agent never touches the developer's provider login.** It prepares values, links and drafts; the developer does anything behind their sign-in.
5. **Nothing gated behind questions.** The full guide renders at once; guided setup is optional.
6. **Code verifies, not a second model.** Cheaper and stricter: a page-summary tool once invented a sentence about a Composio page during research. A quote check cannot be talked into that.

## How I checked the guides

[docs/verification-log.md](docs/verification-log.md) records each hand check: the claim, what the guide said, what the source actually says, and any fix. Examples:

- **Confirmed verbatim:** GitHub's 8-hour expiring tokens (changelog 2026-08-14) and 2,000/hour token cap, LinkedIn's "up to 30 business days" Standard tier review, Slack's 1 request/minute history limit, Shopify requirement 2.3.1, Google's prompt-injection requirement for restricted Gmail scopes.
- **Corrected:** the Zoom guide said beta apps are limited to your own account; another Zoom page allows sharing with outside users after Zoom approves it. The guide now states the conflict.
- **Resolved:** whether Composio manages Jira (yes, per the toolkit page; an older credentials page says no).
- **In the pipeline:** the Linear test run extracted 31 facts; the code check dropped 1 whose quote was not on its page.

## Limitations

- **No signed-in setup attempts.** The attempt step opens the registration page without an account and records where it stops (usually a sign-in wall). Clicking through a real developer console with a test account would turn more claims into "tested"; it is the next thing I would build.
- **Setup times are estimates.** Minutes of console work are labelled as estimates. Approval waits come from provider statements or dated community reports.
- **Composio's default scopes are not public** for most toolkits, and my Composio key could not call the toolkit API, so several guides leave the scope list as an unknown.
- **Pages that only render in a browser** cannot be read by the plain downloader and are skipped; the run log lists them.
- **Live guides are less deep than library guides:** 5-8 pages and a smaller model, to keep a run around $0.30.
- **Cost history.** My first version let agents browse freely on the largest model; one Jira run cost about $100. That led to the redesign above, a hard per-run spend cap that cancels every in-flight call, and checkpoints. Details in docs/decisions.md.

## Using this inside Composio

The same pipeline is a research tool for the toolkits team:

- **Triage the 211 bring-your-own toolkits:** 99 DCR toolkits need no developer setup; the rest can be batch-generated (about $0.30 each) and sorted by difficulty.
- **Keep guides fresh:** rerun monthly and diff the verdicts; a changed difficulty or a dropped quote is a signal that a provider changed its rules.
- **Metrics:** guides by difficulty, share of claims that are tested or official, open unknowns per toolkit, days since last check.

## Run locally

```bash
cp .env.example .env.local     # add ANTHROPIC_API_KEY
npm install
npm run dev                    # http://localhost:3000

npm run generate -- linear --live                 # one guide, capped at $1
npm run generate -- linear --reuse --redo=write   # rerun only the writer
npm run check-guide -- data/guides/jira.json      # schema + claim references
```

Spend caps: live runs $1, thorough runs $2 (`lib/pipeline/profile.ts`). The live endpoint is rate limited per IP. Keys stay in `.env.local` (git-ignored).

## Project layout

```
app/                    pages, /api/generate (streams progress), /api/stuck
lib/pipeline/           discover, composio-page, probe, pages, extract, writer, index
lib/schema.ts           guide format (zod)
data/guides/            library guides (JSON)
data/generated/         live-generated guides
data/toolkits/          Composio's managed vs bring-your-own lists, auth schemes of all 211
docs/                   rubric, decisions, verification log
```
