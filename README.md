# Tax990 SDK Explorer — Frontend

A React SPA that exercises every endpoint of the Tax990 Public API through a Tax990 SDK. The UI
never imports an SDK directly — it only speaks REST to a local **bridge server**, so the same UI
works against any of the four SDK implementations (`dotnet`, `nodejs`, `go`, `python`) without a
single frontend code change. See [`../UI_INTEGRATION.md`](../UI_INTEGRATION.md) for the full
bridge-server contract and how to wire up the other three languages; this file covers the frontend
app itself — how it's built, how to run it, and how to verify it's working.

## 1. Two processes, always

There is no single "start the app" command. You always run **two independent processes**:

| Process | Command | Port | What it is |
|---|---|---|---|
| Bridge server | `npm run server` | `4100` | Express server wrapping the Node SDK (`server/index.ts`) |
| Frontend dev server | `npm run dev` | `3000` | Vite + React Router dev server, proxies `/api/*` → `:4100` |

The frontend has **no SDK credentials of its own** and cannot talk to the Tax990 API without a
bridge server running first. If you only start `npm run dev`, every action in the UI will fail with
a connection-refused-style `500` once it hits `/api/...`.

## 2. Running it — step by step

```bash
cd frontend
npm install
```

**Terminal 1 — bridge server.** It reads SDK credentials from `frontend/.env`
(`server/index.ts` loads it via `import 'dotenv/config'` at startup):

```
TAX990_CLIENT_ID=...
TAX990_CLIENT_SECRET=...
TAX990_USER_TOKEN=...
TAX990_API_URL=...           # Public API base URL (required)
TAX990_OAUTH_URL=...         # OAuth API base URL (required)
```

```bash
npm run server
```

You should see: `Tax990 SDK proxy server running on http://localhost:4100`.

**Env vars already set in the shell always win over `.env`** (dotenv only fills in keys that
aren't already present in `process.env`). That means the manual-export approach still works if you
need to override one value for a single run without touching `.env`:

```bash
# bash / zsh
export TAX990_CLIENT_SECRET=some-other-secret
npm run server
```

```powershell
# PowerShell
$env:TAX990_CLIENT_SECRET = "some-other-secret"
npm run server
```

— but for normal day-to-day use, just put the values in `.env` and run `npm run server` with a
clean shell.

**Terminal 2 — frontend:**

```bash
npm run dev
```

You should see Vite's `➜ Local: http://localhost:3000/`. Open that URL.

**Sign in.** This is a hardcoded UI gate, unrelated to your Tax990 credentials — it only decides
whether the SPA renders the dashboard. Credentials come from `frontend/.env`:

```
VITE_AUTH_USERNAME=admin
VITE_AUTH_PASSWORD=Tax990@sdk
```

If those keys are absent from `.env`, the fallback baked into [`app/auth.ts`](app/auth.ts) is
`admin` / `Tax990@sdk`.

## 3. How to check it's actually working

Do these in order — each rules out a different layer:

1. **Bridge server alone**, before touching the UI:
   ```bash
   curl http://localhost:4100/api/utility/ping
   ```
   A JSON ping payload means credentials + connectivity are good. A
   `{"StatusCode":500,"StatusMessage":"..."}` tells you exactly what's wrong (bad credentials,
   unreachable OAuth URL, etc.) — fix it here, not in the browser. Full curl-based smoke test
   (auth round-trip, nonprofit lookup) is in [`../TESTING.md`](../TESTING.md) §3.

2. **Sign-in and routing**, in the browser:
   - `http://localhost:3000/` with no session redirects to `/signin`.
   - Sign in with the credentials above → redirected to `/` (Overview dashboard).
   - Click through all five nav items (Overview, Form 990-N, Utility, Nonprofits, OAuth) — each
     should render its own page instantly (client-side routing, no full reload).
   - Sign out (top-right button in the navy header) → redirected back to `/signin`.

3. **Redux state**, DevTools → Application → Session Storage → `http://localhost:3000` → key
   `persist:root`. After signing in it should contain `"userDetails":"{\"username\":\"admin\"}"`.
   This is the one authoritative place to confirm auth state actually persisted — see §5.

4. **Network tab**, on any page (e.g. Utility → Ping): confirm the request URL is a **relative**
   `/api/utility/ping`, not `http://localhost:4100/...`. If you see the absolute URL or a CORS
   error in the console, the Vite proxy isn't being used — see §7.

5. **Production build**, before shipping any change:
   ```bash
   npm run build
   ```
   Watch for `✓ built` twice (client bundle, then SSR shell used only to generate the static
   `index.html`) and the line `SPA Mode: Generated build\client\index.html`. The build **deletes**
   `build/server` automatically afterwards (`Removing the server build ... due to ssr:false`) — that
   is expected, not a failure; this app ships as static files, there is no Node server to run in
   production. To preview the built output locally, use a static server with SPA fallback (plain
   `npx serve build/client` will 404 on any route but `/`):
   ```bash
   npx serve -s build/client -l 3000
   ```

For the full page-by-page contract walkthrough (what each page's Network tab call should prove) and
cross-backend parity testing, see [`../TESTING.md`](../TESTING.md) §4–5.

## 4. Architecture

```
app/
├── root.tsx              Provider/PersistGate/HeroUIProvider nesting, <html> shell
├── routes.ts              flatRoutes() — enables filesystem-based routing
├── routes/
│   ├── signin.tsx          /signin            (public)
│   ├── _protected.tsx       pathless layout — renders <Layout> + <Outlet>, redirects to
│   │                        /signin if Redux has no user
│   ├── _protected._index.tsx    /   (Overview)
│   ├── _protected.form990n.tsx  /form990n
│   ├── _protected.utility.tsx   /utility
│   ├── _protected.nonprofits.tsx /nonprofits
│   └── _protected.oauth.tsx     /oauth
├── redux/
│   ├── store.ts            configureStore + redux-persist (sessionStorage)
│   └── slice/userSlice.ts   userDetails: { username }
├── auth.ts                 useAuth() hook — thin wrapper over the Redux slice
├── components/
│   ├── Layout.tsx           navy top navbar + light sidebar shell (used by _protected.tsx)
│   ├── JsonViewer.tsx        pretty-printed API response viewer
│   └── Toast.tsx             toast notifications
├── api/client.ts            axios instance, baseURL "/api", error-message interceptor
├── services/                 one file per API domain (authService, form990nService, ...)
├── constants.ts, types/index.ts
├── entry.client.tsx          hydrateRoot(document, <HydratedRouter />) — no StrictMode, see §6
└── entry.server.tsx          only used to render the SPA-mode loading shell at build time
```

Path alias: `@/*` → `./app/*` (`tsconfig.json`).

### Routing — React Router v7 framework mode

This is **filesystem-based routing** (`@react-router/fs-routes`), not the old `<BrowserRouter>` /
`react-router-dom` SPA pattern. Every file under `app/routes/` becomes a URL automatically; there is
no manual `<Routes>`/`<Route>` tree to maintain. `app/routes.ts` just calls `flatRoutes()` — adding a
new page means adding a new file, nothing else.

The `_protected.` filename prefix is a **pathless layout route**: it adds no URL segment of its own,
but every `_protected.X.tsx` file renders nested inside it. `_protected.tsx` is where the actual
auth gate lives:

```tsx
export default function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/signin" replace />;
  return <Layout />;
}
```

`react-router.config.ts` sets `ssr: false` — **this app is SPA-only, deliberately**, because auth
state is client-only (Redux + sessionStorage). If SSR were enabled, every full navigation/refresh
would re-run the server render with no session, and users would flicker back to `/signin`. There is
no `npm start` script and no server bundle in `build/` — see §3.5.

## 5. State management — Redux, not React Context

User session state lives in Redux (`@reduxjs/toolkit` + `react-redux` + `redux-persist`), matching
the pattern used in `tax990-console-app`. It replaced an earlier `React.createContext`-based
`AuthContext` — if you're looking at old code or old docs referencing `AuthContext`, that no longer
exists.

- **Store** ([`app/redux/store.ts`](app/redux/store.ts)): one slice, `userDetails`
  ([`app/redux/slice/userSlice.ts`](app/redux/slice/userSlice.ts)), shape `{ username: string | null }`.
  Wrapped in `redux-persist` with `persistConfig.key = 'root'`, `version: 1`, **no whitelist** (the
  whole state persists).
- **Storage engine is `sessionStorage`, not `localStorage`** — deliberately. This means:
  - The session survives a page refresh or client-side navigation.
  - The session does **not** survive closing the tab, and is **not** shared across tabs — each
    browser tab gets its own independent sign-in state. (`localStorage` would share it across
    tabs/windows; that's explicitly not wanted here.)
  - On the server (SSR shell render only, since `ssr: false`), a `noopStorage` stub is used instead
    of touching `window.sessionStorage`, because `window` doesn't exist there.
- **Reading/writing it from a component** — `useAuth()` ([`app/auth.ts`](app/auth.ts)) is the only
  entry point components should use; it wraps `useSelector`/`useDispatch` so nothing needs to import
  `RootState` or the slice actions directly:
  ```ts
  const { user, signIn, signOut } = useAuth();
  // user: string | null — the signed-in username, or null
  // signIn(username, password): boolean — validates against VITE_AUTH_* env vars, dispatches setUserData
  // signOut(): void — dispatches resetUserData()
  ```
- **Inspecting it directly**: DevTools → Application → Session Storage → key `persist:root`. The
  value is a JSON string containing a further-JSON-encoded `userDetails` field (redux-persist
  double-encodes each top-level reducer) — see the literal example in §3.3.
- **Provider wiring** ([`app/root.tsx`](app/root.tsx)): `<Provider store={store}>` and
  `<PersistGate loading={null} persistor={persistor}>` wrap the app unconditionally (Redux context
  is safe to mount immediately). `<HeroUIProvider>` is deliberately the *inner* element and is only
  rendered after a `mounted` flag flips true in a `useEffect` — see §6 for why.

## 6. Hydration quirks (read before "fixing" these)

React Router v7 SPA mode + HeroUI + React 19 hits a couple of known hydration edge cases. The
current code already works around them; don't undo these without understanding why:

- **`HeroUIProvider` is deferred until after mount** (`app/root.tsx`). Rendering it immediately
  during the initial client render previously caused a *fatal* crash — the router's own `<Meta>`
  component would call `useContext` and get a null dispatcher. Gating it behind
  `useEffect(() => setMounted(true), [])` avoids this entirely; `<Provider>`/`<PersistGate>` are
  unaffected and stay mounted immediately since they don't touch that same context.
- **No `<StrictMode>` in `entry.client.tsx`.** React 19 StrictMode double-renders, which turns a
  separate, otherwise-recoverable hydration warning (`<WithComponentProps2>` failing a `useContext`
  call) into a fatal blank-page crash instead of a warning React auto-recovers from. If you see that
  warning in the console on a fresh load, that's expected and non-fatal — the page still renders
  correctly. Do not re-add `StrictMode` without re-verifying this.
- **`optimizeDeps.include` in `vite.config.ts`** explicitly lists `react`, `react-dom`,
  `react-router`, `@heroui/react`, `framer-motion`, `lucide-react`. Without this, Vite would
  sometimes discover and re-bundle one of these mid-hydration ("✨ optimized dependencies changed.
  reloading"), tearing down the app right as it finished mounting. If you add a new heavy dependency
  and see that message in `npm run dev`'s terminal output, add it to this list too.
- **`redux-persist`'s React integration must be imported from `redux-persist/lib/integration/react`,
  not `redux-persist/integration/react`.** The latter is a directory without an explicit
  `index.js`/extension; Node's ESM loader refuses to resolve it as a "directory import" when
  `react-router build` builds the SSR shell bundle, and the build fails with
  `ERR_UNSUPPORTED_DIR_IMPORT`. The `/lib/...` path is the compiled CJS entry and resolves fine.

## 7. Bridge server details & gotchas ([`server/index.ts`](server/index.ts))

- Imports `Tax990Client` straight from **TypeScript source**, `../../nodejs/src/index` — not the
  published npm package. Editing `nodejs/src/...` and restarting `npm run server` (via `tsx`) is
  enough to test SDK changes through the UI; no build/publish step needed.
- **`.env` is loaded via `dotenv`** (`import 'dotenv/config'`, the first import in
  `server/index.ts`, so it runs before anything reads `process.env`). Env loading only happens once
  at process startup — if you edit `.env` while the server is already running, you must stop
  (`Ctrl+C`) and restart it; there is no hot-reload of env vars. Shell-exported vars (`export ...` /
  `$env:...`) still take precedence over `.env` if both are present, since `dotenv.config()` never
  overwrites a key already set in `process.env`.
- **Symptom of a missing/empty `TAX990_CLIENT_SECRET`**: the bridge returns
  `{"StatusCode":500,"StatusMessage":"secretOrPrivateKey must have a value"}` on every route. That
  exact message comes from the `jsonwebtoken` package inside
  [`nodejs/src/auth/OAuthClient.ts`](../nodejs/src/auth/OAuthClient.ts) (`jwt.sign(payload,
  clientSecret, ...)`) refusing to sign with an empty secret — it means `TAX990_CLIENT_SECRET`
  never made it into `process.env` for the process that's actually listening on `:4100` (wrong
  `.env` values, or an old server process still running that predates a `.env` edit).
- `TAX990_API_URL` and `TAX990_OAUTH_URL` are **required** — the SDK reads the API and OAuth base
  URLs exclusively from these env vars. Leaving them empty causes every bridge route to fail with a
  connection error.
- **Idempotency key is not forwarded.** `POST /api/form990n/create` in this Node bridge does not
  read the `idempotency-key` request header at all, unlike the .NET/Go/Python reference
  implementations in `../UI_INTEGRATION.md` §5–7. If you're testing idempotent-create behavior
  specifically, you need one of those three backends instead, or patch this route yourself.
- CORS is wide open (`app.use(cors())`, no origin restriction) — fine for local dev, do not deploy
  this bridge server as-is.
- `EADDRINUSE` on `:4100` almost always means a previous bridge server (this one, or a .NET/Go/
  Python one from `../UI_INTEGRATION.md`) is still running — only one bridge server should be up at
  a time; stop it before starting another language's.

## 8. Styling

Tailwind v3 (`tailwind.config.js`) + HeroUI's plugin, theme colors ported from `tax990-console-app`:

| Token | Hex | Used for |
|---|---|---|
| `primary` | `#d64000` | Accent actions, primary buttons, icon tints |
| `secondary` | `#0a77d6` | Active nav item background, links |
| `tertiary` | `#0E4678` | Top navbar background, headings |
| `black` | `#142535` | Body text |
| `grey` (+ `lighten-1/2/3`) | `#4C6177` scale | Secondary text, borders |
| `disable` | `#F2F6FA` | Page/sidebar background |
| `success` / `danger` / `warning` | `#017517` / `#CA140B` / `#B7791F` | Status chips, alerts |

Reusable component classes in [`app/app.css`](app/app.css) (`@layer components`): `.card-default`
(white, bordered, `rounded-lg`), `.card-default-header`, `.heading-bottom-line` (the small underline
accent under page titles), `.link-text`. There is **no dark mode implemented** — `darkMode: 'class'`
is set but nothing currently toggles it.

Do not use template-literal Tailwind classes like `` `bg-${color}/10` `` — Tailwind's JIT scanner
only detects statically-written class strings, so a dynamic one silently generates no CSS at all
(this was a real bug fixed on the Overview page's icon tiles — see the `iconTint` lookup object
pattern in `app/routes/_protected._index.tsx` for the correct approach: map every variant to a
literal class string ahead of time).
