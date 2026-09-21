import { withHandler } from '@/lib/http/with-handler';
import { signupSchema } from '@/lib/validation/auth.schema';
import { db } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { generateMfaSetup } from '@/lib/auth/mfa';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { created } from '@/lib/http/respond';
import { ValidationError } from '@/lib/http/errors';
import { getClientIp } from '@/lib/auth/rate-limit';

export const POST = withHandler(async (req) => {
  const body = await req.json();
  const input = signupSchema.parse(body);

  const existingUser = await db.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
  });

  if (existingUser) {
    throw new ValidationError('An account with this email address already exists.');
  }

  const passwordHash = await hashPassword(input.password);
  const mfaSetup = await generateMfaSetup(input.email);

  // Transaction to create Org, User, and OrganizationMember as OWNER
  const result = await db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: input.organizationName.trim(),
      },
    });

    const user = await tx.user.create({
      data: {
        email: input.email.toLowerCase().trim(),
        passwordHash,
        mfaSecret: mfaSetup.encryptedSecret,
        mfaEnabled: false, // Mandatory setup step next
        mfaBackupCodes: JSON.stringify(mfaSetup.hashedBackupCodes),
      },
    });

    await tx.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });

    await tx.loginEvent.create({
      data: {
        userId: user.id,
        type: 'signup_success',
        ip: getClientIp(req),
        userAgent: req.headers.get('user-agent'),
      },
    });

    return { user, org };
  });

  // Create active session
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent');
  const session = await createSession(result.user.id, ip, userAgent);
  setSessionCookie(session.sessionToken, session.expiresAt);

  return created({
    userId: result.user.id,
    email: result.user.email,
    organization: {
      id: result.org.id,
      name: result.org.name,
    },
    mfaSetup: {
      otpauthUri: mfaSetup.otpauthUri,
      qrCodeDataUrl: mfaSetup.qrCodeDataUrl,
      secret: mfaSetup.secret,
      backupCodes: mfaSetup.backupCodes,
    },
  });
});
