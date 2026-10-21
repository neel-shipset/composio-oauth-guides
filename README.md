# OAuth App Guides

**How hard is it to get your own OAuth app approved, and what will stop you?**

A developer building an AI agent on Composio types in an app (Jira, Gmail, Slack, anything) and gets a shareable guide. The guide answers the planning question first: how long until real users can connect, and what could block it. Then it gives the steps, says which ones an agent can do and which need a person, and links every claim to its source.

- **Live:** https://oauth-guides-neel.vercel.app
- **Try it:** open a library guide such as [Slack](https://oauth-guides-neel.vercel.app/guide/slack) or [Gmail](https://oauth-guides-neel.vercel.app/guide/gmail), or type an app that is not in the library and watch it get researched live (two to three minutes).
- **Built for:** the Composio APM (toolkits) take-home.

## Contents

1. [Terms used here](#terms-used-here)
2. [The problem](#the-problem)
3. [What a guide contains](#what-a-guide-contains)
4. [What I found](#what-i-found)
5. [How it works](#how-it-works)
6. [How accuracy is enforced](#how-accuracy-is-enforced)
7. [Key decisions](#key-decisions)
8. [Cost and safety](#cost-and-safety)
9. [Limitations](#limitations)
10. [Using this inside Composio](#using-this-inside-composio)
11. [Run it locally](#run-it-locally)
12. [Project layout](#project-layout)

## Terms used here

| Term | Meaning |
|---|---|
| **OAuth app** | The registration a developer creates with a provider (Google, Slack, Atlassian) so their users can click "Connect" and grant access. It holds the app's name, permissions (scopes) and callback address. |
| **Toolkit** | Composio's integration for one app, such as the Jira toolkit. |
| **Composio-managed OAuth** | Composio already has an OAuth app for this toolkit, so developers can connect users with no setup. Composio lists 123 such toolkits. |
| **Bring your own OAuth app** | Composio has no OAuth app for this toolkit, so the developer must register one with the provider. Composio lists 211 such toolkits. |
| **Provider review / verification** | A check by the provider (for example Google or Zoom) before an OAuth app may be used by people outside the developer's own account. |
| **MCP server** | A hosted endpoint that AI agents connect to, such as Notion's or Linear's. |
| **Dynamic client registration (DCR)** | A feature of the MCP standard: the client registers itself automatically, so nobody has to create an OAuth app by hand. |
| **Evidence label** | Each claim in a guide is marked *tested* (we observed it), *official* (the provider's own docs or staff), *community* (forums, blogs, reported experiences) or *unverified* (an estimate or an open question). |

## The problem

A developer starts on Composio's managed OAuth app because it works with no setup. Before launch, they usually need their own: so users see the developer's product name on the "allow access" screen instead of Composio's, and so they get their own scopes and their own usage limits. For 211 toolkits there is no managed option at all.

Creating an OAuth app is quick, and Composio already documents the clicks. **Getting it approved for real users is where launches slip**, and the effort varies enormously:

| App | Time until outside users can connect | What stands in the way |
|---|---|---|
| GitHub | Same day | No review. Customers' GitHub organisations must approve the app. |
| Zoom | 1 to 6 weeks | Mandatory review by Zoom before anyone outside your account can connect. |
| Gmail | 2 to 12 weeks | Google verification, plus a paid yearly security assessment for reading email. |
| LinkedIn Ads | 1 to 16 weeks, or never | LinkedIn vets the company and can refuse access. |

That planning answer is spread across policy pages, forum threads and changelogs, and it changes over time. This project puts it in one place, per app.

## What a guide contains

| Section | What it tells the developer |
|---|---|
| **Verdict** | Difficulty on a fixed 1 to 5 scale ([rubric](docs/rubric.md)), time to testing, time to production (including approval waits), the main blocker, and a confidence level. |
| **Do you need your own OAuth app?** | Required, recommended for production, or not needed, with concrete reasons. |
| **Stages and steps** | What to do, in order. Each step is marked *agent can do*, *you do* or *either*, with the reason a person is needed (usually a sign-in or a legal declaration) and values ready to copy. |
| **Requirements and blockers** | What the provider asks for, and the errors you might hit (what you see, and the fix). |
| **What an agent can do, and what you must do** | A two-column summary of the hand-off. |
| **Not yet known** | Open questions, each with who to ask and a ready-to-send email. |
| **Sources and evidence** | Every claim, numbered, with its evidence label and a link. The numbers appear as small markers next to each statement. |

Each guide can be shared as a link, copied as Markdown or as a Slack message, or downloaded. **Guided setup** turns the steps into a checklist that remembers progress, with an "I'm stuck" assistant: paste the error you see and it suggests a fix based on the guide.

The difficulty score measures **the approval path only**. Price and usage restrictions (for example, X bills every API call) go in the summary and main blocker, which are shown next to the score. That keeps the scale meaning one thing across every app.

## What I found

**1. About half of the "bring your own OAuth app" list does not need an OAuth app at all.**
Of the 211 bring-your-own toolkits, 102 are MCP servers. Composio's own toolkit pages mark 99 of those 102 as using dynamic client registration (`DCR_OAUTH`), so the client registers itself and there is nothing for the developer to create or get approved. I read the auth scheme of all 211 toolkit pages ([data/toolkits/byo-auth-schemes.json](data/toolkits/byo-auth-schemes.json)) and checked the live OAuth metadata of the Notion, Atlassian and Linear MCP servers. The exceptions are BOX_MCP, RAILWAY_MCP and MONGODB_MCP. The [Notion MCP guide](https://oauth-guides-neel.vercel.app/guide/notion_mcp) is the worked example.
*Why it matters:* Composio's list currently implies setup work for nearly half its entries that does not exist.

**2. Provider review is often not the real blocker.**
Jira and GitHub need no review; the gate is the customer's own admin, who may have to approve the app. Slack's real gate is a usage limit: until Slack approves your app, an agent can read message history only once a minute, 15 messages at a time. For X it is price.
*Why it matters:* "how long is the review?" is often the wrong question, so each guide names the actual blocker.

**3. The strongest reason to bring your own OAuth app is often a usage limit shared by everyone on the managed app.**
Atlassian gives each OAuth app one 65,000-point hourly API budget across every company that uses it. GitHub allows each OAuth app 2,000 token requests per hour. On a shared managed app, every Composio customer draws from the same limit. For Zoom and Shopify the limits are per customer, so this reason does not apply there, and those guides say so.

**4. Sources go out of date and contradict each other.**
Atlassian forum posts from 2020 describe a mandatory approval that no longer exists. Composio's own pages disagree on whether Jira is managed and on which callback address to use. Zoom's documentation disagrees with itself on whether a test app can be shared with outside users. Guides state conflicts rather than silently picking a side, and never hard-code a callback address.

## How it works

There are two ways a guide gets made:

- **Library guides** (9 apps, in [data/guides/](data/guides/)): researched in depth by one AI research agent per app, following the same format, then checked by hand against the original pages ([verification log](docs/verification-log.md)). The [Jira guide](data/guides/jira.json) was written entirely by hand as the quality bar.
- **Live guides** (any other app): produced on request by the pipeline below, then saved so the link keeps working.

The live pipeline. Only two steps use a large model; the AI never browses the web freely.

| Step | What happens | Done by | File |
|---|---|---|---|
| 1. Resolve | Identify the app, match it to a Composio toolkit, pick 5 to 8 pages to read (provider docs, Composio pages, developer forums). At most 3 web searches. | Small model (Haiku) | [lib/pipeline/discover.ts](lib/pipeline/discover.ts) |
| 2. Composio | Read the toolkit's docs page for its auth scheme and whether Composio manages the OAuth app. | Code | [lib/pipeline/composio-page.ts](lib/pipeline/composio-page.ts) |
| 3. Attempt | Open the provider's app registration page without signing in, and record where it stops. | Code | [lib/pipeline/probe.ts](lib/pipeline/probe.ts) |
| 4. Read | Download the chosen pages, keep only the paragraphs about OAuth setup and approval. | Code | [lib/pipeline/pages.ts](lib/pipeline/pages.ts) |
| 5. Extract | Pull out facts, each with an exact quote from its page. | One model call (Sonnet) | [lib/pipeline/extract.ts](lib/pipeline/extract.ts) |
| 6. Check | Drop any fact whose quote is not actually on its page. Set each fact's evidence label from where it was found. | Code | [lib/pipeline/extract.ts](lib/pipeline/extract.ts) |
| 7. Write | Write the guide, citing only checked facts. Anything important but unsupported becomes an open question. | One model call (Sonnet) | [lib/pipeline/writer.ts](lib/pipeline/writer.ts) |

The steps are wired together in [lib/pipeline/index.ts](lib/pipeline/index.ts). The website streams each step's progress to the browser ([app/api/generate/route.ts](app/api/generate/route.ts)), so the developer watches the research happen.

## How accuracy is enforced

- **Evidence is set by the source, not by the AI.** Provider docs and Composio's own pages count as *official*. Forum posts count as *official* only when written by provider staff. Everything else is *community*.
- **Quotes are checked by code.** A fact survives only if its quote appears on the page it claims to come from. During research, a page-summary tool once invented a sentence about a Composio page; a quote check cannot be fooled that way.
- **The writer can only cite facts it was given.** It cannot add sources of its own.
- **Approval times are never labelled official** unless the provider publishes a timeline.
- **Hand checks are logged** in [docs/verification-log.md](docs/verification-log.md): the claim, what the guide said, what the source says, and any fix.

## Key decisions

The full list, with reasons, is in [docs/decisions.md](docs/decisions.md). The main ones:

1. **The verdict comes first and the steps second.** The planning answer is what is missing; click-by-click instructions already exist.
2. **Difficulty measures the approval path only**, so one scale means the same thing for every app.
3. **One guide per toolkit, not per company.** LinkedIn is Composio-managed; LinkedIn Ads needs your own app and a separate Advertising API review.
4. **The agent never touches the developer's provider login.** It prepares values, links and drafts; anything behind a sign-in is marked as the developer's step.
5. **Nothing is hidden behind questions.** The full guide shows at once; guided setup is optional.
6. **Code verifies; a second AI does not.** Cheaper and stricter.

## Cost and safety

- A live guide costs about **$0.30**. Every run has a hard spending cap ($1 for live runs); when it is reached, every in-flight AI call in that run is cancelled.
- Each visitor can generate at most 10 guides and ask 20 "I'm stuck" questions per hour.
- An app that has been researched before loads from storage at no cost.
- **How the cap came about:** my first version let AI agents browse freely on the largest model, and one Jira run cost about $100, because each agent re-read every page on every step. I measured the cause, rebuilt the pipeline to the design above, and added the caps. The details are in [docs/decisions.md](docs/decisions.md).

## Limitations

- **No signed-in setup attempts yet.** The attempt step stops at the provider's sign-in page. An agent that signs in with a test account and clicks through the developer console would produce more *tested* evidence; it is the next thing I would build.
- **Console setup times are estimates** and are labelled as such. Approval times come from provider statements or dated developer reports.
- **Composio's default scopes are not public** for most toolkits, so several guides list them as an open question.
- **Pages that only render in a browser** cannot be read by the downloader and are skipped; the run log lists them.
- **Live guides are lighter than library guides:** 5 to 8 pages and a smaller model, to keep each run around $0.30.

## Using this inside Composio

The same pipeline works as an internal research tool for the toolkits team:

- **Triage the 211 bring-your-own toolkits:** 99 need no developer setup; the rest can be drafted in a batch at about $0.30 each and sorted by difficulty.
- **Keep guides current:** rerun monthly and compare verdicts. A changed difficulty, or a quote that is no longer on its page, signals that a provider changed its rules.
- **Metrics:** guides by difficulty, share of claims backed by official or tested evidence, open questions per toolkit, days since last check.

## Run it locally

```bash
cp .env.example .env.local     # then fill in the values below
npm install
npm run dev                    # http://localhost:3000
```

| Variable | Needed for | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Live generation and the "I'm stuck" assistant | Library guides work without it. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Saving live guides so their links keep working | Optional locally; without them, guides are saved to `data/generated/`. |
| `MODEL_LIVE`, `MODEL_MAIN`, `MODEL_FAST` | Choosing models | Defaults: Sonnet 5 for live runs, Opus 5 for thorough runs, Haiku 4.5 for resolving. |

Useful commands:

```bash
npm run generate -- linear --live                # research one app from the command line (capped at $1)
npm run generate -- linear --reuse --redo=write  # reuse saved research, rerun only the writer
npm run check-guide -- data/guides/jira.json     # validate a guide's format and its source references
```

## Project layout

```
app/                         The website (Next.js)
  page.tsx                   Home: search, findings, library, live-generated guides
  guide/[slug]/page.tsx      A guide
  guide/[slug]/setup/        Guided setup checklist
  generate/                  The live research page
  api/generate/route.ts      Runs the pipeline and streams progress
  api/stuck/route.ts         The "I'm stuck" assistant
  components/                Guide view, cards, search, share buttons
lib/
  schema.ts                  The guide format; every claim carries an evidence label
  pipeline/                  The live pipeline (see "How it works")
  render/                    Markdown and Slack exports
  store.ts                   Reads library guides from disk, live guides from Redis
  llm.ts                     Model calls, spend tracking and the per-run cap
data/
  guides/                    The 9 library guides (JSON)
  toolkits/                  Composio's managed vs bring-your-own lists, and the auth scheme of all 211
  generated/                 Live guides when running locally
docs/
  rubric.md                  The difficulty scale and evidence rules
  decisions.md               Product decisions and lessons, with reasons
  verification-log.md        Every hand check: confirmed or corrected
scripts/                     Command-line generation and guide validation
```
