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
