import { withHandler } from '@/lib/http/with-handler';
import { acceptInviteSchema } from '@/lib/validation/org.schema';
import { db } from '@/lib/db/prisma';
import { hashToken } from '@/lib/auth/tokens';
import { hashPassword } from '@/lib/auth/password';
import { verifyTotp, generateMfaSetup } from '@/lib/auth/mfa';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { ok } from '@/lib/http/respond';
import { ValidationError, NotFoundError } from '@/lib/http/errors';
import { inviteAcceptLimiter, checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';
import { createNotification } from '@/lib/notifications/service';

// GET: Validate token and prepare MFA setup
export const GET = withHandler(async (req, context) => {
  const token = context?.params?.token as string;
  if (!token) throw new NotFoundError('Invitation not found.');

  const tokenHash = hashToken(token);
  const invitation = await db.invitation.findUnique({
    where: { tokenHash },
    include: { organization: true },
  });

  if (
    !invitation ||
    invitation.acceptedAt !== null ||
    invitation.revokedAt !== null ||
    invitation.expiresAt < new Date()
  ) {
    throw new ValidationError('This invitation is no longer valid or has expired.');
  }

  // Generate initial MFA setup data for the setup wizard on the accept page
  const mfaSetup = await generateMfaSetup(invitation.email, invitation.organization.name);

  return ok({
    invitation: {
      email: invitation.email,
      organizationName: invitation.organization.name,
      role: invitation.role,
    },
    mfaSetup: {
      otpauthUri: mfaSetup.otpauthUri,
      qrCodeDataUrl: mfaSetup.qrCodeDataUrl,
      secret: mfaSetup.secret,
      encryptedSecret: mfaSetup.encryptedSecret,
      backupCodes: mfaSetup.backupCodes,
      hashedBackupCodes: mfaSetup.hashedBackupCodes,
    },
  });
});

// POST: Complete acceptance, verify MFA, create user and membership, start session
export const POST = withHandler(async (req, context) => {
  const ip = getClientIp(req);
  const token = context?.params?.token as string;
  if (!token) throw new NotFoundError('Invitation not found.');

  await checkRateLimit(inviteAcceptLimiter, `invite-accept:${ip}`);

  const body = await req.json();
  const input = acceptInviteSchema.parse(body);

  const tokenHash = hashToken(token);
  const invitation = await db.invitation.findUnique({
    where: { tokenHash },
    include: { organization: true },
  });

  if (
    !invitation ||
    invitation.acceptedAt !== null ||
    invitation.revokedAt !== null ||
    invitation.expiresAt < new Date()
  ) {
    throw new ValidationError('This invitation is no longer valid or has expired.');
  }

  // Verify mandatory TOTP setup code
  const isTotpValid = verifyTotp(input.encryptedMfaSecret, input.totpCode);
  if (!isTotpValid) {
    throw new ValidationError('Invalid 6-digit authenticator code. Please check your authenticator app and try again.');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await db.$transaction(async (tx) => {
    // Check if user already exists
    let existingUser = await tx.user.findUnique({
      where: { email: invitation.email.toLowerCase().trim() },
    });

    if (!existingUser) {
      existingUser = await tx.user.create({
        data: {
          email: invitation.email.toLowerCase().trim(),
          passwordHash,
          mfaSecret: input.encryptedMfaSecret,
          mfaEnabled: true,
          mfaBackupCodes: JSON.stringify(input.hashedBackupCodes),
        },
      });
    } else {
      // Update existing user credentials & MFA
      existingUser = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          mfaSecret: input.encryptedMfaSecret,
          mfaEnabled: true,
          mfaBackupCodes: JSON.stringify(input.hashedBackupCodes),
        },
      });
    }

    // Create or update OrganizationMember
    await tx.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: existingUser.id,
        },
      },
      create: {
        organizationId: invitation.organizationId,
        userId: existingUser.id,
        role: 'MANAGER',
        status: 'ACTIVE',
      },
      update: {
        role: 'MANAGER',
        status: 'ACTIVE',
      },
    });

    // Mark invitation as accepted
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    await tx.loginEvent.create({
      data: {
        userId: existingUser.id,
        type: 'invite_accepted',
        ip,
        userAgent: req.headers.get('user-agent'),
      },
    });

    return existingUser;
  });

  // Create session and set cookie
  const userAgent = req.headers.get('user-agent');
  const session = await createSession(user.id, ip, userAgent);
  setSessionCookie(session.sessionToken, session.expiresAt);

  // Fire notification for organization owners
  await createNotification({
    organizationId: invitation.organizationId,
    type: 'USER_INVITATION_STATUS_CHANGED',
    severity: 'INFO',
    title: 'Invitation accepted',
    detail: `${invitation.email} has accepted the invitation and joined as Manager.`,
    linkPath: '/settings/organization',
  });

  return ok({
    message: 'Account successfully activated.',
    user: {
      id: user.id,
      email: user.email,
      organizationId: invitation.organizationId,
      organizationName: invitation.organization.name,
      role: 'MANAGER',
    },
  });
});
