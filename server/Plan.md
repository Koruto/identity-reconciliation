# Identity Reconciliation Service — Implementation Plan

This document outlines a step-by-step, professional approach to implementing the **Identify** web service from `Task.md`. We use a layered Node.js structure, clear models, and explicit handling of edge cases.

---

## 1. Task Summary

- **Goal:** Identify and link customer identities across orders using `email` and/or `phoneNumber`.
- **Endpoint:** `POST /identify` with body `{ email?: string, phoneNumber?: number }`.
- **Response:** Consolidated contact: `primaryContactId`, `emails` (primary first), `phoneNumbers` (primary first), `secondaryContactIds`.
- **Storage:** Relational `Contact` table with linking via `linkedId` and `linkPrecedence` (primary vs secondary). Oldest contact in a link chain is primary; the rest are secondary.

---

## 2. Project Structure (Node.js Best Practices)

Use a **layered architecture** so HTTP, business logic, and data access are separated and testable.

```
server/
├── src/
│   ├── index.ts                 # App entry: create app, DB, start server
│   ├── app.ts                   # Express app (middleware, routes only)
│   ├── config/
│   │   └── env.ts               # Env validation (port, DB URL)
│   ├── routes/
│   │   └── identify.routes.ts   # POST /identify → controller
│   ├── controllers/
│   │   └── identify.controller.ts  # Parse body, call service, format response
│   ├── services/
│   │   └── identify.service.ts  # All identify/linking business logic
│   ├── repositories/
│   │   └── contact.repository.ts   # DB access for Contact only
│   ├── models/
│   │   ├── contact.model.ts     # Contact type/interface + DB mapping
│   │   └── api.types.ts         # Request/response DTOs
│   ├── db/
│   │   ├── client.ts            # DB connection (e.g. Prisma / pg pool)
│   │   └── migrations/          # Schema migrations (if not using ORM migrations)
│   └── middleware/
│       ├── errorHandler.ts      # Central error → HTTP response
│       └── validateIdentifyBody.ts  # Request validation
├── tests/
│   ├── identify.service.test.ts
│   └── identify.integration.test.ts
├── package.json
├── tsconfig.json
└── .env.example
```

**Principles:**

- **Routes:** Only wire HTTP to controllers; no business logic.
- **Controllers:** Validate input, call service, map result to API shape (`primaryContactId`, `emails`, `phoneNumbers`, `secondaryContactIds`).
- **Services:** All linking rules (create primary, create secondary, merge two primaries).
- **Repositories:** CRUD and queries for `Contact`; no business rules.
- **Models:** Shared types and (if needed) mapping to/from DB rows.

---

## 3. Data Layer

### 3.1 Database Choice

- **Recommended:** **PostgreSQL** (or **SQLite** for a minimal/local setup). Both work with the same schema and migrations.
- Use an **ORM** (e.g. **Prisma**) or **query builder** (e.g. **knex**) for type-safe access and optional migrations. Prisma is a strong default for a professional Node/TS stack.

### 3.2 Contact Schema

Match the spec exactly (including nullable fields and enums):

| Column         | Type        | Nullable | Notes                                     |
| -------------- | ----------- | -------- | ----------------------------------------- |
| id             | SERIAL / PK | No       | Auto-generated                            |
| phoneNumber    | VARCHAR     | Yes      | Normalize format (e.g. string, no spaces) |
| email          | VARCHAR     | Yes      | Lowercase for lookups                     |
| linkedId       | INT (FK→id) | Yes      | References primary contact                |
| linkPrecedence | ENUM        | No       | `'primary' \| 'secondary'`                |
| createdAt      | TIMESTAMP   | No       | Set on insert                             |
| updatedAt      | TIMESTAMP   | No       | Set on insert/update                      |
| deletedAt      | TIMESTAMP   | Yes      | Soft delete                               |

**Constraints:**

- At least one of `email` or `phoneNumber` must be non-null per row (enforce in app and optionally with a DB check).
- Indexes: `email`, `phoneNumber`, `linkedId`, and optionally `(email, phoneNumber)` for lookup performance.

### 3.3 Storing and Querying

- **Create:** Insert one row at a time; use transactions when creating a secondary or when merging two primaries (update one to secondary and set `linkedId`).
- **Read:** Query by `email` and/or `phoneNumber` (respect `deletedAt`). Fetch full link chain when needed (primary + all secondaries by `linkedId` or recursive CTE).
- **Update:** When turning a primary into secondary: set `linkedId`, `linkPrecedence = 'secondary'`, `updatedAt`.
- **Soft delete:** Set `deletedAt`; exclude from all identify logic.

---

## 4. Step-by-Step Implementation Phases

Execute in order; each phase is testable before moving on.

---

### Phase 1: Foundation (No Business Logic)

**Goal:** App runs, env is loaded, DB connects, and one route exists.

1. **Config**
   - Add `config/env.ts`: read `PORT`, `DATABASE_URL` (and optional `NODE_ENV`). Validate and export. Use a small validation lib (e.g. `zod`) or plain checks.
   - Add `.env.example` with `PORT` and `DATABASE_URL`.

2. **DB client**
   - Install Prisma: `npm i prisma @prisma/client`; `npx prisma init`.
   - Define `Contact` in `schema.prisma` (fields as above). Create initial migration.
   - Add `db/client.ts`: export Prisma client singleton (or pg pool if not using Prisma). No business logic.

3. **Models and API types**
   - `models/contact.model.ts`: TypeScript type/interface for Contact (matches DB).
   - `models/api.types.ts`: `IdentifyRequest` (`email?: string`, `phoneNumber?: number`), `IdentifyResponse` (contact object with `primaryContactId`, `emails`, `phoneNumbers`, `secondaryContactIds`).

4. **App shell**
   - Install Express: `npm i express`, `npm i -D @types/express`.
   - `app.ts`: create Express app, `express.json()`, health route (e.g. `GET /health`), mount `/identify` routes (stub), add central error handler middleware.
   - `index.ts`: load config, connect DB (e.g. `prisma.$connect()`), start server on `PORT`. Graceful shutdown on SIGTERM/SIGINT.

5. **Checkpoint**
   - `GET /health` returns 200. `POST /identify` can return a stub 200 with a dummy JSON body. No DB logic yet.

---

### Phase 2: Request Validation and Error Handling

**Goal:** Invalid requests are rejected with clear 4xx responses; server errors return 5xx.

1. **Validation**
   - Rule: at least one of `email` or `phoneNumber` must be present.
   - Rule: if present, `email` must be a non-empty string; `phoneNumber` can be number or string (normalize to string for storage).
   - In `validateIdentifyBody` middleware (or in controller): validate body, return 400 with a clear message if invalid. Attach parsed/normalized payload to `req` for the controller.

2. **Error handler**
   - In `middleware/errorHandler.ts`: catch errors, log them, map to status code (e.g. validation → 400, not found → 404, DB/unknown → 500). Respond with JSON `{ error: string }` or similar. Ensure async route errors are passed to the handler (e.g. via `express-async-errors` or try/catch in a wrapper).

3. **Checkpoint**
   - Send `POST /identify` with `{}`, with invalid types, with only nulls; expect 400. Valid body reaches controller (still stub response).

---

### Phase 3: Contact Repository

**Goal:** All Contact persistence in one place; no business logic.

1. **Contact repository**
   - `findByEmail(email: string): Promise<Contact[]>` — by normalized email, exclude soft-deleted.
   - `findByPhoneNumber(phone: string): Promise<Contact[]>` — by normalized phone, exclude soft-deleted.
   - `findById(id: number): Promise<Contact | null>`.
   - `findSecondaryByLinkedId(primaryId: number): Promise<Contact[]>` (all secondaries for a primary).
   - `create(data: CreateContactDto): Promise<Contact>`.
   - `updateLinkPrecedence(id: number, linkedId: number): Promise<Contact>` (set secondary and linkedId).

2. **Normalization**
   - Email: trim, toLowerCase.
   - Phone: normalize to string (e.g. remove spaces, leading zeros policy). Decide one format and use it everywhere (repository and service).

3. **Checkpoint**
   - Unit or integration tests: create primary, create secondary, fetch by email/phone, fetch secondaries. No HTTP yet.

---

### Phase 4: Identify Service — Happy Paths

**Goal:** Core business logic in one place: no existing contact → create primary; existing contact + new info → create secondary.

1. **Service interface**
   - `identifyService.identify(email?: string, phoneNumber?: number): Promise<IdentifyResponse>`.
   - Inside: normalize email/phone, then branch by what exists in DB.

2. **Case A: No contact found**
   - Create one Contact: `linkPrecedence: 'primary'`, `linkedId: null`, provided email/phone. Return that contact as primary, `emails`/`phoneNumbers` from that row only, `secondaryContactIds: []`.

3. **Case B: One or more contacts found, same link chain**
   - Determine primary (the one with `linkPrecedence === 'primary'` in the set; there should be exactly one). Collect all contacts in the chain (primary + secondaries by `linkedId`).
   - If incoming email/phone is **new** (not already present in the chain): create a **secondary** contact with that new email/phone, `linkedId = primary.id`, `linkPrecedence = 'secondary'`. Re-fetch chain.
   - Build response: primary’s email first, then rest (unique); primary’s phone first, then rest (unique); `secondaryContactIds` = all non-primary IDs in the chain.

4. **Order of emails/phoneNumbers**
   - Task: “first element being email/phoneNumber of primary contact”. So: primary first, then secondaries (e.g. by `createdAt` or id), deduplicated.

5. **Checkpoint**
   - Tests: (1) no contacts → one primary, empty secondaries. (2) one primary, request with new email same phone → one secondary, response contains both emails, one phone, one secondary id.

---

### Phase 5: Identify Service — Merging Two Primaries

**Goal:** When the request links two previously separate primaries (e.g. same person, two emails), make the older primary stay primary and the newer one become secondary.

1. **Detection**
   - After finding contacts by email and/or phone: if there are contacts from **two different** link chains (two different primaries), treat as “merge” case.

2. **Merge rule**
   - Primary = the one with **earlier** `createdAt`. The other primary becomes secondary: set `linkedId` to the chosen primary’s id, `linkPrecedence = 'secondary'`, `updatedAt = now`. Use a **transaction** so the update is atomic.

3. **Response**
   - Same as before: primary’s email/phone first, then all from the merged chain (including the demoted primary), deduplicated; `secondaryContactIds` = all non-primary IDs in the merged chain.

4. **Checkpoint**
   - Test: two primaries (different email/phone). One request with both identifiers. After request, one primary, one secondary; response matches task example (e.g. primaryContactId 11, secondaryContactIds [27]).

---

### Phase 6: Controller and Route

**Goal:** Wire HTTP to service and return the exact response shape.

1. **Controller**
   - In `identify.controller.ts`: read validated body (email, phoneNumber). Call `identifyService.identify(email, phoneNumber)`. Map to response JSON: `contact.primaryContactId`, `contact.emails`, `contact.phoneNumbers`, `contact.secondaryContactIds`.

2. **Route**
   - `POST /identify` → validate body middleware → controller. Return 200 and JSON only on success; errors handled by error middleware.

3. **Checkpoint**
   - Manual or automated HTTP tests: all examples from Task.md (including the “all of the following requests will return the above response” cases).

---

### Phase 7: Edge Cases and Hardening

**Goal:** Be explicit about edge cases so behavior is consistent and robust.

1. **List and implement edge cases** (see Section 5 below).
2. **Logging**
   - Log each identify request (e.g. normalized email/phone, result primary id). Do not log full PII in production if policy forbids; consider redaction.
3. **Idempotency**
   - Same request twice: second time no new row; response identical. (Already implied by “find then create if new”; ensure no duplicate secondaries for same email/phone in same chain.)
4. **Checkpoint**
   - Run through edge-case tests and confirm no regressions.

---

### Phase 8: Testing and Documentation

**Goal:** Regression safety and a clear contract.

1. **Unit tests**
   - Identify service: no contact; one primary + new info; two primaries merge. Mock repository.
2. **Integration tests**
   - With real DB (e.g. test DB or SQLite in memory): full flow for the main scenarios and at least one merge and one “already linked” case.
3. **API docs**
   - Document `POST /identify` (body, response, 400/500). Optional: OpenAPI/Swagger or a simple README with examples.

---

## 5. Edge Cases and Handling

| #   | Edge case                                      | Handling                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Both email and phoneNumber missing or null** | Validation: reject with 400; at least one required.                                                                                                                                                                                                                       |
| 2   | **Empty string email or phone**                | Treat as absent (normalize to undefined) or reject; decide and document. Prefer reject for empty string.                                                                                                                                                                  |
| 3   | **phoneNumber as string vs number**            | Accept both in API; normalize to string before storage and lookups.                                                                                                                                                                                                       |
| 4   | **Duplicate secondary**                        | Before creating secondary, check if chain already has a contact with same email (or same phone). If yes, do not create another; just return consolidated view.                                                                                                            |
| 5   | **Same request twice (idempotency)**           | Second request finds same chain, no new data; no new row; same response.                                                                                                                                                                                                  |
| 6   | **Two primaries merge**                        | Use transaction: update newer primary to secondary; then return merged view.                                                                                                                                                                                              |
| 7   | **More than two primaries in one request**     | Possible if same email/phone appears in multiple chains (e.g. data issue). Define rule: e.g. merge all to the single oldest primary (by createdAt), others become secondary; or fail. Prefer “oldest wins” and merge in a transaction.                                    |
| 8   | **Soft-deleted contacts**                      | Exclude from all lookups and from response. Do not link new secondaries to deleted rows.                                                                                                                                                                                  |
| 9   | **Email/phone normalization**                  | Same email with different casing or spacing must match. Use consistent normalize (lowercase, trim). Phone: one canonical form (e.g. digits only or E.164) everywhere.                                                                                                     |
| 10  | **Response order**                             | Primary’s email and phone first; then secondaries (e.g. by createdAt). Deduplicate emails and phones across the chain.                                                                                                                                                    |
| 11  | **DB failure / timeout**                       | Let error bubble to error handler; return 500. Use timeouts on DB calls if supported.                                                                                                                                                                                     |
| 12  | **Concurrent requests**                        | Two requests at once that would create the same secondary or merge the same two primaries. Use DB transaction and unique constraint (e.g. one secondary per (email, linkedId) or similar) to avoid duplicates; handle unique violation and retry or return current state. |

---

## 6. Response Shape and Typo

The task specifies:

```ts
"primaryContactId": number
```

---

## 7. Dependencies (Summary)

- **Runtime:** `express`, `@prisma/client` (or `pg` if not using Prisma), optional `zod` for validation.
- **Dev:** `typescript`, `@types/node`, `@types/express`, `tsx`, `prisma`, and test runner (e.g. `vitest` or `jest`).

---

## 8. Execution Order Recap

1. Phase 1 — Foundation (app, config, DB, stub route).
2. Phase 2 — Validation and error handling.
3. Phase 3 — Contact repository and normalization.
4. Phase 4 — Identify service (no contact + new secondary).
5. Phase 5 — Identify service (merge two primaries).
6. Phase 6 — Controller and route (exact response shape).
7. Phase 7 — Edge cases and hardening.
8. Phase 8 — Tests and docs.

Each phase ends with a checkpoint so you can integrate step by step and avoid one-shot complexity. After Phase 8, the service is ready for review and deployment.
