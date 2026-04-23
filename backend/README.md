<div align="center">

# 📋 SmartFormFlow — Backend

**A production-ready event-driven form management system**  
Built with Node.js · TypeScript · Express · Prisma · PostgreSQL (Neon) · Redis · BullMQ

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.x-FF6B6B)](https://docs.bullmq.io/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Data Models](#-data-models)
- [API Reference](#-api-reference)
- [Event-Driven System](#-event-driven-system)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Running with Docker](#-running-with-docker)
- [Database Setup](#-database-setup)
- [Scripts](#-scripts)
- [Security](#-security)

---

## 🚀 Overview

SmartFormFlow is a backend system for creating, publishing, and managing dynamic event-based registration forms — with built-in support for multi-step forms, file uploads, payment collection (Razorpay), certificate generation, WhatsApp messaging, and real-time analytics.

**Core capabilities:**

- **Dynamic Form Builder** — Single-step and multi-step forms with typed fields (TEXT, EMAIL, FILE, SELECT, CHECKBOX, etc.), validation rules, and draft auto-save
- **Event Lifecycle Management** — DRAFT → PUBLISHED → CLOSED with form-gated publishing
- **Visitor Tracking** — Anonymous visitor sessions with UUID-based tracking across the full submission funnel
- **Payment Integration** — Razorpay order creation and webhook-confirmed payment flows
- **Certificate Generation** — Async PDF certificate generation with QR verification, powered by BullMQ workers
- **Messaging** — Templated WhatsApp (AiSensy) and Email (SMTP) message dispatch via queues
- **Analytics** — Real-time funnel metrics (visits → started → submitted) aggregated in Redis and persisted to PostgreSQL daily
- **File Storage** — Local filesystem or AWS S3 (configurable via `FILE_STORAGE_DRIVER`)
- **Queue Dashboard** — Bull Board UI at `/admin/queues` (auth-protected)
- **Health Check** — `/health` endpoint with DB + Redis liveness probes

---

## 🏛 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        HTTP Layer                             │
│   Express 5  ·  Helmet  ·  CORS  ·  Morgan  ·  Rate Limit   │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                     API Routes  /api/*                        │
│  Auth · Events · Forms · Submissions · Files · Payments       │
│  Certificates · Messages · Analytics                          │
└──────┬────────────────────┬────────────────────┬─────────────┘
       │                    │                    │
┌──────▼───────┐   ┌────────▼──────┐   ┌────────▼───────────┐
│  Controllers  │   │   Services    │   │   Middlewares       │
│  (thin layer) │   │ (business     │   │  Auth · Error ·     │
│               │   │  logic)       │   │  Validation · Rate  │
└──────┬───────┘   └────────┬──────┘   └────────────────────┘
       │                    │
┌──────▼────────────────────▼──────────────────────────────────┐
│                    Data Layer                                  │
│   Repositories (Prisma ORM) ·  Mappers  ·  DTOs              │
└──────┬────────────────────┬──────────────────────────────────┘
       │                    │
┌──────▼──────┐    ┌────────▼──────────────────────────────────┐
│  PostgreSQL  │    │   Redis                                    │
│  (Neon)      │    │   Analytics cache · BullMQ queues         │
└─────────────┘    └───────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                  Worker Process (separate)                     │
│   Certificate Worker  ·  Message Worker                       │
│   Analytics Worker    ·  Daily Analytics Worker               │
└──────────────────────────────────────────────────────────────┘
```

**Key design decisions:**

- **Separation of concerns** — Controllers only parse requests and delegate; all logic lives in Services
- **Repository pattern** — All DB access isolated in `/repositories`, making services testable
- **Event-driven workers** — Heavy tasks (PDF generation, messaging) are offloaded to BullMQ workers running in a separate process (`worker.ts`), keeping the API non-blocking
- **Graceful shutdown** — SIGTERM/SIGINT drain in-flight HTTP requests and cleanly disconnect Prisma + Redis before exiting
- **Razorpay webhook safety** — Raw body is captured before `express.json()` to preserve HMAC signature integrity

---

## 🛠 Tech Stack

| Category | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript 5.x (strict mode) |
| Framework | Express 5.x |
| ORM | Prisma 7 with Neon (serverless PostgreSQL) |
| Database | PostgreSQL via [Neon](https://neon.tech/) |
| Cache / Queue | Redis 7 + BullMQ 5 |
| Auth | JWT (jsonwebtoken) + bcrypt |
| File Upload | Multer + Local FS / AWS S3 |
| PDF Generation | PDFKit |
| QR Codes | qrcode |
| Payments | Razorpay |
| Messaging | AiSensy (WhatsApp) + Nodemailer (SMTP) |
| Validation | Zod |
| Logging | Winston + Morgan + Daily Rotate |
| Security | Helmet, express-rate-limit, rate-limit-redis |
| Scheduling | node-cron |
| Queue UI | Bull Board |
| Container | Docker + docker-compose |

---

## 📁 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Full data model (16 models, 8 enums)
│   └── migrations/            # Prisma migration history
│
├── src/
│   ├── app.ts                 # Express app setup (middleware, routes, error handling)
│   ├── server.ts              # Bootstrap, graceful shutdown
│   ├── worker.ts              # Worker process entry point
│   ├── container.ts           # Dependency injection — wires services, repos, controllers
│   │
│   ├── config/
│   │   ├── db.ts              # Prisma + Neon connection
│   │   ├── redis.ts           # ioredis connection with retry
│   │   ├── logger.ts          # Winston logger + Morgan stream
│   │   └── bull-board.ts      # Queue monitoring UI setup
│   │
│   ├── routes/
│   │   ├── index.ts           # Root router — mounts all sub-routers under /api
│   │   ├── auth.routes.ts
│   │   ├── event.routes.ts
│   │   ├── form.routes.ts
│   │   ├── submission.routes.ts
│   │   ├── file.routes.ts
│   │   ├── payment.routes.ts
│   │   ├── certificate.routes.ts
│   │   ├── message.routes.ts
│   │   └── analytics.routes.ts
│   │
│   ├── controllers/           # Request handlers (parse → delegate → respond)
│   ├── services/              # Business logic layer
│   ├── repositories/          # Prisma DB access layer
│   ├── dtos/                  # Data Transfer Objects (request/response shapes)
│   ├── mappers/               # Entity ↔ DTO transformations
│   ├── validators/            # Zod schemas for request validation
│   ├── middlewares/
│   │   ├── auth.middleware.ts # JWT verification
│   │   └── error.middleware.ts# Global error handler
│   ├── interfaces/            # TypeScript interfaces / contracts
│   ├── providers/             # External integrations (S3, Razorpay, AiSensy, SMTP)
│   ├── queues/
│   │   ├── certificate.queue.ts
│   │   └── message.queue.ts
│   ├── workers/
│   │   ├── index.ts           # Starts all workers
│   │   ├── certificate.worker.ts
│   │   ├── certificate.worker.service.ts
│   │   ├── message.worker.ts
│   │   ├── message.worker.service.ts
│   │   ├── analytics.worker.ts
│   │   └── dailyAnalytics.worker.ts
│   ├── types/                 # Global TypeScript type augmentations
│   ├── utils/                 # Helpers (slug, crypto, date, etc.)
│   ├── assets/                # Static assets (certificate templates, fonts)
│   └── templates/             # HTML/text email templates
│
├── storage/                   # Local file storage (gitignored in production)
├── dist/                      # Compiled output (tsc)
├── package.json
├── tsconfig.json
├── prisma.config.ts
├── docker-compose.yml
└── .env                       # ← never commit this
```

---

## 🗄 Data Models

The schema defines **16 models** across these domains:

```
Users & Auth         → User
Events               → Event, PaymentConfig
Forms                → Form, FormStep, FormField
Visitor Tracking     → Visitor, VisitSession
Contacts             → Contact, ContactEvent, ContactTag, Tag
Submissions          → FormSubmission, SubmissionAnswer
Payments             → Payment
Certificates         → Certificate
Messaging            → MessageLog
Files                → FileAsset
Analytics            → EventAnalytics, EventAnalyticsDaily
```

**Entity Relationship Summary:**

```
User
 └── Event (1:many)
      ├── Form (1:1)
      │    ├── FormStep (1:many)  ← used when isMultiStep = true
      │    └── FormField (1:many) ← either top-level or scoped to a step
      ├── FormSubmission (1:many)
      │    ├── SubmissionAnswer (1:many)
      │    ├── Payment (1:1, optional)
      │    └── Certificate (1:1, optional)
      ├── FileAsset (1:many)
      ├── MessageLog (1:many)
      └── EventAnalytics (1:1)

Contact ──────────────────────── linked to submissions, payments, certificates
Visitor ──────────────────────── linked to sessions + submissions (anonymous tracking)
```

---

## 📡 API Reference

> **Base URL:** `http://localhost:3000/api`  
> **Auth:** `Authorization: Bearer <JWT>` for all 🔒 protected routes

### 🔐 Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/signup` | 🌐 | Register a new user |
| `POST` | `/auth/login` | 🌐 | Login, returns `accessToken` |
| `GET` | `/auth/me` | 🔒 | Get authenticated user profile |
| `POST` | `/auth/logout` | 🔒 | Invalidate session |

### 📅 Events

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/events` | 🔒 | Create event (with optional payment config) |
| `GET` | `/events/` | 🔒 | Get all events for logged-in user |
| `GET` | `/events/:id` | 🔒 | Get event by UUID |
| `GET` | `/events/slug/:slug` | 🌐 | Get event by public slug |
| `PUT` | `/events/:id` | 🔒 | Update event fields |
| `PUT` | `/events/:id/publish` | 🔒 | Publish event (requires published form) |
| `PUT` | `/events/:id/close` | 🔒 | Close event |

### 📝 Forms

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/forms/event/:eventId` | 🔒 | Create form (single or multi-step) |
| `GET` | `/forms/event/:eventId` | 🔒 | Get form by event ID |
| `GET` | `/forms/:formId` | 🔒 | Get form by form UUID |
| `GET` | `/forms/:slug` | 🔒 | Get form by event slug (admin) |
| `PUT` | `/form/event/:eventId` | 🔒 | Update / upsert form |
| `POST` | `/forms/:formId/publish` | 🔒 | Publish form (locks editing) |
| `DELETE` | `/forms/:formId` | 🔒 | Soft delete form |

**Form field types:** `TEXT` · `EMAIL` · `NUMBER` · `DATE` · `TEXTAREA` · `RANGE` · `CHECKBOX` · `RADIO` · `FILE` · `SELECT`

### 📥 Submissions (Public Visitor Flow)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/forms/:eventSlug` | 🌐 | Load published form + event metadata |
| `POST` | `/forms/:eventSlug/visit` | 🌐 | Record visitor page view |
| `POST` | `/forms/:eventSlug/start` | 🌐 | Start a submission session |
| `POST` | `/forms/:eventSlug/draft` | 🌐 | Save draft answers |
| `GET` | `/forms/:eventSlug/draft?visitorUuid=` | 🌐 | Restore draft answers |
| `POST` | `/forms/:eventSlug/submit` | 🌐 | Final form submission |
| `GET` | `/forms/admin/submissions/:id` | 🔒 | Get submission by ID (admin) |
| `GET` | `/forms/admin/events/:eventId/submissions` | 🔒 | Get all submissions for event |

**Visitor UUID flow:** Client generates a UUID on first load (`uuidv4()`), stores it in `sessionStorage`, and sends it in every submission request as `visitor.uuid`.

### 📁 Files

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/files/upload` | 🌐 | Upload file (`multipart/form-data`) |
| `GET` | `/files/:fileId` | 🔒 | Get file metadata by UUID |
| `GET` | `/files/contact/:contactId` | 🔒 | Get all files for a contact |
| `GET` | `/files/event/:eventId` | 🔒 | Get all files for an event |
| `DELETE` | `/files/:fileId` | 🔒 | Delete file |

**Upload context values:** `FORM_SUBMISSION` · `USER_AVATAR`

### 💳 Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/payments/order` | 🌐 | Create Razorpay order |
| `POST` | `/payments/verify` | 🌐 | Verify payment signature |
| `POST` | `/payments/retry` | 🌐 | Retry failed payment |
| `GET` | `/payments/:paymentId` | 🌐 | Get payment status by ID |
| `POST` | `/payments/webhook` | 🌐 | Razorpay webhook (raw body) |
| `GET` | `/payments/events/:eventId` | 🔒 | Get payments for an event |
| `GET` | `/payments/` | 🔒 | Get all payments (admin) |
| `POST` | `/payments/:paymentId/cancel` | 🔒 | Cancel a payment |

### 🏅 Certificates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/certificates/generate` | 🔒 | Queue certificate generation for submissions |
| `GET` | `/certificates/verify?certificateId=` | 🌐 | Verify certificate authenticity |

**Template types:** `ACHIEVEMENT` · `APPOINTMENT` · `COMPLETION` · `INTERNSHIP` · `WORKSHOP`

### 💬 Messages

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/messages/send` | 🔒 | Send WhatsApp / Email message from template |
| `GET` | `/messages/` | 🔒 | Get all message logs |

**Message types:** `EMAIL` · `WHATSAPP` · `SMS`

### 📊 Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/analytics/events/:eventId` | 🔒 | Get funnel analytics for an event |

### 🩺 System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | 🌐 | DB + Redis liveness check |
| `GET` | `/admin/queues` | 🔒 | Bull Board queue dashboard |

---

## ⚙️ Event-Driven System

SmartFormFlow runs a **separate worker process** alongside the API server. Workers consume jobs from BullMQ queues backed by Redis.

### Queues

| Queue | Trigger | Worker |
|-------|---------|--------|
| `certificate` | `POST /certificates/generate` | Generates PDF with PDFKit, embeds QR code, uploads to S3 or local storage |
| `message` | `POST /messages/send` | Dispatches WhatsApp (AiSensy API) or Email (Nodemailer SMTP) |
| `analytics` | Every submission/visit event | Updates Redis counters → syncs to PostgreSQL |
| `daily-analytics` | `node-cron` (daily at midnight) | Snapshots Redis counters into `EventAnalyticsDaily` |

### Job Lifecycle

```
API request
    │
    ▼
Queue.add(jobData)          ← non-blocking, returns immediately
    │
    ▼
Redis (BullMQ queue)
    │
    ▼
Worker process picks up job
    │
    ├── Success → marks COMPLETED, updates DB record (status: GENERATED / SENT)
    └── Failure → BullMQ retries with backoff, marks FAILED after max attempts
```

### Running Workers

```bash
# In a separate terminal (or separate process/container)
npm run worker
```

> In Docker, the worker and API server each run as separate containers.

---

## 🏁 Getting Started

### Prerequisites

- **Node.js** 20+
- **npm** 9+
- **PostgreSQL** (or a [Neon](https://neon.tech) serverless DB URL)
- **Redis** 7+ (local or managed)

### 1. Clone the repo

```bash
git clone https://github.com/your-org/smartformflow.git
cd smartformflow/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Fill in all required variables — see Environment Variables below
```

### 4. Set up the database

```bash
# Apply all migrations
npx prisma migrate deploy

# (optional) seed data
# npx prisma db seed

# Open Prisma Studio to inspect data
npx prisma studio
```

### 5. Build TypeScript

```bash
npm run build
```

### 6. Start the API server

```bash
npm start
```

### 7. Start the worker process (separate terminal)

```bash
npm run worker
```

### 8. Verify health

```bash
curl http://localhost:3000/health
# {"status":"OK","db":"OK","cache":"OK","uptime":4.2,...}
```

---

## 🔑 Environment Variables

Create a `.env` file in `backend/`. Never commit it.

```env
# ── App ─────────────────────────────────────────────
PORT=3000
NODE_ENV=development              # development | production
BASE_URL=http://localhost:3000/api
DOMAIN=https://forms.yourdomain.com
ALLOWED_ORIGINS=http://localhost:5173,https://app.yourdomain.com

# ── Database (Neon PostgreSQL) ───────────────────────
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# ── Redis ────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# ── JWT ──────────────────────────────────────────────
JWT_ACCESS_SECRET=your_strong_access_secret_here
JWT_REFRESH_SECRET=your_strong_refresh_secret_here

# ── File Storage ─────────────────────────────────────
FILE_STORAGE_DRIVER=local         # local | s3
LOCAL_PUBLIC_URL=http://localhost:3000/storage

# AWS S3 (required when FILE_STORAGE_DRIVER=s3)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=your-s3-bucket-name
AWS_PUBLIC_URL=https://your-bucket.s3.amazonaws.com

# ── Payments (Razorpay) ──────────────────────────────
RAZORPAY_KEY_ID=rzp_live_xxxx
RAZORPAY_KEY_SECRET=xxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# ── Email (SMTP) ─────────────────────────────────────
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=465
SMTP_USER=support@yourdomain.com
SMTP_PASS=your_smtp_password

# ── WhatsApp (AiSensy) ───────────────────────────────
WHATSAPP_OTP_API_URL=https://backend.aisensy.com/campaign/t1/api/v2
WHATSAPP_OTP_API_KEY=your_aisensy_api_key
```

> **Required at startup:** `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`. Server will exit on boot if any are missing.

---

## 🐳 Running with Docker

The `docker-compose.yml` in the project root spins up the full stack — backend API + PostgreSQL + Redis.

```bash
# From the project root (SmartFormFlow/)
docker-compose up --build
```

**Services:**

| Service | Port | Description |
|---------|------|-------------|
| `backend` | `4000` | Express API server |
| `postgres` | `5432` | PostgreSQL 15 |
| `redis` | `6379` | Redis 7 with AOF persistence |

```bash
# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f backend

# Stop everything
docker-compose down

# Stop and remove volumes (wipes DB data)
docker-compose down -v
```

> **Note:** The worker process is not yet a separate service in `docker-compose.yml`. For production, add a second service with `command: npm run worker`.

---

## 🗃 Database Setup

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create and apply a new migration (development)
npx prisma migrate dev --name descriptive_name

# Apply existing migrations (CI / production)
npx prisma migrate deploy

# Inspect the live database
npx prisma studio

# Reset database (⚠️ drops all data)
npx prisma migrate reset
```

### Migration Strategy

- All schema changes go through Prisma migrations (`prisma/migrations/`)
- Never modify migration files after they've been applied to a shared environment
- Use `prisma migrate deploy` (not `dev`) in CI/CD pipelines

---

## 📜 Scripts

```bash
npm run build     # Compile TypeScript → dist/ (includes static assets)
npm run dev       # Watch mode — recompiles on file change (no auto-restart)
npm start         # Run compiled dist/server.js
npm run worker    # Run compiled dist/worker.js (separate process)
```

> **Development tip:** Pair `npm run dev` (watch) with `nodemon dist/server.js` for hot-reload during development.

---

## 🔒 Security

| Layer | Implementation |
|-------|---------------|
| Headers | `helmet` — sets X-Content-Type-Options, X-Frame-Options, CSP, etc. |
| Auth | JWT Bearer tokens; tokens verified on every protected route |
| Passwords | `bcryptjs` hashing |
| Rate Limiting | `express-rate-limit` with Redis store — prevents brute force |
| CORS | Configurable allowed origins via `ALLOWED_ORIGINS` env var |
| Webhook Integrity | Razorpay HMAC signature verified against raw request body |
| Request IDs | Every request gets a unique `X-Request-Id` for tracing |
| Input Validation | Zod schemas on all incoming request bodies |
| Soft Deletes | `isDeleted` flag on sensitive models — no hard deletes in production |
| Queue Dashboard | `/admin/queues` protected by `authMiddleware` |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit using conventional commits: `git commit -m "feat: add X"`
4. Push and open a Pull Request

---

## 📄 License

ISC © [YSM Info Solution](https://ysminfosolution.com)
