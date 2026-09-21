import { withHandler } from '@/lib/http/with-handler';
import { loginSchema } from '@/lib/validation/auth.schema';
import { db } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { verifyTotp, verifyAndConsumeBackupCode } from '@/lib/auth/mfa';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { ok } from '@/lib/http/respond';
import { AuthenticationError } from '@/lib/http/errors';
import { loginLimiter, checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';

export const POST = withHandler(async (req) => {
  const ip = getClientIp(req);
  const body = await req.json();
  const input = loginSchema.parse(body);

  const identifier = `login:${ip}:${input.email.toLowerCase()}`;
  await checkRateLimit(loginLimiter, identifier);

  const user = await db.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
    include: {
      memberships: {
        include: {
          organization: true,
        },
      },
    },
  });

  if (!user) {
    throw new AuthenticationError('Invalid email or password.');
  }

  const isValidPassword = await verifyPassword(user.passwordHash, input.password);
  if (!isValidPassword) {
    await db.loginEvent.create({
      data: {
        userId: user.id,
        type: 'login_failed',
        ip,
        userAgent: req.headers.get('user-agent'),
      },
    }).catch(() => {});
    throw new AuthenticationError('Invalid email or password.');
  }

  // If user has MFA enabled, verify code
  if (user.mfaEnabled) {
    if (!input.code) {
      return ok({
        mfaRequired: true,
        message: 'Please enter the 6-digit authentication code from your authenticator app.',
      });
    }

    let mfaValid = false;
    if (user.mfaSecret) {
      mfaValid = verifyTotp(user.mfaSecret, input.code);
    }

    // Dev environment fallback (e.g. 123456 or 000000 in development/test only)
    if (!mfaValid && process.env.NODE_ENV !== 'production' && (input.code === '123456' || input.code === '000000')) {
      mfaValid = true;
    }

    // Try backup codes if TOTP verification fails
    if (!mfaValid && user.mfaBackupCodes) {
      let storedCodes: string[] = [];
      try {
        storedCodes = typeof user.mfaBackupCodes === 'string' ? JSON.parse(user.mfaBackupCodes) : user.mfaBackupCodes;
      } catch {
        storedCodes = [];
      }

      if (storedCodes.length > 0) {
        const backupResult = verifyAndConsumeBackupCode(storedCodes, input.code);
        if (backupResult.valid) {
          mfaValid = true;
          // In production consume code; in dev keep demo codes intact
          if (process.env.NODE_ENV === 'production') {
            await db.user.update({
              where: { id: user.id },
              data: { mfaBackupCodes: JSON.stringify(backupResult.remainingHashedCodes) },
            });
          }
        }
      }
    }

    if (!mfaValid) {
      await db.loginEvent.create({
        data: {
          userId: user.id,
          type: 'mfa_failed',
          ip,
          userAgent: req.headers.get('user-agent'),
        },
      }).catch(() => {});
      throw new AuthenticationError('Invalid authentication code. Please try again.');
    }
  }

  const userAgent = req.headers.get('user-agent');
  const session = await createSession(user.id, ip, userAgent);
  setSessionCookie(session.sessionToken, session.expiresAt);

  // Update last login
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await db.loginEvent.create({
    data: {
      userId: user.id,
      type: 'login_success',
      ip,
      userAgent,
    },
  });

  const activeMembership = user.memberships.find((m) => m.status === 'ACTIVE') || user.memberships[0];

  return ok({
    user: {
      id: user.id,
      email: user.email,
      mfaEnabled: user.mfaEnabled,
    },
    organization: activeMembership
      ? {
          id: activeMembership.organization.id,
          name: activeMembership.organization.name,
          role: activeMembership.role,
        }
      : null,
  });
});
