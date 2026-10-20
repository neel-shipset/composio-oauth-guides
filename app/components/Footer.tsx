const REPO = "https://github.com/neel-shipset/composio-oauth-guides";

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-4xl border-t border-border px-4 py-8 text-sm text-muted sm:px-6">
      <p>
        Built for the Composio APM (toolkits) take-home. Every claim links to its source and is labelled tested,
        official, community or unverified.
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <a href={REPO} className="hover:text-text">Source code</a>
        <a href={`${REPO}#how-it-works`} className="hover:text-text">How it works</a>
        <a href={`${REPO}/blob/main/docs/decisions.md`} className="hover:text-text">Decisions</a>
        <a href={`${REPO}/blob/main/docs/verification-log.md`} className="hover:text-text">How guides were checked</a>
        <a href={`${REPO}/blob/main/docs/rubric.md`} className="hover:text-text">Scoring rubric</a>
      </p>
    </footer>
  );
}
