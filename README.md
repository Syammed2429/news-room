# Newsroom

A news aggregator for the innoscripta frontend case study. It pulls articles from The Guardian,
The New York Times and NewsAPI into one feed you can search, filter and personalise.

Built with React 19, TypeScript, Vite, Tailwind v4 and shadcn/ui. A small Hono server sits between
the browser and the news APIs so the API keys never reach the client.

## What it does

- Search by keyword as you type (it waits half a second after you stop, and ignores single
  letters, because NYT only allows about 5 requests a minute). Filter by category, source and date.
- A "For you" tab built from the sources, categories and authors you pick under Personalize. You can
  also follow an author straight from an article card. Choices are saved in `localStorage`.
  If you only follow authors, the feed shows only their articles. With categories as well, it
  shows both, with the authors' articles first.
- Infinite scroll with skeleton cards while the next page loads.
- Works on phones: filters move into a slide-over sheet.
- If one source fails (bad key, rate limit) the others still load and a notice says which one failed.
- With no API keys it falls back to sample articles, so it still runs.

## Running it

You need Node 22 and pnpm 9 (`corepack enable` picks the right pnpm version).

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
image. The runtime stage only has the built files and one bundled server file, and it runs as a
non-root user.

Other scripts: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm start` (runs the
production build) and `pnpm secrets` (scans for committed secrets).

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
exception is shadcn's generated calendar). Functions are `const` arrows, and TypeScript runs in
strict mode.

## Keeping the keys private

The first version called the news APIs straight from the browser, which put the keys in the Network
tab. Now:

- The keys only exist in the server process. The client bundle has none of them.
- Every request body is validated with zod (types, lengths, allowed values, no extra fields) and
  capped at 8 KB. Pages are capped at 10.
- There's a per-IP rate limit, and the server refuses requests that a browser marks as cross-site.
- Responses never include upstream URLs or error details, only fixed messages.
- Article text is stripped of HTML on the server, and links must be http(s) and images https.
- The CSP only allows scripts from our own origin.

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

- NYT's `fq` filter returned nothing when tested, so categories and authors go into the search
  text. Results are related but not as exact as the Guardian's sections.
- Only the Guardian can be searched by author. NYT's text search finds articles that mention a
  name rather than ones written by that person, and its byline filter returned nothing. NewsAPI has
  no author search at all. For those two, the server looks through their latest articles (10 per
  page for NYT, 100 for NewsAPI) and keeps the ones whose byline matches, so an author who hasn't
  published recently won't show up. The feed then says so and offers the latest news.
- NewsAPI's free plan only returns the first 100 results and delays them.
- Each page is sorted newest first, but the list as a whole isn't one global sort.
- The rate limiter is in memory, so it would need a shared store with more than one server instance.
- The image was built and run with Docker Desktop 4.94 on an Apple Silicon Mac (arm64). It is about
  236 MB, and the app works in it under the strict CSP. It hasn't been tried on x86 or in CI.
