import { getSession } from './session';
import { db } from '@/lib/db/prisma';
import { AuthenticationError, ForbiddenError, NotFoundError } from '@/lib/http/errors';

export interface AuthContext {
  userId: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: 'OWNER' | 'MANAGER';
  sessionId: string;
}

export async function requireOrgContext(req?: Request): Promise<AuthContext> {
  const session = await getSession(req);

  if (!session || !session.user) {
    throw new AuthenticationError('Please log in to continue.');
  }

  // Active membership check
  const activeMembership = session.user.memberships.find(
    (m) => m.status === 'ACTIVE'
  );

  if (!activeMembership) {
    throw new ForbiddenError('Your account does not have an active organization membership.');
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    organizationId: activeMembership.organizationId,
    organizationName: activeMembership.organization.name,
    role: activeMembership.role,
    sessionId: session.id,
  };
}

export function requireRole(ctx: AuthContext, requiredRole: 'OWNER' | 'MANAGER') {
  if (requiredRole === 'OWNER' && ctx.role !== 'OWNER') {
    throw new ForbiddenError('Only organization owners can perform this action.');
  }
}

export async function requireWebsiteAccess(
  ctx: AuthContext,
  websiteId: string
): Promise<{ id: string; organizationId: string; name: string; domain: string }> {
  // Always query scoped to organizationId to guarantee multi-tenant boundary
  const website = await db.website.findFirst({
    where: {
      id: websiteId,
      organizationId: ctx.organizationId,
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      domain: true,
    },
  });

  // Return 404 rather than 403 when website is outside tenant scope to avoid ID enumeration
  if (!website) {
    throw new NotFoundError('Website not found.');
  }

  if (ctx.role === 'OWNER') {
    return website;
  }

  // For MANAGER, check explicit WebsiteAccess assignment
  const access = await db.websiteAccess.findUnique({
    where: {
      websiteId_userId: {
        websiteId,
        userId: ctx.userId,
      },
    },
  });

  if (!access) {
    throw new NotFoundError('Website not found.');
  }

  return website;
}
