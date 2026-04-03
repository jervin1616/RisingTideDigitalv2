# Rising Tide Digital LLC

**Built for the coast. Designed to grow.**

Full-stack web application for Rising Tide Digital LLC, a web design agency based in Wilmington, NC.

---

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL via Prisma ORM
- **Frontend:** Vanilla HTML/CSS/JS
- **Auth:** JWT tokens in httpOnly cookies
- **Email:** Nodemailer with Gmail SMTP
- **Payments:** Stripe (test mode)
- **Hosting:** Railway

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (local or remote)

### 1. Clone and Install

```bash
git clone <repo-url>
cd rising-tide-digital
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Fill in all values in `.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Random secret string (min 32 chars) |
| `STRIPE_SECRET_KEY` | Stripe secret key (test: `sk_test_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (test: `pk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `GMAIL_USER` | Gmail address for sending emails |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not your regular password) |
| `ADMIN_SEED_EMAIL` | Email for the seeded admin account |
| `ADMIN_SEED_PASSWORD` | Password for the seeded admin account |
| `PORT` | Server port (default: 3000) |
| `APP_URL` | Full base URL (e.g., https://yourdomain.railway.app) |

### 3. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed the database
npm run seed
```

### 4. Run the App

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Visit `http://localhost:3000`

---

## Seed File

The seed script (`prisma/seed.js`) creates:

- **1 admin account** — credentials from `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` in `.env`
- **3 service products** — Starter ($500), Standard ($1,000), Premium ($1,500)
- **Default time slots** — Monday–Friday, 9am–4pm in 1-hour blocks

Run with:
```bash
npm run seed
```

> The seed is idempotent — running it multiple times won't create duplicates.

---

## Adding the First Admin

The admin account is **only** created via the seed file. Regular users cannot register as admin through the public registration page.

To add another admin, either:
1. Run a manual Prisma query: `UPDATE "User" SET role = 'admin' WHERE email = 'someone@example.com';`
2. Or use Prisma Studio: `npx prisma studio`

---

## Stripe Webhook (Local Development)

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhook events locally:

```bash
stripe listen --forward-to localhost:3000/api/orders/webhook
```

Copy the webhook signing secret printed by the CLI into your `.env` as `STRIPE_WEBHOOK_SECRET`.

---

## Railway Deployment

### 1. Create a Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init
```

### 2. Add PostgreSQL Plugin

In the Railway dashboard, add a PostgreSQL plugin to your project. Railway will auto-set `DATABASE_URL`.

### 3. Set Environment Variables

In Railway dashboard → Variables, add all values from `.env.example` (except `DATABASE_URL` which is set automatically).

### 4. Deploy

```bash
railway up
```

### 5. Run Migrations on Railway

```bash
railway run npx prisma migrate deploy
railway run npm run seed
```

### 6. Stripe Webhook on Production

In the Stripe dashboard, add a webhook endpoint:
- URL: `https://your-app.railway.app/api/orders/webhook`
- Events: `checkout.session.completed`, `payment_intent.payment_failed`

---

## Project Structure

```
/
├── public/               # Static frontend files
│   ├── css/
│   ├── js/
│   ├── images/
│   └── *.html
├── src/
│   ├── routes/           # Express route definitions
│   ├── controllers/      # Business logic
│   └── middleware/       # Auth & role guards
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.js           # Database seeder
├── server.js             # App entry point
├── .env.example
└── package.json
```

---

## API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new client |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/logout` | Auth | Logout |
| GET | `/api/auth/me` | Auth | Get current user |
| GET | `/api/products` | Public | List active products |
| POST | `/api/orders/checkout` | Auth | Create Stripe session |
| POST | `/api/orders/webhook` | Stripe | Stripe webhook |
| GET | `/api/orders/my` | Auth | Client's orders |
| GET | `/api/bookings/slots` | Auth | Available time slots |
| POST | `/api/bookings` | Auth | Create booking |
| GET | `/api/bookings/my` | Auth | Client's bookings |
| DELETE | `/api/bookings/:id` | Auth | Cancel booking |
| POST | `/api/contact` | Public | Submit contact form |
| GET | `/api/admin/stats` | Admin | Dashboard stats |
| GET | `/api/admin/bookings` | Admin | All bookings |
| PATCH | `/api/admin/bookings/:id` | Admin | Update booking status |
| GET | `/api/admin/orders` | Admin | All orders |
| GET | `/api/admin/contacts` | Admin | All contact submissions |
| GET | `/api/admin/products` | Admin | All products |
| POST | `/api/admin/products` | Admin | Create product |
| PATCH | `/api/admin/products/:id` | Admin | Update product |
| GET | `/api/timeslots` | Admin | All time slots |
| POST | `/api/timeslots` | Admin | Create time slot |
| PATCH | `/api/timeslots/:id` | Admin | Toggle time slot |
| POST | `/api/admin/updates` | Admin | Post project update |
| GET | `/api/admin/clients` | Admin | List all clients |
