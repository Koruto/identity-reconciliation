# Identity Reconciliation Service

A small web service that identifies and links customer identities across orders using **email** and/or **phoneNumber**.

- **Server:** Node.js + TypeScript + Express + Prisma (SQLite by default).
- **Client:** Static HTML/JS/CSS to call the API (health, identify, list contacts).

---

## Project structure

```
identity-reconciliation/
├── server/                 # API and DB
│   ├── prisma/
│   │   ├── schema.prisma   # Contact model
│   │   └── migrations/
│   ├── src/
│   │   ├── config/         # Env validation
│   │   ├── controllers/
│   │   ├── middleware/     # Validation, error handler, async wrapper
│   │   ├── models/         # Types and API DTOs
│   │   ├── repositories/   # Contact DB access
│   │   ├── routes/
│   │   ├── services/       # Identify business logic
│   │   ├── utils/          # Normalize email/phone
│   │   ├── db/             # Prisma client init
│   │   ├── app.ts
│   │   └── index.ts
│   ├── .env.example
│   └── package.json
├── client/                  # Simple API client UI
│   ├── index.html
│   ├── style.css
│   └── app.js
├── Plan.md                  # Implementation plan (phases 1–8)
├── Task.md                  # Original Bitespeed task spec
└── README.md
```

---

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm**

---

## Setup

### 1. Server

```bash
cd server
cp .env.example .env
# Edit .env if needed (default: PORT=3000, SQLite at prisma/dev.db)
npm install
npx prisma migrate dev
```

### 2. Client

No install. Open `client/index.html` in a browser (or use a static server). The client calls `http://localhost:3000` by default.

---

## Running

**Development (server with watch):**

```bash
cd server
npm run dev
```

**Production build and run:**

```bash
cd server
npm run build
npm start
```

Then open `client/index.html` and use the buttons to call the API.

---

## API

Base URL: `http://localhost:3000` (configurable via client `API_BASE` and server `PORT`).

| Method | Path        | Description                                              |
| ------ | ----------- | -------------------------------------------------------- |
| GET    | `/health`   | Health check. Returns `{ "status": "ok" }`.              |
| POST   | `/identify` | Identify or create/link a contact by email and/or phone. |
| GET    | `/contacts` | List all current (non-deleted) contacts (for debugging). |

### POST /identify

**Request body:**

```json
{
  "email": "user@example.com",
  "phoneNumber": "123456"
}
```

- At least one of `email` or `phoneNumber` is required.
- `phoneNumber` can be string or number; stored as normalized string.
- Empty or invalid body → **400** with `{ "error": "..." }`.

**Response (200):**

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["primary@example.com", "other@example.com"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

- **primaryContactId:** ID of the primary contact (oldest in the link chain).
- **emails / phoneNumbers:** Primary first, then rest (unique, by creation order).
- **secondaryContactIds:** All contact IDs that are secondary to the primary.

**Behaviour:**

- No existing contact → create one **primary** contact; return it with empty `secondaryContactIds`.
- Existing contact(s) in the same chain + new email/phone → create a **secondary** linked to the primary; return consolidated view.
- Request links two (or more) separate primaries → **merge**: oldest stays primary, others become secondary; all re-linked in one transaction; return consolidated view.

---

## Environment (server)

| Variable       | Required | Default       | Description                                                |
| -------------- | -------- | ------------- | ---------------------------------------------------------- |
| `PORT`         | No       | `3000`        | Server port.                                               |
| `DATABASE_URL` | Yes      | —             | SQLite: `file:./prisma/dev.db`. PostgreSQL also supported. |
| `NODE_ENV`     | No       | `development` | Affects logging.                                           |
