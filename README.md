# Visitor Personalization Genius

A lightweight POC backend service that personalizes what anonymous visitors see when they arrive on a site — without requiring login. Inspired by SignUpGenius.

**Leadership goal:** Improve conversion of new users into users who create and launch a signup.

## What It Does

1. **Captures visitor signals** at arrival time (UTM params, referrer, page path, and arbitrary custom signals like signup category)
2. **Returns a personalization decision** — which hero content, CTA, and theme variant to show the visitor

The POC focuses on **homepage personalization** first. The architecture is designed to expand to other page types later.

## Endpoints

### `POST /v1/visitors/capture`

Capture visitor signals, create/reuse anonymous identity, derive segment weights and lifecycle stage.

**Request:**

```json
{
  "requestId": "req_abc123",
  "page": {
    "path": "/",
    "pageType": "homepage",
    "referrer": "https://www.google.com/",
    "query": {
      "utm_source": "google",
      "utm_medium": "cpc",
      "utm_campaign": "schools_fall_signup_drive",
      "utm_content": "hero_a",
      "utm_term": "school signup sheet",
      "gclid": "abc123"
    }
  },
  "signupgeniusUserId": "12345",
  "signals": {
    "signup_category": "Sports & Recreation"
  },
  "context": {
    "lifecycleStageHint": "attendee"
  }
}
```

**Response:**

```json
{
  "visitorId": "vis_550e8400-e29b-41d4-a716-446655440000",
  "lifecycleStage": "attendee",
  "primarySegment": "school",
  "subSegment": null,
  "segmentWeights": {
    "school": 9,
    "church": 0,
    "nonprofit": 0,
    "sports": 6,
    "business": 0,
    "unknown": 0
  }
}
```

Also sets cookie `sg_vid=<visitorId>`.

**Notes:**
- `requestId` is required. Must be unique per page-load event (used for idempotency).
- `page.pageType` is required. All other fields are optional.
- `signupgeniusUserId` is optional. When provided, the visitor record is linked to a SignUpGenius account. Once set, subsequent captures without this field will not overwrite the existing link. This is how anonymous visitor data is preserved after account creation.
- `signals` is an optional key-value map (`Record<string, string>`) for arbitrary custom data points beyond UTM params — e.g. `signup_category`, `template_selected`, or any future signal the UI wants to send. Signal keys are matched against segment rules just like UTM fields.
- If no `sg_vid` cookie exists, a new visitor is created.

### `POST /v1/personalization/decide`

Resolve the visitor from cookie, evaluate rules, and return the personalized experience payload.

**Request:**

```json
{
  "pageType": "homepage"
}
```

**Response:**

```json
{
  "visitorId": "vis_550e8400-e29b-41d4-a716-446655440000",
  "lifecycleStage": "attendee",
  "primarySegment": "school",
  "subSegment": null,
  "segmentWeights": {
    "school": 9,
    "church": 0,
    "nonprofit": 0,
    "sports": 0,
    "business": 0,
    "unknown": 0
  },
  "experience": {
    "templateKey": "homepage_school_general",
    "hero": {
      "headline": "Organize school events without the chaos",
      "subheadline": "Create sign ups for conferences, volunteers, and more.",
      "ctaText": "Create a School Sign Up",
      "ctaUrl": "/register?template=school"
    },
    "theme": {
      "variant": "education-blue"
    }
  },
  "metadata": {
    "fallbackUsed": false,
    "rulesetVersion": "v1"
  }
}
```

**Notes:**
- Only `pageType` is required in the body.
- Visitor is resolved from the `sg_vid` cookie.
- If no visitor exists, a default (non-personalized) experience is returned with `fallbackUsed: true`.

### `GET /health`

Returns `{ "status": "ok" }`.

## How Visitor Identity Works

- The backend manages anonymous visitor identity entirely.
- On first visit (no `sg_vid` cookie), a new visitor ID is generated (e.g. `vis_<uuid>`).
- The `sg_vid` cookie is set with the visitor ID as the value.
- On subsequent visits, the visitor ID is read from the cookie.
- The visitor ID **is** the cookie value — no separate anonymous_cookie_id column.

### Account Linking

When a visitor creates a SignUpGenius account, the frontend sends `signupgeniusUserId` in the next capture request. This links the existing anonymous visitor record to their account — the `vis_<uuid>` stays the same, so all historical signal logs, segment weights, and personalization decisions remain attached. Once set, `signupgeniusUserId` is never overwritten by subsequent captures that omit it.

## How Rules Work

The personalization engine uses a **2-step process**:

### Step 1: Derive visitor state

Signal fields (utm_campaign, path, referrer, custom signals like signup_category, etc.) are matched against **segment rules** defined in `src/config/personalization.json`. Each matching rule contributes a weight to a segment.

A given field can only trigger a segment weight **once** — if multiple rules match the same field+segment pair, only the first match (in config order) fires. Different fields can still independently contribute to the same segment.

Custom signals sent via the `signals` field are merged into the same field map as UTM params and matched by the same rules. For example, a rule with `"field": "signup_category"` will match against the value sent in `signals.signup_category`.

Weights are merged across visits using the formula:

```
mergedWeight = (oldWeight × weightMergeFactor) + newWeight
```

The `weightMergeFactor` (default: 0.7) is configurable. This means strong new signals can shift the primary segment over time, while historical signals gradually decay.

The segment with the highest weight becomes `primarySegment`.

### Step 2: Choose template

**Template rules** are evaluated in order — first match wins. Rules match on:
- `pageType` (required)
- `lifecycleStage` (array of stages to match)
- `primarySegment` (optional — if omitted, matches any segment)

Each template key maps to content defined in the same config file.

### Supported segments

`school`, `church`, `nonprofit`, `sports`, `business`, `unknown`

### Supported lifecycle stages

`anonymous`, `attendee`, `creator`, `paid_member`

## Why SQLite

- Zero infrastructure for local development
- Single-file database, no setup needed
- Good enough for POC-scale traffic
- Easy to inspect data with any SQLite client
- The schema is designed to be portable to PostgreSQL later

## Running Locally

```bash
npm install
npm run dev
```

The SQLite database file (`data.sqlite`) is created automatically in the project root.

**Test with curl:**

```bash
# Capture a visitor signal
curl -X POST http://localhost:3000/v1/visitors/capture \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "req_test_001",
    "page": {
      "path": "/",
      "pageType": "homepage",
      "referrer": "https://www.google.com/",
      "query": {
        "utm_campaign": "schools_fall_signup_drive",
        "utm_term": "school signup sheet"
      }
    },
    "signals": {
      "signup_category": "Education & Schools"
    }
  }'

# Get personalization decision (use the sg_vid cookie from the capture response)
curl -X POST http://localhost:3000/v1/personalization/decide \
  -H "Content-Type: application/json" \
  -H "Cookie: sg_vid=vis_REPLACE_WITH_ACTUAL_ID" \
  -d '{"pageType": "homepage"}'
```

## Data Model

| Table | Purpose |
|-------|---------|
| `visitors` | Current canonical state for each visitor |
| `visitor_segment_weights` | Per-segment weight scores for each visitor |
| `visitor_signal_logs` | Append-only log of raw captured signals (idempotent via `request_id`). Custom signals stored in `signals_json` column. |
| `personalization_decisions` | Historical audit trail of decisions served |

## Explainability / Auditing

The `personalization_decisions` table records every decision: what visitor state was inferred, what template was served, and whether a fallback was used. Combined with `visitor_signal_logs`, this provides a basic audit trail.

**Current limitation:** Conversion measurement is limited because we are not yet storing explicit downstream product events such as `signup_started` or `paid_upgrade`. For now, lifecycle changes can only be inferred from later captures/decisions over time. A full event tracking system is intentionally deferred for the POC.

## Fallback Behavior

This service is designed to sit in the critical path of page load:

- If personalization fails for any reason, a **default non-personalized experience** is returned.
- `metadata.fallbackUsed` is set to `true` in fallback responses.
- If no visitor cookie exists on `/decide`, the default experience is returned.
- If no template rule matches, the default experience is returned.
- The service never crashes or returns internal errors to the client from the decide endpoint.
- `timeoutMs` is configurable in `personalization.json` (default: 1000ms).

## Bot Detection

A lightweight bot filter checks User-Agent substrings (googlebot, bingbot, etc.). Detected bots:
- Are not stored in the visitors table
- Receive an `{ "ignored": true }` response from capture
- Receive a default fallback from decide

## Assumptions

- The frontend is a large Angular application with segment-aware components that can render conditionally based on the `primarySegment` and `experience` payload returned by this engine. The backend does not render HTML — it provides structured data that drives frontend component selection.
- Visitor identity is cookie-based. Cross-device persistence (e.g. a visitor switching from phone to laptop) is **not** handled in this POC. A logged-in user on a new device would start as a fresh anonymous visitor until `signupgeniusUserId` links them. This is acceptable for a POC but would need a server-side identity resolution layer in production.
- The frontend calls `/capture` on every page load (with a unique `requestId`) and `/decide` when it needs personalized content. These are separate calls because capture may happen on pages that don't need personalization, and decide may be called without new signals.
- `lifecycleStageHint` is provided by the frontend based on its own knowledge of the user (e.g. detecting an existing auth cookie). The backend trusts this hint — it does not independently verify lifecycle stage.
- One segment dominates at a time (`primarySegment`). The system does not blend content from multiple segments.
- Rules are maintained by engineers editing `personalization.json` — there is no non-technical audience for rule management in the POC.
- Bot traffic (crawlers, scrapers) should not pollute visitor data or waste personalization resources.

## Trade-offs

| Decision | Why | Downside |
|----------|-----|----------|
| **SQLite over PostgreSQL** | Zero infrastructure, single-file DB, instant local setup. Schema is portable to Postgres later. | Not suitable for concurrent production traffic. No connection pooling. |
| **Synchronous better-sqlite3** | Simpler code, no async/await noise in the data layer. Fast enough for POC. | Blocks the event loop on queries. Would need to switch to async driver at scale. |
| **Cookie-only identity** | Simple, works across sessions on the same browser with no infrastructure. | No cross-device persistence. Cookie can be cleared by user. |
| **Config-driven JSON rules** | No redeploy needed to change rules. Easy to read and version in git. | No admin UI. Manual editing is error-prone. No validation beyond startup. |
| **Deterministic rule matching (not A/B)** | Simpler to reason about and debug. Every visitor with the same state gets the same experience. | Can't measure whether one variant converts better than another. |
| **Separate capture and decide endpoints** | Decouples signal collection from personalization. Capture can happen on pages that don't render personalized content. | Two network requests instead of one on pages that need both. |
| **Weight decay formula** | Lets visitor segments evolve over time as new signals arrive, without losing history entirely. | Tuning `weightMergeFactor` requires experimentation. No built-in way to A/B test different values. |
| **Append-only signal logs** | Full audit trail, idempotency via `requestId`, no data loss. | Table grows unbounded. Would need TTL/archival in production. |

## What's Not Built

- **A/B testing / experimentation** — template selection is deterministic. There's no way to split traffic between variants and measure conversion differences.
- **Downstream event tracking** — we can't measure `signup_started` → `paid_upgrade` conversion because we don't ingest product events. Lifecycle changes can only be inferred from later captures.
- **Admin UI** — rules are edited directly in `personalization.json`. No web interface for non-engineers.
- **Cross-device identity resolution** — a visitor on their phone and laptop would appear as two separate visitors until account linking via `signupgeniusUserId`.
- **Caching** — every request hits SQLite directly. No Redis, no in-memory cache.
- **Multi-page-type content** — only homepage template rules and content exist in the config. The architecture supports other page types, but no rules are defined for them.
- **subSegment** — exists as a placeholder in models and responses but is not used in any rules.
- **Authentication / authorization** — endpoints are open. This is an anonymous-visitor service with no user-facing auth layer.

## What's Next

If this POC were to move toward production, the priorities would be:

1. **Add page-type coverage** — extend `personalization.json` with template rules and content for sign-ups, pricing, and templates pages. The architecture already supports this; only config changes are needed.
2. **Event pipeline** — ingest downstream product events (`signup_started`, `first_signup_created`, `paid_upgrade`) to close the measurement loop and enable conversion tracking.
3. **PostgreSQL migration** — swap SQLite for RDS PostgreSQL with connection pooling. The schema is designed to port directly.
4. **Redis caching** — cache visitor state and recent decisions to reduce database load and improve latency on the decide path.
5. **A/B testing framework** — add variant assignment logic so template rules can split traffic and measure relative conversion impact.
6. **Admin UI** — build a web interface for managing segment rules, template content, and weight tuning without code changes.
7. **Structured observability** — replace console logging with structured logs, add request-level metrics, and integrate distributed tracing.
8. **Cross-device identity** — resolve anonymous visitors to a unified profile when they log in on a new device, merging signal history and segment weights.
9. **Signal log archival** — add TTL or cold-storage archival for `visitor_signal_logs` to prevent unbounded table growth.

## Project Structure

```
src/
  server.ts              # Entry point — starts Express server
  app.ts                 # Express app setup, middleware, route mounting
  config/
    personalization.json # Rules, templates, content, weights config
    env.ts               # Environment variables
  db/
    sqlite.ts            # Database connection
    migrations.ts        # Schema creation
  routes/
    visitorRoutes.ts     # /v1/visitors/* route definitions
    personalizationRoutes.ts  # /v1/personalization/* route definitions
  controllers/
    visitorController.ts          # Capture endpoint handler
    personalizationController.ts  # Decide endpoint handler
  services/
    visitorService.ts          # Visitor creation, signal processing, weight merging
    personalizationService.ts  # Decision logic, template resolution
    ruleEngineService.ts       # Segment rule evaluation, template matching
  repositories/
    visitorRepository.ts    # Visitor + segment weight DB operations
    signalLogRepository.ts  # Signal log DB operations
    decisionRepository.ts   # Decision audit trail DB operations
  models/
    entities.ts  # DB entity types, lifecycle stages, segments
    api.ts      # Request/response types
    rules.ts    # Rule config types
  utils/
    id.ts            # ID generation
    cookies.ts       # Cookie read/write helpers
    botDetection.ts  # User-agent bot filtering
    validation.ts    # Input validation
    logger.ts        # Console logger wrapper
```

## License

ISC
