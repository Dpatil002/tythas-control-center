import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { ok } from '@/lib/http/respond';
import { NotFoundError } from '@/lib/http/errors';
import { verifyDomainOwnership } from '@/lib/connectors/verification';
import { VerificationMethod } from '@/lib/connectors/types';

export const POST = withHandler(async (req, { params }) => {
  const ctx = await requireOrgContext(req);
  const website = await requireWebsiteAccess(ctx, params.id);
  const verificationId = params.vId;

  const verification = await db.ownershipVerification.findFirst({
    where: {
      id: verificationId,
      websiteId: website.id,
    },
  });

  if (!verification) {
    throw new NotFoundError('Verification attempt not found.');
  }

  // Run the verification test against the domain
  const result = await verifyDomainOwnership(
    website.domain,
    verification.token,
    verification.method as VerificationMethod
  );

  const now = new Date();

  if (result.verified) {
    await db.ownershipVerification.update({
      where: { id: verification.id },
      data: {
        status: 'VERIFIED',
        verifiedAt: now,
        attemptedAt: now,
      },
    });

    await db.website.update({
      where: { id: website.id },
      data: {
        ownershipVerifiedAt: now,
      },
    });

    return ok({
      verified: true,
      status: 'VERIFIED',
      message: 'Website ownership successfully verified.',
    });
  }

  // Failed attempt
  await db.ownershipVerification.update({
    where: { id: verification.id },
    data: {
      attemptedAt: now,
    },
  });

  return ok({
    verified: false,
    status: 'FAILED',
    reason: result.reason || 'Verification check failed. Please confirm the configuration and try again.',
  });
});
