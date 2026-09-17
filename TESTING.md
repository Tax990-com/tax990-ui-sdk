# Testing Guide

Step-by-step instructions to test the four SDKs, and to test the UI against each one. See
[`UI_INTEGRATION.md`](UI_INTEGRATION.md) first for the architecture this builds on, and
[`frontend/README.md`](frontend/README.md) for everything specific to running the frontend app
itself (its two-process setup, Redux-backed auth, and known hydration/build gotchas).

Testing happens in two layers:

- **Layer 1 — SDK unit tests.** Each SDK ships its own test suite with HTTP mocked out
  (`jest`/`nock`-style mocks in Node, `Moq` in .NET, `httptest` in Go, `respx` in Python). These run
  completely offline — no credentials, no network, no live API needed.
- **Layer 2 — UI + bridge server smoke test.** Start a real bridge server backed by real
  credentials, point the UI at it, and click through the app. This is the only layer that proves
  the UI, the bridge server, and the SDK actually agree on the wire format end to end.

Run Layer 1 for every language regardless of what you're changing. Run Layer 2 for whichever
backend(s) you touched.

## 0. Prerequisites

| SDK | Toolchain | Verified in this pass |
|---|---|---|
| Node.js | Node 18+, `npm install` in `nodejs/` | ✅ 25/25 tests passed |
| .NET | .NET 8 SDK | ✅ 32/32 tests passed |
| Python | Python 3.9+, `pip install -e ".[dev]"` in `python/` | ✅ 30/30 unit tests passed; ✅ `python/bridge.py` also verified end-to-end through the UI against the real hosted staging API (§5) |
| Go | Go 1.21+ | ⚠️ not installed on this machine — command below is standard for this module layout but wasn't run here |

You'll also need sandbox credentials for Layer 2:

```
TAX990_CLIENT_ID=...
TAX990_CLIENT_SECRET=...
TAX990_USER_TOKEN=...
```

## 1. Layer 1 — run each SDK's own test suite

These are independent of each other and of the UI. Run whichever ones you've touched; run all
four before a release.

### Node.js

```bash
cd nodejs
npm install
npm test
```

Expect all suites in `tests/` (`auth.test.ts`, `form990n.test.ts`, `webhook.test.ts`) to pass.

### .NET

```bash
cd dotnet
dotnet test tests/Tax990.SDK.Tests/Tax990.SDK.Tests.csproj
```

Expect `Passed! - Failed: 0, Passed: 32, ...`.

### Python

```bash
cd python
pip install -e ".[dev]"
pytest
```

Expect `30 passed` across `test_auth.py`, `test_form990n.py`, `test_webhook.py`.

### Go

```bash
cd go
go test ./...
```

Expect `ok` for each package (`tax990`, `tax990/auth`, `tax990/errors`, etc.), matching the
`*_test.go` files under `go/tax990/`.

**If a suite fails here, stop.** Don't move on to Layer 2 until Layer 1 is green — an SDK-level
regression will surface confusingly through the UI otherwise.

## 2. Layer 2 — set the API and OAuth URLs

All four SDKs read `TAX990_API_URL` and `TAX990_OAUTH_URL` directly from environment variables —
there is no environment-name-based URL selection. Every backend's `.env` file has both keys; fill
them in before starting any bridge server:

| File | Backend |
|---|---|
| `frontend/.env` | Node.js bridge |
| `go/.env` | Go bridge |
| `dotnet/bridge/.env` | .NET bridge |
| `python/.env` | Python bridge |

```
TAX990_API_URL=https://t990-v1-publicapi.stsstage.com    # or your local service URL
TAX990_OAUTH_URL=https://t990-oauthapi.stsstage.com      # or your local OAuth URL
```

Shell-exported vars always take precedence over `.env` if both are set.

The fastest way to confirm the URLs are reachable is a ping call:

- Node: `await client.utility.ping()`
- .NET: `await client.Utility.PingAsync()`
- Go: `client.Utility.Ping(ctx)`
- Python: `await client.utility.ping()`

If `ping` succeeds, credentials and connectivity are good and you're ready for the UI smoke test.

## 3. Smoke-test one bridge server directly (no UI yet)

Pick a backend (steps below assume Node; swap the run command for the language you're testing —
see [`UI_INTEGRATION.md`](UI_INTEGRATION.md) §5–7 for the other three).

For Node, put the credentials from §0 in `frontend/.env` (`TAX990_CLIENT_ID`, `TAX990_CLIENT_SECRET`,
`TAX990_USER_TOKEN`) — the bridge server loads that file automatically via `dotenv` at startup:

```bash
cd frontend
npm run server
```

If you'd rather not edit `.env` for a one-off test, shell-exported vars still work and take
precedence over `.env`:

```bash
export TAX990_CLIENT_ID=...
export TAX990_CLIENT_SECRET=...
export TAX990_USER_TOKEN=...
npm run server
```

A `{"StatusCode":500,"StatusMessage":"secretOrPrivateKey must have a value"}` response on every
route means `TAX990_CLIENT_SECRET` never reached the running process — see
[`frontend/README.md`](frontend/README.md) §7 for the exact cause and fix (most often: an old
server process is still running from before you set/edited the credentials — env loading only
happens once at startup, so stop it with `Ctrl+C` and restart).

In another terminal, hit it directly with `curl` before involving the UI at all:

```bash
# Health check — should return a ping payload, not an error
curl http://localhost:4100/api/utility/ping

# Auth round-trip — should return the same ping payload as /api/utility/ping
curl -X POST http://localhost:4100/api/auth/token

# Nonprofit lookup — replace with a real EIN
curl "http://localhost:4100/api/nonprofits/getOrganizationDetailsByEIN?ein=123456789"
```

If any of these return `{"StatusCode": 500, "StatusMessage": "..."}`, the message tells you exactly
what failed (bad credentials, unreachable OAuth URL, etc.) — fix it here before moving to the UI,
since the UI will just show the same message with an extra layer of indirection.

## 4. Test through the UI

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` and sign in with the credentials in `frontend/.env`
(`VITE_AUTH_USERNAME` / `VITE_AUTH_PASSWORD` — defaults to `admin` / `Tax990@sdk`). This is a
hardcoded UI gate unrelated to your Tax990 SDK credentials from §0 — signing in only unlocks the
dashboard, it makes no API call by itself.

Sign-in state lives in Redux (`redux-persist`, backed by `sessionStorage`), not React Context —
confirm it actually persisted via DevTools → Application → Session Storage → key `persist:root`,
which should contain `"userDetails":"{\"username\":\"admin\"}"` after signing in. Full detail on
this in [`frontend/README.md`](frontend/README.md) §5. Because it's `sessionStorage`, each browser
tab has its own independent session — signing out in one tab does not affect another.

Walk every page — each one exercises a different slice of the contract:

| Page | Route | What it proves |
|---|---|---|
| Overview | `/` | App shell loads, protected-route redirect and Redux-backed sign-in work |
| OAuth | `/oauth` | `/api/auth/token`, `/api/auth/server-time` — the auth handshake |
| Form 990-N | `/form990n` | create / get / list / delete / validate / transmit / getPDF / status |
| Utility | `/utility` | all nine `/api/utility/*` lookups |
| Nonprofits | `/nonprofits` | `/api/nonprofits/getOrganizationDetailsByEIN` |

For each page: open the browser's Network tab, trigger the action, and confirm:

1. The request goes to `/api/...` (proxied — you should **not** see `localhost:4100` directly in
   the browser's address bar or CORS errors in the console)
2. The response status is `200` (or a real `4xx`/`5xx` if you deliberately gave it bad input, e.g.
   an EIN that doesn't exist — that should surface as a clean error message in the UI, not a crash)
3. The data rendered in the UI matches the raw response body in the Network tab

Also sign out (top-right of the navy header) and confirm you land back on `/signin` with
`persist:root`'s `username` reset to `null` — this proves the Redux reset action, not just the
redirect, actually fired.

### 4.1 Production build sanity check

Before shipping any frontend change, also confirm the production build itself succeeds — the dev
server alone won't catch every issue (in particular, an SSR-bundle-only module resolution error is
easy to miss since `npm run dev` never builds that bundle):

```bash
cd frontend
npm run build
```

Expect two `✓ built` lines and `SPA Mode: Generated build\client\index.html`. The build then deletes
`build/server` on its own (`Removing the server build ... due to ssr:false`) — expected, not a
failure, since this app ships as a static SPA bundle with no Node server. To manually click through
the built output (as opposed to the dev server), serve it with SPA fallback so client-side routes
don't 404 on refresh:

```bash
npx serve -s build/client -l 3000
```

## 5. Cross-backend parity check

The real value of this architecture is that all four backends are interchangeable. After setting
up a second language's bridge server (§5–7 in `UI_INTEGRATION.md`):

1. Stop the currently-running bridge server
2. Start the new one on the same port (`4100`)
3. **Do not restart or rebuild the frontend** — just reload the browser tab
4. Repeat the exact same walkthrough from §4 above
5. Confirm the UI behaves identically — same data, same error messages, same page flows

If something differs between backends, the bug is in that backend's route handler (a param name
mismatch, a missing header forward, wrong error shape), not in the UI — the UI's behavior is a
pure function of the JSON contract in `UI_INTEGRATION.md` §2.

## 6. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Browser console shows a CORS error | The bridge server's CORS middleware isn't enabled, or the frontend is calling the bridge server directly instead of through the Vite proxy (should always be a relative `/api/...` URL, never `http://localhost:4100/...`) |
| Every UI action fails with the same generic message | The bridge server can't reach the OAuth/API URL — check §2, then re-run the `curl` checks in §3 |
| UI shows `StatusCode: 500` with a JWT/JWS-related message | `TAX990_CLIENT_SECRET` is wrong, or the client_id/user_token pairing is invalid for the target environment |
| `EADDRINUSE` / "address already in use" on `:4100` | Another backend's bridge server is still running — stop it before starting a different language's (see §5) |
| Form 990-N create always ignores idempotency | Confirm the bridge server reads the `idempotency-key` request header and forwards it as the SDK call's second argument — the existing Node reference server does not do this; the .NET/Go/Python examples in `UI_INTEGRATION.md` do |
