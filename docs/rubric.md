# Scoring rubric

Every guide is scored with the same rubric so that 100 guides stay comparable.

## Difficulty (to reach production: any user can connect, your name on the consent screen)

| Level | Name | Rule |
|---|---|---|
| 1 | Instant | Self-serve registration, no review, no distribution switch. Production-ready the same day. |
| 2 | Self-serve with caveats | No human review, but extra steps before outside users can connect: a distribution/sharing switch, privacy or data declarations, workspace limits. |
| 3 | Reviewed | A human at the provider reviews the app before public use. Typically days. |
| 4 | Heavy verification | Brand, domain or security verification; can take weeks and may need a paid third-party assessment. |
| 5 | Gated | Needs a partner program, business verification or a paid API tier, and approval may never be granted. |

Difficulty measures the **approval path only**: what stands between a registered app and outside users connecting. Price and usage restrictions (for example X's pay-per-call API) do not change the score; they go in the verdict summary and the main blocker, which are shown next to the score everywhere, including the library cards. This keeps the scale meaning one thing across 100 guides.

Score by the **hardest stage the toolkit's required scopes force**, not by the provider's easiest path. Where a cheaper path exists (e.g. fewer scopes), say so in the summary.

## Evidence

| Label | Meaning | Allowed sources |
|---|---|---|
| Tested | We did it, with timestamp and log | Our attempt log |
| Official | The provider says so | Provider docs, policy pages, provider-run forums when staff answer |
| Community | Developers report it | Forums, GitHub issues, Reddit, blog posts. Never stated as fact |
| Unknown | Could not establish | Stated plainly, with who to ask |

Rules:
- Approval durations are never `official` unless the provider publishes an SLA.
- A claim with no source is `unknown`, whatever the model believes.
- The verifier may downgrade evidence, never upgrade it.

## Confidence (on the verdict)

- **High**: difficulty and both durations rest on tested or official claims.
- **Medium**: at least one of them rests on community reports.
- **Low**: at least one of them is unknown.
