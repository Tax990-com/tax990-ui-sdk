# UI ↔ SDK Backend Integration

This explains how the React UI in [`frontend/`](frontend) connects to a Tax990 SDK, and how to
wire it up to each of the four SDK backends: **Node.js** (the existing reference), **.NET**, **Go**,
and **Python**. For everything specific to the frontend app itself — how to run it, its React
Router v7 + Redux architecture, and its hydration/build gotchas — see
[`frontend/README.md`](frontend/README.md). This file only covers the bridge-server contract.

## 1. Architecture

The UI (React Router v7, framework mode, SPA-only — `ssr: false`) never imports an SDK directly. It
only speaks REST to a local **bridge server** — a thin HTTP layer that turns each REST call into one
SDK method call. Which language that bridge server is written in is invisible to the UI:

```
React UI (frontend/app)
   │  axios, baseURL "/api"          [frontend/app/api/client.ts]
   ▼
Vite dev server :3000
   │  proxies /api/* → http://localhost:4100   [frontend/vite.config.ts]
   ▼
Bridge server :4100   (Node.js today — .NET / Go / Python are drop-in replacements)
   │  one Tax990Client call per route
   ▼
Tax990 SDK  (dotnet | nodejs | go | python)
   │  OAuth + signed HTTP calls
   ▼
Tax990 Public API / OAuth server
```

Because the UI only depends on the REST contract below, **swapping backends is just: stop one
bridge server, start another on the same port, reload the page.** No frontend code changes.

The existing reference implementation is [`frontend/server/index.ts`](frontend/server/index.ts) —
an Express server wrapping the Node SDK. The sections below give you the equivalent for the other
three languages.

## 2. The contract the UI expects

Every route the UI calls, read straight from [`frontend/app/services`](frontend/app/services).
Whatever language implements the bridge server, it must expose exactly these routes:

| Method | Route | Query / Body | SDK call |
|---|---|---|---|
| POST | `/api/auth/token` | — | `utility.ping()` |
| GET | `/api/auth/server-time` | — | `utility.ping()` |
| POST | `/api/form990n/create` | body: `CreatePayload`, header: `idempotency-key` (optional) | `form990n.create(payload, idempotencyKey)` |
| POST | `/api/form990n/update` | body: `UpdatePayload` | `form990n.update(payload)` |
| GET | `/api/form990n/get` | `SubmissionId`, `RecordId?` | `form990n.get(...)` |
| GET | `/api/form990n/list` | `SubmissionId?`, `BusinessId?` | `form990n.list(...)` |
| DELETE | `/api/form990n/delete` | `SubmissionId`, `RecordId?` | `form990n.delete(...)` |
| GET | `/api/form990n/validate` | `SubmissionId`, `RecordIds` (comma-separated) | `form990n.validate(...)` |
| POST | `/api/form990n/transmit` | body: `TransmitPayload` | `form990n.transmit(payload)` |
| GET | `/api/form990n/getPDF` | `SubmissionId`, `RecordIds?` (comma-separated) | `form990n.getPDF(...)` |
| GET | `/api/form990n/status` | `SubmissionId`, `RecordIds?` (comma-separated) | `form990n.status(...)` |
| GET | `/api/utility/ping` | — | `utility.ping()` |
| GET | `/api/utility/getAllSubmissionId` | — | `utility.getAllSubmissionIds()` |
| GET | `/api/utility/getSubmissionIdByBusinessId` | `businessId` | `utility.getSubmissionIdByBusinessId(...)` |
| GET | `/api/utility/getSubmissionIdByRecordId` | `recordId` | `utility.getSubmissionIdByRecordId(...)` |
| GET | `/api/utility/getRecordIds` | — | `utility.getRecordIds()` |
| GET | `/api/utility/getRecordIdBySubmissionId` | `submissionId` | `utility.getRecordIdBySubmissionId(...)` |
| GET | `/api/utility/getRecordDetailBySubmissionId` | `submissionId` | `utility.getRecordDetailBySubmissionId(...)` |
| GET | `/api/utility/getAllBusinessId` | — | `utility.getAllBusinessIds()` |
| GET | `/api/utility/getBusinessIdBySubmissionId` | `submissionId` | `utility.getBusinessIdBySubmissionId(...)` |
| GET | `/api/nonprofits/getOrganizationDetailsByEIN` | `ein` | `nonprofits.getOrganizationDetailsByEIN(...)` |

**Error shape**: on any failure, respond `500` with `{ "StatusCode": 500, "StatusMessage": "<message>" }`
— this is what `frontend/app/api/client.ts`'s axios interceptor reads to surface the error in the UI.
Every example below follows this same shape so error handling in the UI needs no changes.

## 3. Environment variables (same names, every language)

```
TAX990_CLIENT_ID=...
TAX990_CLIENT_SECRET=...
TAX990_USER_TOKEN=...
TAX990_API_URL=...           # Public API base URL (required)
TAX990_OAUTH_URL=...         # OAuth API base URL (required)
PORT=4100                    # must match vite.config.ts's proxy target port
```

Every backend reads API and OAuth URLs **exclusively** from `TAX990_API_URL` and `TAX990_OAUTH_URL`
— there is no environment-name-based URL selection. Each backend loads these from its own `.env`
file automatically at startup (see §5–7 for which file and which library), so you rarely need to
export them manually.

For the Node.js bridge, the variables belong in `frontend/.env` alongside the frontend's own
`VITE_AUTH_USERNAME` / `VITE_AUTH_PASSWORD` (the hardcoded UI sign-in gate). Despite living in one
file, they're read by two entirely separate processes: `server/index.ts` loads the `TAX990_*`/`PORT`
keys via `dotenv` at startup (bridge server only — the browser never sees them), while Vite embeds
`VITE_`-prefixed keys into the client bundle at build/dev time (frontend only — the SDK credentials
are invisible to it, since the UI never talks to the SDK directly).

## 4. Node.js backend (existing reference)

Already implemented in [`frontend/server/index.ts`](frontend/server/index.ts), built on
`Tax990Client` from [`nodejs/src/index.ts`](nodejs/src/index.ts).

```bash
cd frontend
npm install
npm run server     # starts the Express bridge on :4100
```

In a second terminal:

```bash
npm run dev         # starts Vite on :3000, proxying /api → :4100
```

Open `http://localhost:3000`. This is the pattern the other three languages replicate exactly.

## 5. .NET backend

The SDK ([`dotnet/src/Tax990.SDK`](dotnet/src/Tax990.SDK)) is a plain class library with no web
framework dependency, so the bridge is a minimal ASP.NET Core Web API host.

**This already exists** at [`dotnet/bridge`](dotnet/bridge) (`dotnet new web` scaffold +
`Program.cs` below), builds clean with `dotnet build` against .NET SDK 9 targeting the library's
`net8.0`. The steps below are how it was created, kept for reference / rebuilding from scratch:

```bash
cd dotnet
dotnet new web -n Tax990.SDK.Bridge -o bridge
cd bridge
dotnet add reference ../src/Tax990.SDK/Tax990.SDK.csproj
```

**`bridge/Program.cs`:**

```csharp
using Tax990.SDK.Clients;
using Tax990.SDK.Configuration;
using Tax990.SDK.Requests;

DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors();

// TAX990_API_URL and TAX990_OAUTH_URL are read directly by the SDK from environment variables.
// They are loaded from dotnet/bridge/.env via DotNetEnv.Env.Load() above.
var client = new Tax990Client(new Tax990Configuration
{
    ClientId = Environment.GetEnvironmentVariable("TAX990_CLIENT_ID") ?? "",
    ClientSecret = Environment.GetEnvironmentVariable("TAX990_CLIENT_SECRET") ?? "",
    UserToken = Environment.GetEnvironmentVariable("TAX990_USER_TOKEN") ?? "",
});

static IResult Fail(Exception e) => Results.Json(new { StatusCode = 500, StatusMessage = e.Message }, statusCode: 500);
static List<string>? Csv(string? s) => string.IsNullOrEmpty(s) ? null : s.Split(',').ToList();

// ─── Auth ────────────────────────────────────────────────────────
app.MapPost("/api/auth/token", async () => {
    try { return Results.Ok(await client.Utility.PingAsync()); } catch (Exception e) { return Fail(e); }
});
app.MapGet("/api/auth/server-time", async () => {
    try { return Results.Ok(await client.Utility.PingAsync()); } catch (Exception e) { return Fail(e); }
});

// ─── Form 990-N ──────────────────────────────────────────────────
app.MapPost("/api/form990n/create", async (HttpRequest req, CreateForm990NRequest body) => {
    try {
        var key = req.Headers["idempotency-key"].FirstOrDefault();
        return Results.Ok(await client.Form990N.CreateAsync(body, key));
    } catch (Exception e) { return Fail(e); }
});
app.MapPost("/api/form990n/update", async (UpdateForm990NRequest body) => {
    try { return Results.Ok(await client.Form990N.UpdateAsync(body)); } catch (Exception e) { return Fail(e); }
});
app.MapGet("/api/form990n/get", async (string SubmissionId, string? RecordId) => {
    try { return Results.Ok(await client.Form990N.GetAsync(new GetForm990NParams { SubmissionId = SubmissionId, RecordId = RecordId })); }
    catch (Exception e) { return Fail(e); }
});
app.MapGet("/api/form990n/list", async (string? SubmissionId, string? BusinessId) => {
    try { return Results.Ok(await client.Form990N.ListAsync(new ListForm990NParams { SubmissionId = SubmissionId, BusinessId = BusinessId })); }
    catch (Exception e) { return Fail(e); }
});
app.MapDelete("/api/form990n/delete", async (string SubmissionId, string? RecordId) => {
    try { return Results.Ok(await client.Form990N.DeleteAsync(new DeleteForm990NParams { SubmissionId = SubmissionId, RecordId = RecordId })); }
    catch (Exception e) { return Fail(e); }
});
app.MapGet("/api/form990n/validate", async (string SubmissionId, string RecordIds) => {
    try { return Results.Ok(await client.Form990N.ValidateAsync(new ValidateForm990NParams { SubmissionId = SubmissionId, RecordIds = Csv(RecordIds) ?? new() })); }
    catch (Exception e) { return Fail(e); }
});
app.MapPost("/api/form990n/transmit", async (TransmitForm990NRequest body) => {
    try { return Results.Ok(await client.Form990N.TransmitAsync(body)); } catch (Exception e) { return Fail(e); }
});
app.MapGet("/api/form990n/getPDF", async (string SubmissionId, string? RecordIds) => {
    try { return Results.Ok(await client.Form990N.GetPDFAsync(new GetPDFParams { SubmissionId = SubmissionId, RecordIds = Csv(RecordIds) })); }
    catch (Exception e) { return Fail(e); }
});
app.MapGet("/api/form990n/status", async (string SubmissionId, string? RecordIds) => {
    try { return Results.Ok(await client.Form990N.StatusAsync(new StatusParams { SubmissionId = SubmissionId, RecordIds = Csv(RecordIds) })); }
    catch (Exception e) { return Fail(e); }
});

// ─── Utility ─────────────────────────────────────────────────────
app.MapGet("/api/utility/ping", async () => { try { return Results.Ok(await client.Utility.PingAsync()); } catch (Exception e) { return Fail(e); } });
app.MapGet("/api/utility/getAllSubmissionId", async () => { try { return Results.Ok(await client.Utility.GetAllSubmissionIdAsync()); } catch (Exception e) { return Fail(e); } });
app.MapGet("/api/utility/getSubmissionIdByBusinessId", async (string businessId) => { try { return Results.Ok(await client.Utility.GetSubmissionIdByBusinessIdAsync(businessId)); } catch (Exception e) { return Fail(e); } });
app.MapGet("/api/utility/getSubmissionIdByRecordId", async (string recordId) => { try { return Results.Ok(await client.Utility.GetSubmissionIdByRecordIdAsync(recordId)); } catch (Exception e) { return Fail(e); } });
app.MapGet("/api/utility/getRecordIds", async () => { try { return Results.Ok(await client.Utility.GetRecordIdsAsync()); } catch (Exception e) { return Fail(e); } });
app.MapGet("/api/utility/getRecordIdBySubmissionId", async (string submissionId) => { try { return Results.Ok(await client.Utility.GetRecordIdBySubmissionIdAsync(submissionId)); } catch (Exception e) { return Fail(e); } });
app.MapGet("/api/utility/getRecordDetailBySubmissionId", async (string submissionId) => { try { return Results.Ok(await client.Utility.GetRecordDetailBySubmissionIdAsync(submissionId)); } catch (Exception e) { return Fail(e); } });
app.MapGet("/api/utility/getAllBusinessId", async () => { try { return Results.Ok(await client.Utility.GetAllBusinessIdAsync()); } catch (Exception e) { return Fail(e); } });
app.MapGet("/api/utility/getBusinessIdBySubmissionId", async (string submissionId) => { try { return Results.Ok(await client.Utility.GetBusinessIdBySubmissionIdAsync(submissionId)); } catch (Exception e) { return Fail(e); } });

// ─── Nonprofits ──────────────────────────────────────────────────
app.MapGet("/api/nonprofits/getOrganizationDetailsByEIN", async (string ein) => {
    try { return Results.Ok(await client.Nonprofits.GetOrganizationDetailsByEINAsync(ein)); } catch (Exception e) { return Fail(e); }
});

app.Urls.Add($"http://localhost:{Environment.GetEnvironmentVariable("PORT") ?? "4100"}");
app.Run();
```

**Run:** Put credentials in `dotnet/bridge/.env` (loaded automatically by `DotNetEnv.Env.Load()` at
startup — shell-exported vars still take precedence if both are set):

```
TAX990_CLIENT_ID=...
TAX990_CLIENT_SECRET=...
TAX990_USER_TOKEN=...
TAX990_API_URL=...
TAX990_OAUTH_URL=...
```

```bash
cd dotnet
dotnet run --project bridge
```

Then start the frontend as in §4 — it talks to whichever backend is listening on `:4100`.

## 6. Go backend

The SDK entry point is `tax990.NewClient` in [`go/tax990/client.go`](go/tax990/client.go).

**This already exists** at [`go/cmd/bridge/main.go`](go/cmd/bridge/main.go) (content matches the
listing below verified line-for-line against the SDK's actual method signatures). It has **not**
been compiled here — no Go toolchain was available in this environment — so run `go build
./cmd/bridge` yourself as your first step before anything else.

```go
package main

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/tax990/sdk-go/tax990"
	"github.com/tax990/sdk-go/tax990/models"
)

var client *tax990.Tax990Client

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, err error) {
	writeJSON(w, http.StatusInternalServerError, map[string]any{
		"StatusCode":    500,
		"StatusMessage": err.Error(),
	})
}

func csv(s string) []string {
	if s == "" {
		return nil
	}
	return strings.Split(s, ",")
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, idempotency-key")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			return
		}
		h(w, r)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	godotenv.Load()
	// TAX990_API_URL and TAX990_OAUTH_URL are read directly by the SDK from environment variables.
	// They are loaded from go/.env via godotenv.Load() above.
	c, err := tax990.NewClient(tax990.Config{
		ClientID:     os.Getenv("TAX990_CLIENT_ID"),
		ClientSecret: os.Getenv("TAX990_CLIENT_SECRET"),
		UserToken:    os.Getenv("TAX990_USER_TOKEN"),
	})
	if err != nil {
		panic(err)
	}
	client = c

	mux := http.NewServeMux()

	// ─── Auth ────────────────────────────────────────────────────
	mux.HandleFunc("/api/auth/token", withCORS(func(w http.ResponseWriter, r *http.Request) {
		result, err := client.Utility.Ping(r.Context())
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/auth/server-time", withCORS(func(w http.ResponseWriter, r *http.Request) {
		result, err := client.Utility.Ping(r.Context())
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, result)
	}))

	// ─── Form 990-N ──────────────────────────────────────────────
	mux.HandleFunc("/api/form990n/create", withCORS(func(w http.ResponseWriter, r *http.Request) {
		var payload models.CreatePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, err)
			return
		}
		result, err := client.Form990N.Create(r.Context(), &payload, r.Header.Get("idempotency-key"))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/form990n/update", withCORS(func(w http.ResponseWriter, r *http.Request) {
		var payload models.UpdatePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, err)
			return
		}
		result, err := client.Form990N.Update(r.Context(), &payload)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/form990n/get", withCORS(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		result, err := client.Form990N.Get(r.Context(), q.Get("SubmissionId"), q.Get("RecordId"))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/form990n/list", withCORS(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		result, err := client.Form990N.List(r.Context(), q.Get("SubmissionId"), q.Get("BusinessId"))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/form990n/delete", withCORS(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		result, err := client.Form990N.Delete(r.Context(), q.Get("SubmissionId"), q.Get("RecordId"))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/form990n/validate", withCORS(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		result, err := client.Form990N.Validate(r.Context(), q.Get("SubmissionId"), csv(q.Get("RecordIds")))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/form990n/transmit", withCORS(func(w http.ResponseWriter, r *http.Request) {
		var payload models.TransmitPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, err)
			return
		}
		result, err := client.Form990N.Transmit(r.Context(), &payload)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/form990n/getPDF", withCORS(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		result, err := client.Form990N.GetPDF(r.Context(), q.Get("SubmissionId"), csv(q.Get("RecordIds")))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/form990n/status", withCORS(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		result, err := client.Form990N.Status(r.Context(), q.Get("SubmissionId"), csv(q.Get("RecordIds")))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, result)
	}))

	// ─── Utility ─────────────────────────────────────────────────
	mux.HandleFunc("/api/utility/ping", withCORS(func(w http.ResponseWriter, r *http.Request) {
		result, err := client.Utility.Ping(r.Context())
		if err != nil { writeError(w, err); return }
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/utility/getAllSubmissionId", withCORS(func(w http.ResponseWriter, r *http.Request) {
		result, err := client.Utility.GetAllSubmissionId(r.Context())
		if err != nil { writeError(w, err); return }
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/utility/getSubmissionIdByBusinessId", withCORS(func(w http.ResponseWriter, r *http.Request) {
		result, err := client.Utility.GetSubmissionIdByBusinessId(r.Context(), r.URL.Query().Get("businessId"))
		if err != nil { writeError(w, err); return }
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/utility/getSubmissionIdByRecordId", withCORS(func(w http.ResponseWriter, r *http.Request) {
		result, err := client.Utility.GetSubmissionIdByRecordId(r.Context(), r.URL.Query().Get("recordId"))
		if err != nil { writeError(w, err); return }
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/utility/getRecordIds", withCORS(func(w http.ResponseWriter, r *http.Request) {
		result, err := client.Utility.GetRecordIds(r.Context())
		if err != nil { writeError(w, err); return }
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/utility/getRecordIdBySubmissionId", withCORS(func(w http.ResponseWriter, r *http.Request) {
		result, err := client.Utility.GetRecordIdBySubmissionId(r.Context(), r.URL.Query().Get("submissionId"))
		if err != nil { writeError(w, err); return }
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/utility/getRecordDetailBySubmissionId", withCORS(func(w http.ResponseWriter, r *http.Request) {
		result, err := client.Utility.GetRecordDetailBySubmissionId(r.Context(), r.URL.Query().Get("submissionId"))
		if err != nil { writeError(w, err); return }
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/utility/getAllBusinessId", withCORS(func(w http.ResponseWriter, r *http.Request) {
		result, err := client.Utility.GetAllBusinessId(r.Context())
		if err != nil { writeError(w, err); return }
		writeJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/utility/getBusinessIdBySubmissionId", withCORS(func(w http.ResponseWriter, r *http.Request) {
		result, err := client.Utility.GetBusinessIdBySubmissionId(r.Context(), r.URL.Query().Get("submissionId"))
		if err != nil { writeError(w, err); return }
		writeJSON(w, http.StatusOK, result)
	}))

	// ─── Nonprofits ──────────────────────────────────────────────
	mux.HandleFunc("/api/nonprofits/getOrganizationDetailsByEIN", withCORS(func(w http.ResponseWriter, r *http.Request) {
		result, err := client.Nonprofits.GetOrganizationDetailsByEIN(r.Context(), r.URL.Query().Get("ein"))
		if err != nil { writeError(w, err); return }
		writeJSON(w, http.StatusOK, result)
	}))

	port := envOr("PORT", "4100")
	http.ListenAndServe(":"+port, mux)
}
```

**Run:** Put credentials in `go/.env` (loaded automatically by `godotenv.Load()` at startup —
shell-exported vars still take precedence if both are set):

```
TAX990_CLIENT_ID=...
TAX990_CLIENT_SECRET=...
TAX990_USER_TOKEN=...
TAX990_API_URL=...
TAX990_OAUTH_URL=...
```

```bash
cd go
go build ./cmd/bridge   # sanity-check it compiles in your environment first
go run ./cmd/bridge
```

Then start the frontend as in §4.

## 7. Python backend

The SDK ([`python/tax990`](python/tax990)) is async (`httpx` under the hood). FastAPI is the
natural fit since the SDK already depends on `pydantic`. `python-dotenv` is already a core SDK
dependency (see `python/pyproject.toml`), so `load_dotenv()` below needs no extra install.

**Setup** (a virtual environment is strongly recommended — this installs the SDK in editable mode
so edits to `python/tax990/...` take effect on the next `uvicorn` restart, no reinstall needed):

```bash
cd python
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash/WSL; use .venv\Scripts\Activate.ps1 on native PowerShell
pip install -e .
pip install fastapi "uvicorn[standard]"
```

**`python/bridge.py`:**

```python
import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from tax990 import Tax990Client
from tax990.models.form990n import CreatePayload, TransmitPayload, UpdatePayload

load_dotenv()

# TAX990_API_URL and TAX990_OAUTH_URL are read directly by the SDK from environment variables.
# They are loaded from python/.env via load_dotenv() above.
client = Tax990Client(
    client_id=os.environ.get("TAX990_CLIENT_ID", ""),
    client_secret=os.environ.get("TAX990_CLIENT_SECRET", ""),
    user_token=os.environ.get("TAX990_USER_TOKEN", ""),
)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def fail(exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"StatusCode": 500, "StatusMessage": str(exc)})


def csv(value: Optional[str]) -> Optional[list[str]]:
    return value.split(",") if value else None


# ─── Auth ────────────────────────────────────────────────────────
@app.post("/api/auth/token")
async def auth_token():
    try:
        return await client.utility.ping()
    except Exception as exc:
        return fail(exc)


@app.get("/api/auth/server-time")
async def server_time():
    try:
        return await client.utility.ping()
    except Exception as exc:
        return fail(exc)


# ─── Form 990-N ──────────────────────────────────────────────────
@app.post("/api/form990n/create")
async def form990n_create(request: Request, idempotency_key: Optional[str] = Header(None)):
    try:
        payload = CreatePayload.model_validate(await request.json())
        return await client.form990n.create(payload, idempotency_key)
    except Exception as exc:
        return fail(exc)


@app.post("/api/form990n/update")
async def form990n_update(request: Request):
    try:
        payload = UpdatePayload.model_validate(await request.json())
        return await client.form990n.update(payload)
    except Exception as exc:
        return fail(exc)


@app.get("/api/form990n/get")
async def form990n_get(
    submission_id: str = Query(alias="SubmissionId"),
    record_id: Optional[str] = Query(None, alias="RecordId"),
):
    try:
        return await client.form990n.get(submission_id, record_id)
    except Exception as exc:
        return fail(exc)


@app.get("/api/form990n/list")
async def form990n_list(
    submission_id: Optional[str] = Query(None, alias="SubmissionId"),
    business_id: Optional[str] = Query(None, alias="BusinessId"),
):
    try:
        return await client.form990n.list(submission_id, business_id)
    except Exception as exc:
        return fail(exc)


@app.delete("/api/form990n/delete")
async def form990n_delete(
    submission_id: str = Query(alias="SubmissionId"),
    record_id: Optional[str] = Query(None, alias="RecordId"),
):
    try:
        return await client.form990n.delete(submission_id, record_id)
    except Exception as exc:
        return fail(exc)


@app.get("/api/form990n/validate")
async def form990n_validate(
    submission_id: str = Query(alias="SubmissionId"),
    record_ids: str = Query(alias="RecordIds"),
):
    try:
        return await client.form990n.validate(submission_id, csv(record_ids) or [])
    except Exception as exc:
        return fail(exc)


@app.post("/api/form990n/transmit")
async def form990n_transmit(request: Request):
    try:
        payload = TransmitPayload.model_validate(await request.json())
        return await client.form990n.transmit(payload)
    except Exception as exc:
        return fail(exc)


@app.get("/api/form990n/getPDF")
async def form990n_get_pdf(
    submission_id: str = Query(alias="SubmissionId"),
    record_ids: Optional[str] = Query(None, alias="RecordIds"),
):
    try:
        return await client.form990n.get_pdf(submission_id, csv(record_ids))
    except Exception as exc:
        return fail(exc)


@app.get("/api/form990n/status")
async def form990n_status(
    submission_id: str = Query(alias="SubmissionId"),
    record_ids: Optional[str] = Query(None, alias="RecordIds"),
):
    try:
        return await client.form990n.status(submission_id, csv(record_ids))
    except Exception as exc:
        return fail(exc)


# ─── Utility ─────────────────────────────────────────────────────
@app.get("/api/utility/ping")
async def utility_ping():
    try:
        return await client.utility.ping()
    except Exception as exc:
        return fail(exc)


@app.get("/api/utility/getAllSubmissionId")
async def utility_all_submission_ids():
    try:
        return await client.utility.get_all_submission_id()
    except Exception as exc:
        return fail(exc)


@app.get("/api/utility/getSubmissionIdByBusinessId")
async def utility_submission_id_by_business_id(businessId: str = Query()):
    try:
        return await client.utility.get_submission_id_by_business_id(businessId)
    except Exception as exc:
        return fail(exc)


@app.get("/api/utility/getSubmissionIdByRecordId")
async def utility_submission_id_by_record_id(recordId: str = Query()):
    try:
        return await client.utility.get_submission_id_by_record_id(recordId)
    except Exception as exc:
        return fail(exc)


@app.get("/api/utility/getRecordIds")
async def utility_record_ids():
    try:
        return await client.utility.get_record_ids()
    except Exception as exc:
        return fail(exc)


@app.get("/api/utility/getRecordIdBySubmissionId")
async def utility_record_id_by_submission_id(submissionId: str = Query()):
    try:
        return await client.utility.get_record_id_by_submission_id(submissionId)
    except Exception as exc:
        return fail(exc)


@app.get("/api/utility/getRecordDetailBySubmissionId")
async def utility_record_detail_by_submission_id(submissionId: str = Query()):
    try:
        return await client.utility.get_record_detail_by_submission_id(submissionId)
    except Exception as exc:
        return fail(exc)


@app.get("/api/utility/getAllBusinessId")
async def utility_all_business_ids():
    try:
        return await client.utility.get_all_business_id()
    except Exception as exc:
        return fail(exc)


@app.get("/api/utility/getBusinessIdBySubmissionId")
async def utility_business_id_by_submission_id(submissionId: str = Query()):
    try:
        return await client.utility.get_business_id_by_submission_id(submissionId)
    except Exception as exc:
        return fail(exc)


# ─── Nonprofits ──────────────────────────────────────────────────
@app.get("/api/nonprofits/getOrganizationDetailsByEIN")
async def nonprofits_get_by_ein(ein: str = Query()):
    try:
        return await client.nonprofits.get_organization_details_by_ein(ein=ein)
    except Exception as exc:
        return fail(exc)
```

**Run:** Put credentials in `python/.env` (loaded automatically by `load_dotenv()` at the top of
`bridge.py` — shell-exported vars still take precedence if both are set):

```
TAX990_CLIENT_ID=...
TAX990_CLIENT_SECRET=...
TAX990_USER_TOKEN=...
TAX990_API_URL=...
TAX990_OAUTH_URL=...
```

```bash
uvicorn bridge:app --port 4100
```

Verified end-to-end against the real hosted staging API this way: `GET /api/utility/ping`,
`POST /api/auth/token`, `GET /api/utility/getAllSubmissionId`, and `GET /api/form990n/get` all
returned real data; `GET /api/nonprofits/getOrganizationDetailsByEIN` with a nonexistent EIN
correctly returned the documented `{"StatusCode":500,"StatusMessage":"..."}` error shape instead of
crashing.

> Note: `businessId`, `recordId`, `submissionId`, `ein` are already lowerCamelCase in the contract
> (matching the frontend's `utilityService.ts` / `nonprofitsService.ts` exactly), so FastAPI's
> default query-param name matching works without an `alias`. Only the Form990N routes need
> `alias=` because those query keys are PascalCase (`SubmissionId`, `RecordId`, `RecordIds`,
> `BusinessId`).

Then start the frontend as in §4.

## 8. Switching backends

The Vite dev proxy always forwards `/api/*` to `http://localhost:4100`
([`frontend/vite.config.ts`](frontend/vite.config.ts)). Because every backend listens on that same
port and exposes the same routes, only **one bridge server should run at a time**:

```bash
# stop whichever bridge is running, then start another:
npm run server            # Node
dotnet run --project bridge   # .NET
go run ./cmd/bridge        # Go
uvicorn bridge:app --port 4100   # Python
```

The frontend itself needs no changes or restart — reload the browser tab after switching.

To run more than one simultaneously, give each a different `PORT` and change the `target` in
`vite.config.ts`'s proxy config to match whichever one you want the UI to hit.
