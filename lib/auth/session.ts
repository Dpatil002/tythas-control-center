import { cookies } from 'next/headers';
import { db } from '@/lib/db/prisma';
import crypto from 'crypto';

export const SESSION_COOKIE_NAME = 'tythas_session';
const SESSION_TTL_DAYS = 30;

export interface SessionData {
  id: string;
  userId: string;
  sessionToken: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    mfaEnabled: boolean;
    memberships: {
      organizationId: string;
      role: 'OWNER' | 'MANAGER';
      status: 'ACTIVE' | 'SUSPENDED';
      organization: {
        id: string;
        name: string;
      };
    }[];
  };
}

export async function createSession(
  userId: string,
  ip?: string | null,
  userAgent?: string | null
): Promise<{ sessionToken: string; expiresAt: Date }> {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: {
      userId,
      sessionToken,
      ip: ip || null,
      userAgent: userAgent || null,
      expiresAt,
    },
  });

  return { sessionToken, expiresAt };
}

export function setSessionCookie(sessionToken: string, expiresAt: Date) {
  try {
    const cookieStore = cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });
  } catch (err) {
    console.warn('Could not set cookie via next/headers:', err);
  }
}

export function clearSessionCookie() {
  try {
    const cookieStore = cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (err) {
    console.warn('Could not delete cookie via next/headers:', err);
  }
}

export async function getSessionFromToken(token: string): Promise<SessionData | null> {
  const session = await db.session.findUnique({
    where: { sessionToken: token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          mfaEnabled: true,
          memberships: {
            include: {
              organization: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session as unknown as SessionData;
}

export async function getSession(req?: Request): Promise<SessionData | null> {
  let token: string | undefined;

  if (req) {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) token = match[1];
  } else {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Cookies not accessible outside request context
    }
  }

  if (!token) return null;
  return getSessionFromToken(token);
}

export async function touchLastSeen(sessionId: string) {
  try {
    await db.session.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    });
  } catch {
    // Ignore update failures on touch
  }
}

export async function revokeSession(sessionId: string, userId: string) {
  await db.session.deleteMany({
    where: {
      id: sessionId,
      userId,
    },
  });
}

export async function revokeAllUserSessions(userId: string, exceptSessionToken?: string) {
  await db.session.deleteMany({
    where: {
      userId,
      ...(exceptSessionToken ? { NOT: { sessionToken: exceptSessionToken } } : {}),
    },
  });
}
