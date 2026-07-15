import { NextRequest } from 'next/server';
import { prisma } from './prisma';

interface LogUserActivityParams {
  userId?: string | null;
  action: string;
  entityId?: string | null;
  request?: NextRequest | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
}

interface LogAdminActivityParams {
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Logs a seeker/user activity to the UserActivityLog table.
 * Automatically extracts IP and User Agent if a NextRequest object is passed.
 */
export async function logUserActivity({
  userId,
  action,
  entityId,
  request,
  ipAddress,
  userAgent,
  metadata,
}: LogUserActivityParams) {
  try {
    let resolvedIp = ipAddress || null;
    let resolvedUa = userAgent || null;

    if (request) {
      resolvedIp =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        (request as any).ip ||
        null;
      resolvedUa = request.headers.get('user-agent') || null;
    }

    return await prisma.userActivityLog.create({
      data: {
        userId: userId || null,
        action,
        entityId: entityId || null,
        ipAddress: resolvedIp,
        userAgent: resolvedUa,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  } catch (error) {
    console.error('Failed to log user activity:', error);
  }
}

/**
 * Logs an administrative audit action to the AdminActivityLog table.
 */
export async function logAdminActivity({
  adminId,
  action,
  entityType,
  entityId,
  metadata,
}: LogAdminActivityParams) {
  try {
    return await prisma.adminActivityLog.create({
      data: {
        adminId,
        action,
        entityType,
        entityId: entityId || null,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  } catch (error) {
    console.error('Failed to log admin activity:', error);
  }
}
