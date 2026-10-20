// Scoring rules given to the writer agent. Human-readable copy: docs/rubric.md.
export const RUBRIC = `
DIFFICULTY (to reach production: any outside user can connect, developer's own name on the consent screen)
1 Instant: self-serve registration, no review, no distribution switch. Production-ready the same day.
2 Self-serve with caveats: no human review is required to go live, but there are extra steps before outside users can connect (a distribution or sharing switch, privacy or data declarations, workspace limits, a warning shown to users).
3 Reviewed: a human at the provider must review the app before outside users can connect. Typically days.
4 Heavy verification: brand, domain or security verification is required; can take weeks and may need a paid third-party assessment.
5 Gated: needs a partner program, business verification or a paid API tier, and approval may never be granted.
Score by the hardest stage that the toolkit's scopes force, not the provider's easiest path. If a cheaper path exists (fewer scopes, a different API), say so in the summary.
Optional review that only removes a warning does not raise the level.
Difficulty measures the approval path only. Price and usage restrictions do not change the score; put them in the summary and mainBlocker.

EVIDENCE
tested = observed directly by our agent on a live page. official = provider docs or provider staff. community = anyone else; never state as fact. unknown = could not establish.
Approval durations are never official unless the provider publishes an SLA.
A source older than two years describing a process or timeline must be treated as possibly outdated; say so.

CONFIDENCE (on the verdict)
high: difficulty and both durations rest on tested or official claims.
medium: at least one rests on community reports.
low: at least one is unknown.
`;
