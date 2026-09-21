import { withHandler } from '@/lib/http/with-handler';
import { passwordResetRequestSchema } from '@/lib/validation/auth.schema';
import { db } from '@/lib/db/prisma';
import { createPasswordResetToken } from '@/lib/auth/password-reset';
import { sendEmail } from '@/lib/email/client';
import { renderPasswordResetEmail } from '@/lib/email/templates/password-reset';
import { ok } from '@/lib/http/respond';
import { passwordResetLimiter, checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';
import { env } from '@/lib/env';

export const POST = withHandler(async (req) => {
  const ip = getClientIp(req);
  const body = await req.json();
  const input = passwordResetRequestSchema.parse(body);

  const identifier = `reset-request:${ip}:${input.email.toLowerCase()}`;
  await checkRateLimit(passwordResetLimiter, identifier);

  const user = await db.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
  });

  // Always return success message to avoid account enumeration
  if (user) {
    const token = createPasswordResetToken(user.id, user.passwordHash);
    const resetUrl = `${env.APP_ORIGIN}/reset-password/confirm?token=${token}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const emailHtml = renderPasswordResetEmail({ resetUrl, expiresAt });
    await sendEmail({
      to: user.email,
      subject: 'Reset your Tythas Control Center password',
      html: emailHtml,
    });
  }

  return ok({
    message: 'If an account exists with this email address, a password reset link has been sent.',
  });
});
