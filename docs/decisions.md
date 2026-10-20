# Product decisions

Log of decisions and why. Feeds the README.

1. **Lead with the verdict, not the steps.** Composio already publishes credential-setup walkthroughs. What developers cannot find is how long approval takes and what blocks it, so every guide opens with difficulty, time to testing, time to production and the main blocker.
2. **Nothing gated behind questions.** The full guide renders immediately. Guided setup is optional.
3. **One engine.** Library guides are cached outputs of the same pipeline that runs live, so every library guide is evidence the live path works.
4. **Per toolkit, not per company.** LinkedIn is Composio-managed, LinkedIn Ads is bring-your-own; Google Drive is managed, Google Admin is not. Different scopes, different gates.
5. **Evidence on every claim.** Tested / official / community / unknown. Approval times usually live only in community reports, so they are labelled as such.
6. **The agent never touches the developer's provider login.** It prepares values, links and drafts; the developer does anything behind their sign-in. Keeps credentials out and keeps the live demo reliable.
7. **"Do you even need your own app?" comes first**, answered live from Composio's API.

## Observations from the Composio toolkit list (2026-10-19)

- 123 toolkits have Composio-managed OAuth; 211 need the developer's own app.
- 102 of the 211 are MCP servers. **Verified 2026-10-20: 99 of those 102 use `DCR_OAUTH`** (dynamic client registration: the client registers itself with the MCP server, so the developer creates no OAuth app at all). Source: the Auth line of every toolkit's docs page, saved in `data/toolkits/byo-auth-schemes.json`; live metadata of the Notion, Atlassian and Linear MCP servers shows a `registration_endpoint`. The three exceptions are BOX_MCP and RAILWAY_MCP (OAUTH2) and MONGODB_MCP (S2S_OAUTH2).
- So Composio's "bring your own OAuth app" list overstates the setup work for nearly half its entries. The guide format has a `not_needed` verdict for exactly this case, and the Notion MCP guide is the worked example. Composio's own pages disagree with each other here too: the directory files these under bring-your-own, while each toolkit page says DCR_OAUTH.

## Lessons from writing the Jira gold guide by hand (2026-10-19)

These change how the pipeline has to work.

1. **Old forum posts describe rules that no longer apply.** 2020 threads say Atlassian approval was *required* before sharing and took months. A 2023 staff answer says sharing is self-serve and unreviewed apps only show a warning. The community researcher must record post dates and give recent sources more weight; the verifier must flag claims that rest only on sources more than two years old.
2. **Composio's own docs contradict each other.** The managed-OAuth directory lists Jira as managed; the Jira credentials guide says it is not. Guides must never take one Composio page as truth: the live toolkit API decides, and conflicts become a stated unknown.
3. **Redirect URIs in docs go stale.** Composio's Jira guide shows a /api/v1/ path its knowledge base calls legacy. Guides tell developers to copy the URI from their dashboard, never hard-code one.
4. **The strongest "bring your own app" reason is a number.** Atlassian gives each OAuth app one 65,000-point hourly quota shared across every site it is used on (since March 2026). Researchers should look for quota and rate-limit rules on every provider: that is where a shared managed app hurts most.
5. **Provider review is often optional.** For Jira, review only removes a warning. The rubric scores what blocks going live, so Jira is level 2, not 3.
6. **Some steps cannot be automated by anyone.** Atlassian has no API for creating OAuth apps. The attempt agent's job is to find these walls; the guide's "you must" list comes from them.

## Cost: the first full run cost about $100 (2026-10-20)

The first end-to-end pipeline run on Jira (one long docs agent, one long community agent, one verifier over 82 findings, all on the largest model at high effort) spent roughly $100 and then failed in the writer step. Causes, and what changed:

1. **Context grew with every page.** Each agent step re-sent every page already fetched, so cost grew roughly with the square of pages read. Fix: server-side context editing clears old tool results once an agent passes 30k input tokens (findings are recorded as tool inputs, so nothing is lost), and each fetch is capped at 8k tokens instead of 25k.
2. **No spend cap.** Fix: every run has a hard budget (default $2, `MAX_COST_PER_RUN_USD`); all agents in a run share it and stop when it is reached.
3. **No checkpoints.** A late failure threw away all research. Fix: the CLI saves each stage and `--reuse` resumes.
4. **No cheap test first.** Fix (process): measure on one small run before any full run.
5. **Writer schema too large for strict structured outputs.** Fix: schema in the prompt, zod validation, one repair turn.

The library guides were then researched with Claude Code agents instead, and the API pipeline is reserved for live generation.

## Lesson: page summarisers invent details (2026-10-20)

A page-summary fetch of Composio's NOTION_MCP page reported that "developers must provide their own OAuth credentials (client ID and secret)". The raw page says only `Auth: DCR_OAUTH` and `Composio-managed OAuth available? No`. The summariser made the sentence up. This is why every claim in a guide must carry an exact quote from the page, and why the verifier re-opens the source instead of trusting a summary.

## Cost, second incident: a capped test overspent (2026-10-20)

A live-profile test on Linear with a $1.50 cap spent about $4 before it was killed by hand. Two causes:
1. **The cap was checked only between model calls.** Seven agents ran in parallel and each call can run several server-side searches and fetches, so each agent finished its in-flight call after the cap was hit. Fix: every run shares one AbortController; the first agent to cross the cap cancels every in-flight call in the run.
2. **The script and the pipeline had separate copies of the budget module** (tsx loads `.mts` scripts as ESM and `lib/` as CJS), so the script's $1.50 cap was invisible to the agents, which fell back to a global $2 default. Fix: scripts import `withBudget` through `@/lib/pipeline`, and a model call outside `withBudget()` now throws instead of falling back to a default.

Also changed: live generation runs on the smaller model (Sonnet 5) with 4 agents instead of 7, 3 searches and 3 fetches per agent, 6k-token pages, and no model call for the Composio check (the toolkit page's Auth and managed lines are read directly and become quoted findings). Live cap $1, thorough cap $3.

## Redesign: the model never browses (2026-10-20)

Agents that browse on their own are the expensive part of an LLM pipeline: every search result and fetched page stays in context and is re-read on every step. The pipeline now works like this:

1. **Resolve** (small model, at most 3 searches): identify the app and pick 5-8 official, Composio and community URLs.
2. **Composio, attempt, read** (plain code, free): read the toolkit page's Auth and managed lines, open the app registration page without signing in, download every chosen page and keep only the paragraphs that match OAuth-setup keywords.
3. **Extract** (one model call): quoted facts from the page excerpts.
4. **Check** (plain code, free): drop any fact whose quote is not on its page; set the evidence label from the page's domain (provider docs and Composio pages official, forums official only for staff posts, everything else community). The model never labels its own evidence.
5. **Write** (one model call).

First test (Linear, live profile, Sonnet 5): **$0.32, 3 minutes**, 30 checked facts, 1 dropped by the quote check. The browsing design spent $1.93 on Linear without finishing, and about $100 on Jira.
