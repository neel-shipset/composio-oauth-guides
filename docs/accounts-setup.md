# Accounts to set up

All free. Create the accounts now; the setup attempts themselves happen in Milestone 3, with the agent driving and you signing in when it hits a login.

Keys go in `.env.local` only. Never paste a key or client secret into chat, a commit or a screenshot.

## 1. Anthropic API key (needed first)
1. Go to https://console.anthropic.com -> Settings -> API keys -> Create key. Name it `composio-oauth-guides`.
2. Settings -> Limits: set a monthly spend limit (suggest $30) so a public demo link cannot run up a bill.
3. Paste the key into `.env.local` as `ANTHROPIC_API_KEY=`.

## 2. Composio API key (needed first)
1. Sign up at https://platform.composio.dev (GitHub sign-in is fine).
2. Settings -> API keys -> copy the key into `.env.local` as `COMPOSIO_API_KEY=`.
3. While there, open Auth Configs -> Create Auth Config -> Jira -> OAuth2, and note the redirect URI it shows. Do not save anything yet; we only need to see it.

## 3. GitHub (you have one)
Nothing to create. Used for the repo, for Vercel sign-in, and for the easiest setup attempt (Settings -> Developer settings -> OAuth Apps).

## 4. Atlassian developer account
1. Go to https://developer.atlassian.com/console/myapps and sign in (or create an Atlassian account).
2. Also create a free Jira Cloud site at https://www.atlassian.com/software/jira/free so the test app has something to connect to.

## 5. Slack workspace
1. Create a free workspace at https://slack.com/get-started (e.g. `neel-oauth-test`).
2. Confirm you can open https://api.slack.com/apps while signed in.

## 6. Google Cloud project
1. Go to https://console.cloud.google.com and accept the terms. No billing account is needed for OAuth clients.
2. Create a project named `oauth-guides-test`.
3. Stop there. The attempt agent will walk the consent-screen and verification pages.

## 7. Vercel (needed at Milestone 4)
Sign in at https://vercel.com with GitHub. Hobby plan.

## 8. Upstash Redis (needed at Milestone 4)
Sign in at https://console.upstash.com, create a free Redis database, copy the REST URL and token into `.env.local`.

## Checklist
- [ ] Anthropic key in `.env.local`, spend limit set
- [ ] Composio key in `.env.local`
- [ ] Atlassian developer console opens, Jira Cloud site exists
- [ ] Slack workspace exists, api.slack.com/apps opens
- [ ] Google Cloud project created
- [ ] Vercel signed in (later)
- [ ] Upstash database (later)
