# Visitor Personalization Genius

A lightweight POC backend service that personalizes what anonymous visitors see when they arrive on a site — without requiring login. Inspired by SignUpGenius.

**Leadership goal:** Improve conversion of new users into users who create and launch a signup.

## What It Does

1. **Captures visitor signals** at arrival time (UTM params, referrer, page path, etc.)
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
    "sports": 0,
    "business": 0,
    "unknown": 0
  }
}
```

Also sets cookie `sg_vid=<visitorId>`.

**Notes:**
- `requestId` is required. Must be unique per page-load event (used for idempotency).
- `page.pageType` is required. All other fields are optional.
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

## How Rules Work

The personalization engine uses a **2-step process**:

### Step 1: Derive visitor state

Signal fields (utm_campaign, path, referrer, etc.) are matched against **segment rules** defined in `src/config/personalization.json`. Each matching rule contributes a weight to a segment.

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
| `visitor_signal_logs` | Append-only log of raw captured signals (idempotent via `request_id`) |
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

## Current Limitations

- **Homepage only** — other page types can be added by extending the config
- **No authentication** — this is an anonymous-visitor service
- **No real-time experimentation** — template selection is deterministic, not A/B tested
- **No downstream event tracking** — we can't measure `signup_started` → `paid_upgrade` conversion yet
- **No admin UI** — rules are edited in `personalization.json`
- **SQLite** — not suitable for high-concurrency production traffic
- **No caching** — every request hits SQLite directly
- **subSegment** — exists as a placeholder in models/responses but is not used in rules yet

## Production Evolution Path

| Area | POC | Production |
|------|-----|------------|
| **Database** | SQLite (local file) | RDS PostgreSQL |
| **Hosting** | Local Node.js | ECS/Fargate or Elastic Beanstalk |
| **Caching** | None | Redis for visitor state + decisions |
| **Config** | JSON file | Admin UI or config service |
| **Rules** | Static JSON | Dynamic rule management |
| **Events** | `personalization_decisions` only | Full event pipeline (signup_started, paid_upgrade, etc.) |
| **API** | Separate capture + decide | Possible combined bootstrap endpoint for performance |
| **Observability** | Console logging | Structured logging, metrics, tracing |
| **Experimentation** | Deterministic rules | A/B testing framework integration |

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
    visitor.ts  # DB entity types, lifecycle stages, segments
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
