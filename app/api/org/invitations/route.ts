import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireRole } from '@/lib/auth/context';
import { inviteSchema } from '@/lib/validation/org.schema';
import { db } from '@/lib/db/prisma';
import { generateRawToken, hashToken } from '@/lib/auth/tokens';
import { sendEmail } from '@/lib/email/client';
import { renderInviteEmail } from '@/lib/email/templates/invite';
import { ok, created } from '@/lib/http/respond';
import { ValidationError } from '@/lib/http/errors';
import { env } from '@/lib/env';

export const GET = withHandler(async (req) => {
  const ctx = await requireOrgContext(req);
  requireRole(ctx, 'OWNER');

  const invitations = await db.invitation.findMany({
    where: {
      organizationId: ctx.organizationId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok({ invitations });
});

export const POST = withHandler(async (req) => {
  const ctx = await requireOrgContext(req);
  requireRole(ctx, 'OWNER');

  const body = await req.json();
  const input = inviteSchema.parse(body);
  const email = input.email.toLowerCase().trim();

  // Check if user is already an active member of this organization
  const existingMember = await db.organizationMember.findFirst({
    where: {
      organizationId: ctx.organizationId,
      user: { email },
    },
  });

  if (existingMember) {
    throw new ValidationError('A user with this email is already a member of your organization.');
  }

  // Revoke any previous pending invitations for this email in this org
  await db.invitation.updateMany({
    where: {
      organizationId: ctx.organizationId,
      email,
      acceptedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  const rawToken = generateRawToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await db.invitation.create({
    data: {
      organizationId: ctx.organizationId,
      email,
      role: 'MANAGER',
      tokenHash,
      invitedByUserId: ctx.userId,
      expiresAt,
    },
  });

  const acceptUrl = `${env.APP_ORIGIN}/invite/accept?token=${rawToken}`;
  const emailHtml = renderInviteEmail({
    orgName: ctx.organizationName,
    inviterEmail: ctx.email,
    acceptUrl,
    expiresAt,
  });

  await sendEmail({
    to: email,
    subject: `You've been invited to join ${ctx.organizationName} on Tythas Control Center`,
    html: emailHtml,
  });

  return created({
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    },
  });
});
