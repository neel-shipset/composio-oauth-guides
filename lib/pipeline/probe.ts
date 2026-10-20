// Step 2b (code, no model): try to open the developer portal's app-registration page without
// signing in and record where it stops. This is the "attempt": a direct observation, so it is
// labelled tested. Full attempts with a signed-in browser are a separate, manual step.
import { fetchPage, htmlToText, pageTitle } from "./pages";
import type { AttemptStep, Finding } from "./types";

const SIGN_IN = /sign[ -]?in|log[ -]?in|signin|login|auth0|accounts\.google|id\.atlassian|sso|authenticate/i;

export async function probePortal(portalUrl: string, providerName: string): Promise<{ steps: AttemptStep[]; findings: Finding[] }> {
  if (!/^https?:\/\//.test(portalUrl)) return { steps: [], findings: [] };
  const r = await fetchPage(portalUrl);
  const today = new Date().toISOString().slice(0, 10);
  if (!r) {
    return { steps: [{ step: `Open ${portalUrl}`, result: "blocked", note: "Page did not load", url: portalUrl }], findings: [] };
  }
  const title = pageTitle(r.html);
  const text = htmlToText(r.html).slice(0, 4000);
  const redirectedToSignIn = SIGN_IN.test(r.finalUrl) || (SIGN_IN.test(title) && !/docs|documentation/i.test(title));
  const step: AttemptStep = redirectedToSignIn
    ? { step: "Open the app registration page", result: "blocked", note: `Redirected to sign-in (${new URL(r.finalUrl).hostname}): a ${providerName} account is required`, url: r.finalUrl }
    : { step: "Open the app registration page", result: "done", note: `Loaded "${title || r.finalUrl}" (HTTP ${r.status}) without signing in${text.length < 300 ? "; the page renders in the browser, so its form was not visible" : ""}`, url: r.finalUrl };
  const findings: Finding[] = redirectedToSignIn
    ? [{
        id: "a1",
        origin: "attempt",
        topic: "registration",
        evidence: "tested",
        text: `Opening the app registration page without an account redirects to sign-in, so a person with a ${providerName} account has to do this step.`,
        sources: [{ url: portalUrl, title: `Our probe of ${portalUrl}`, quote: `Redirected to ${r.finalUrl}`, publishedAt: today }],
      }]
    : [];
  return { steps: [step], findings };
}
