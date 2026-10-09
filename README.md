# Newsroom

A news aggregator for the innoscripta frontend case study. It pulls articles from The Guardian,
The New York Times and NewsAPI into one feed you can search, filter and personalise.

Built with React 19, TypeScript, Vite, Tailwind v4 and shadcn/ui. A small Hono server sits between
the browser and the news APIs so the API keys never reach the client.

## What it does

- Search by keyword as you type (it waits half a second after you stop, and ignores single
  letters, because NYT only allows about 5 requests a minute). Filter by category, source and date,
  and sort a search by newest or by relevance. Recent searches show up under the box.
- The search and filters live in the URL, so a link restores the same view, a refresh keeps it, and
  the Back button undoes a filter. For example `/?q=climate&category=science&sources=guardian`.
- A "For you" tab built from the sources, categories and authors you pick under Personalize. You can
  also follow an author straight from an article card. Choices are saved in `localStorage`.
  If you only follow authors, the feed shows only their articles. With categories as well, it
  shows both, with the authors' articles first. The category chips, source list and dates work on
  this tab too, but only narrow the feed: the chips list just your preferred categories, and the
  source list just your preferred sources.
- A "Saved" tab: bookmark any article to keep it on this device (the latest 50). The search box,
  sources and dates filter the saved list on the device. There is no category filter here, because
  a saved article has no reliable category to match on.
- Infinite scroll with skeleton cards while the next page loads. The next page starts loading on
  the first scroll, and a thin bar shows while anything is loading.
- A "new articles" button appears when something newer has been published (checked every 5 minutes
  while the tab is open).
- Works on phones: filters move into a slide-over sheet. Dark mode, keyboard navigation and a skip
  link are built in, and the colours meet WCAG AA contrast.
- If one source fails (bad key, rate limit) the others still load and a notice says which one failed.
- With no API keys it falls back to sample articles, so it still runs.

## Running it

You need Node 24 and pnpm 9 (`corepack enable` picks the right pnpm version).

Get a free key from each source (use as many as you like):

- The Guardian: https://open-platform.theguardian.com/access/
- New York Times: https://developer.nytimes.com (create an app and enable "Article Search API")
- NewsAPI: https://newsapi.org/register

```bash
cp .env.example .env     # put your keys in here
pnpm install
pnpm dev                 # http://localhost:5173
```

With Docker:

```bash
cp .env.example .env
docker compose up --build    # http://localhost:8080
```

The keys are passed to the container as environment variables, so nothing secret is baked into the
image. The runtime stage only has the built files and one bundled server file. It runs as a
non-root user with a read-only filesystem, no Linux capabilities and capped memory, and the base
image is pinned by digest.

If you start the image from Docker Desktop's Run button instead, set "Host port" to `8080` under
Optional settings and add the three keys there. `docker compose` does all of this for you.

Other scripts: `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`, `pnpm build`,
`pnpm start` (runs the production build) and `pnpm secrets` (scans for committed secrets).

## Deploying to Vercel

Vercel has no long-running server, so it hosts the built pages itself and answers `/api` with one
serverless function for each of the two routes, `api/news/search.js` and `api/news/sources.js`.
Both are the same Hono app as `server/`, bundled into single files by `pnpm build:vercel`, and
they are committed on purpose. Files are used rather than one catch-all because Vercel only does
catch-all routing for Next.js. `pnpm build` rebuilds them, and CI fails if the committed copies
are out of date.

1. Import the repo in Vercel (it detects Vite).
2. Under Settings → Environment Variables add `GUARDIAN_API_KEY`, `NYT_API_KEY` and
   `NEWSAPI_API_KEY`, then redeploy. Keys added after a deploy only apply to the next one.
3. Visitors' addresses come from Vercel's forwarded header, which the function trusts
   automatically. `vercel.json` adds the same security headers the Node server sends.

The cache and rate limit live in memory, so on Vercel each function instance has its own. That is
fine for this app, but a shared store would be needed to enforce one global limit.

## Tests

- `pnpm test` runs about 280 unit and integration tests with Vitest. The client tests use a fake
  backend, the server tests call the Hono app directly, and none of them touch a real API.
- `pnpm test:e2e` runs the Playwright browser tests against the production build, in demo mode.
  They cover searching, filters, the Back button and shared links, the Personalize sheet and its
  keyboard focus, saved articles, a phone-sized screen, and automated accessibility scans (axe) in
  light and dark mode.

  ```bash
  PW_CHANNEL=chrome pnpm test:e2e     # uses the Chrome you already have
  pnpm exec playwright install chromium && pnpm test:e2e   # or let Playwright download one
  ```

GitHub Actions runs type-check, lint, tests, build, a production-dependency audit, the secret scan,
the browser tests and a Docker build on every push and pull request. Dependabot keeps the
dependencies, the Dockerfile and the workflow up to date.

## How it's put together

```
shared/    types, pagination and the zod schemas used by both sides
server/    Hono app: routes, validation, rate limit, cache, one adapter per news API
src/       the React app
```

The browser only ever calls two routes on our own server: `POST /api/news/search` and
`GET /api/news/sources`. The server holds the keys, calls the news APIs, and returns articles in one
common shape.

Each news API has its own adapter that implements the `NewsProvider` interface. The aggregator calls
every adapter in parallel (`Promise.allSettled`), merges the results and paginates. Adding a source
means writing one adapter and registering it. A cache wraps all adapters, which matters because NYT
only allows about 5 requests a minute.

On the client, TanStack Query handles fetching and caching, Zustand holds the filters and saved
preferences, and the shared zod schemas validate the search box, the author input and whatever comes
back out of `localStorage`.

The code aims to stay simple: no `useEffect`, `useMemo` or `useCallback` in the app code (the
exception is shadcn's generated calendar). The React Compiler is on, so components are memoized at
build time instead of by hand. That means rendering has to stay pure, for example no reading the
query cache while rendering. Functions are `const` arrows, and TypeScript runs in
strict mode.

## Keeping the keys private

The first version called the news APIs straight from the browser, which put the keys in the Network
tab. Now:

- The keys only exist in the server process. The client bundle has none of them.
- Every request body is validated with zod (types, lengths, allowed values, no extra fields) and
  capped at 8 KB. Pages are capped at 10.
- There's a per-IP rate limit, the search endpoint only accepts JSON, and the server refuses
  requests that a browser marks as cross-site.
- Responses never include upstream URLs or error details, only fixed messages.
- Article text is stripped of HTML on the server, and links must be http(s) and images https.
- The CSP only allows scripts from our own origin, and responses are gzip-compressed.

Anyone can still see the two `/api` calls in their Network tab, that can't be hidden. What they can't
do is get a key or run arbitrary requests through the server.

If a key was ever used by the first version, regenerate it.

React Server Functions (`'use server'`) were considered for this. They need a framework such as
Next.js and the React docs say they aren't meant for data fetching, so a plain API route was the
better fit.

## Git hooks

Husky runs these:

- `pre-commit`: blocks a staged `.env`, runs oxlint and secretlint on staged files, then `tsc`.
- `commit-msg`: commits must follow Conventional Commits.
- `pre-push`: typecheck, lint, tests and a full build.

## Things to know

- NYT's `fq` filter returned nothing when tested, so categories go into the search text instead.
  Results are related but not as exact as the Guardian's sections.
- Only the Guardian can be searched by author. NYT's text search finds articles that mention a
  name rather than ones written by that person, and its byline filter returned nothing. NewsAPI has
  no author search at all. For those two, the server looks through their latest articles (10 per
  page for NYT, 100 for NewsAPI) and keeps the ones whose byline matches, so an author who hasn't
  published recently won't show up. The feed then says so and offers the latest news.
- The search text is cleaned once on the server before any source sees it. The Guardian rejects a
  lone quote, a colon or square brackets, so those are dropped. Paired quotes still work for an
  exact phrase.
- NewsAPI keyword searches use its `everything` endpoint. Its `top-headlines` endpoint only holds
  today's US headlines and finds almost nothing for a keyword. Browsing without a keyword still
  uses top-headlines.
- A search for several words needs all of them on the Guardian and NewsAPI. NYT's search matches
  any of the words and ignores AND and +, but a phrase in quotes is matched exactly.
- NewsAPI's free plan only returns the first 100 results and delays them by 24 hours, only goes
  back about a month, and is meant for development and testing only (its terms don't allow staging
  or production use). A date range further back than a month shows "The free plan does not reach
  back that far" for NewsAPI while the other sources still answer. It also allows only 100
  requests a day, so after a lot of use it answers "rate limit reached". The app shows that as a
  notice and keeps going with the other sources. The cache (5 minutes) is what keeps normal use well
  inside the limit.
- Each page is sorted newest first, but the list as a whole isn't one global sort. "Most
  relevant" can't be compared across sources either, so the sources take turns and each keeps its own
  ranking.
- The rate limiter is in memory, so it would need a shared store with more than one server instance.
- The image was built and run with Docker Desktop 4.94 on an Apple Silicon Mac (arm64). It is about
  236 MB, and the app works in it under the strict CSP. The Docker build only runs on x86 in CI.
- Saved articles, preferences and recent searches live in `localStorage`, so they stay on one
  device and browser. There are no accounts.
- The project is marked `UNLICENSED` in `package.json`. Pick a licence before sharing it publicly.
