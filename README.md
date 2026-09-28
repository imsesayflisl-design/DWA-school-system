# Divine Wonders Academy School Management Dashboard

School management system with **Clerk** for authentication and **NeonDB** (PostgreSQL via Prisma) for all user profiles and school data.

## Architecture

- **Clerk** — password hashing, login verification, sessions
- **NeonDB (Prisma)** — user profiles (Admin, Teacher, Student, Parent), school records, audit logs

## Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Clerk](https://clerk.com) application

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret |
| `ADMIN_SETUP_SECRET` | Protects one-time admin creation at `/setup` |

## Setup Checklist

### 1. Neon Database

1. Create a Neon project and copy the connection string.
2. Set `DATABASE_URL` in `.env.local`.
3. Apply the schema:
   ```bash
   npx prisma migrate deploy
   # or for local dev:
   npx prisma db push
   ```
4. Seed grades, classes, and subjects (required for sign-up):
   ```bash
   npx prisma db seed
   ```

### 2. Clerk Application

1. Create a Clerk app and add your keys to `.env.local`.
2. Enable **username + password** authentication in Clerk Dashboard.
3. **Customize session token** (required for route guards):
   - Go to **Sessions → Customize session token**
   - Add:
     ```json
     {
       "metadata": "{{user.public_metadata}}"
     }
     ```
   - Save — this exposes `publicMetadata.role` as `sessionClaims.metadata.role`
4. **Register webhook** (backup user sync):
   - Endpoint: `https://your-domain.com/api/webhooks`
   - Events: `user.created`, `user.updated`
   - Copy the signing secret to `CLERK_WEBHOOK_SECRET`



This creates the admin in both Clerk and NeonDB.

### 4. Run the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Auth Flows

### Registration (Student / Teacher)

1. User fills out the form at `/sign-up`
2. Server action creates a Clerk user (username, password, role)
3. Matching profile is written to NeonDB (Student or Teacher table)
4. User is redirected to `/sign-in`

### Login

1. User signs in via Clerk at `/sign-in`
2. Clerk verifies credentials and creates a session
3. Dashboard loads profile data from NeonDB (via `getUserProfile`)
4. User is redirected to their role dashboard (`/admin`, `/teacher`, etc.)

### Admin Setup (One-Time)

1. Visit `/setup` with `ADMIN_SETUP_SECRET`
2. Creates Clerk user + NeonDB `Admin` record
3. Audit log entry is written

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npx prisma studio    # Open Prisma database GUI
npx prisma db seed   # Seed demo school data
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
