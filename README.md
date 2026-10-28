# ListMe

Property listing site for India. Next.js 16 (App Router) + Prisma 7 (pg driver adapter) on Supabase Postgres, Supabase Auth and Storage, Firebase phone OTP. Deployed on Vercel (region `bom1`).

Production: https://listme-sable.vercel.app

> Next.js 16 differs from older versions. Read `AGENTS.md` and the docs in `node_modules/next/dist/docs/` before changing framework code.

## Setup

Requires Node.js 20.9 or newer.

```bash
npm ci                 # also runs `prisma generate`
cp .env.example .env   # then fill in values
npm run dev            # http://localhost:3000
```

Every environment variable the code reads is documented in `.env.example`.

**Use a separate development Supabase project.** Do not point a local `.env` at the production database: seed scripts and local testing write real rows.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
| `npm run check` | typecheck + lint + build |
| `npx prisma db seed` | Seed reference data (`prisma/seed.ts`); dev databases only |

## Database

- Schema: `prisma/schema.prisma`. CLI config: `prisma.config.ts` (uses `DIRECT_URL`, falling back to `DATABASE_URL`).
- There is no migration history yet. RLS and storage policies live in `prisma/sql/*.sql` and are applied by hand in the Supabase SQL editor.

## Deploy

Pushes to `main` deploy to Vercel. Set the same variables as `.env.example` in the Vercel project (never the dev-only mock-auth flags). Security headers (CSP in report-only mode, HSTS, nosniff, frame protection, Referrer-Policy, Permissions-Policy) are set in `next.config.ts`.

## CI

`.github/workflows/ci.yml` runs typecheck, lint and build on every pull request with placeholder env values. Dependabot opens weekly minor/patch update PRs.
