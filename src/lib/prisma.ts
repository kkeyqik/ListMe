import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Force port 6543 (PgBouncer Transaction Mode) if port 5432 is provided
let connectionString = process.env.DATABASE_URL || '';
if (connectionString.includes(':5432/')) {
  connectionString = connectionString.replace(':5432/', ':6543/');
  if (!connectionString.includes('pgbouncer=true')) {
    connectionString += (connectionString.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }
}

// Cap max connections per lambda instance to 2 in production to prevent pool exhaustion (EMAXCONNSESSION)
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    max: process.env.NODE_ENV === 'production' ? 2 : 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });

// Handle pool-level errors to prevent silent connection drops
pool.on('error', (err) => {
  console.error('[Prisma Pool] Unexpected pool error:', err.message);
});

// Optional: Log pool metrics for debugging (enable via DEBUG_DB=true)
if (process.env.DEBUG_DB === 'true') {
  const logPoolMetrics = () => {
    console.log(`[Prisma Pool] total=${pool.totalCount} idle=${pool.idleCount} waiting=${pool.waitingCount}`);
    if (pool.waitingCount > 0) {
      console.warn(`[Prisma Pool] WARNING: ${pool.waitingCount} queries waiting for connections`);
    }
  };

  pool.on('connect', logPoolMetrics);
  pool.on('release', logPoolMetrics);
}

// Cache on globalThis across warm serverless invocations in ALL environments
globalForPrisma.pool = pool;

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

globalForPrisma.prisma = prisma;

export default prisma;
