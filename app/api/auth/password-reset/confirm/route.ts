import { withHandler } from '@/lib/http/with-handler';
import { passwordResetConfirmSchema } from '@/lib/validation/auth.schema';
import { db } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { verifyPasswordResetToken } from '@/lib/auth/password-reset';
import { revokeAllUserSessions } from '@/lib/auth/session';
import { ok } from '@/lib/http/respond';
import { ValidationError } from '@/lib/http/errors';
import { passwordResetLimiter, checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';

export const POST = withHandler(async (req) => {
  const ip = getClientIp(req);
  const body = await req.json();
  const input = passwordResetConfirmSchema.parse(body);

  const identifier = `reset-confirm:${ip}`;
  await checkRateLimit(passwordResetLimiter, identifier);

  // Extract userId from token without verification first to look up user
  let userId: string | undefined;
  try {
    const raw = Buffer.from(input.token, 'base64url').toString('utf8');
    userId = raw.split(':')[0];
  } catch {
    throw new ValidationError('The password reset link is invalid or has expired.');
  }

  if (!userId) {
    throw new ValidationError('The password reset link is invalid or has expired.');
  }

  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ValidationError('The password reset link is invalid or has expired.');
  }

  const verification = verifyPasswordResetToken(input.token, user.passwordHash);
  if (!verification.valid) {
    throw new ValidationError('The password reset link is invalid or has expired.');
  }

  const newPasswordHash = await hashPassword(input.password);

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: newPasswordHash },
  });

  // Invalidate all active sessions for this user on password reset (spec §6)
  await revokeAllUserSessions(user.id);

  await db.loginEvent.create({
    data: {
      userId: user.id,
      type: 'password_reset',
      ip,
      userAgent: req.headers.get('user-agent'),
    },
  }).catch(() => {});

  return ok({
    message: 'Your password has been successfully reset. Please log in with your new password.',
  });
});
