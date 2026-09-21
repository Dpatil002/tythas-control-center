import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext } from '@/lib/auth/context';
import { mfaVerifySchema } from '@/lib/validation/auth.schema';
import { db } from '@/lib/db/prisma';
import { verifyTotp } from '@/lib/auth/mfa';
import { ok } from '@/lib/http/respond';
import { ValidationError } from '@/lib/http/errors';

export const POST = withHandler(async (req) => {
  const ctx = await requireOrgContext(req);
  const body = await req.json();
  const input = mfaVerifySchema.parse(body);

  const user = await db.user.findUnique({
    where: { id: ctx.userId },
  });

  if (!user) {
    throw new ValidationError('User account not found.');
  }

  const secretToVerify = input.encryptedSecret || user.mfaSecret;
  if (!secretToVerify) {
    throw new ValidationError('MFA configuration is missing. Please restart MFA setup.');
  }

  const isValid = verifyTotp(secretToVerify, input.code);
  if (!isValid) {
    throw new ValidationError('Invalid authenticator code. Please ensure your device clock is synchronized and try again.');
  }

  await db.user.update({
    where: { id: ctx.userId },
    data: {
      mfaEnabled: true,
      ...(input.encryptedSecret ? { mfaSecret: input.encryptedSecret } : {}),
    },
  });

  await db.loginEvent.create({
    data: {
      userId: ctx.userId,
      type: 'mfa_enabled',
    },
  }).catch(() => {});

  return ok({
    message: 'Two-factor authentication has been successfully enabled.',
    mfaEnabled: true,
  });
});
