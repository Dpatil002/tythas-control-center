import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { z } from 'zod';

const UpdatePreferenceSchema = z.object({
  sslExpiry: z.boolean().optional(),
  newLead: z.boolean().optional(),
  seoAudit: z.boolean().optional(),
  publishingAndForms: z.boolean().optional(),
  // Disallowing attempts to disable critical alerts
  websiteDown: z.boolean().optional(),
  connectionErrors: z.boolean().optional(),
});

export const GET = withHandler(async (req: Request) => {
  const ctx = await requireOrgContext(req);

  let preference = await db.notificationPreference.findUnique({
    where: { userId: ctx.userId },
  });

  if (!preference) {
    preference = await db.notificationPreference.create({
      data: {
        userId: ctx.userId,
        sslExpiry: true,
        newLead: true,
        seoAudit: true,
        publishingAndForms: true,
      },
    });
  }

  return ok({
    preferences: {
      sslExpiry: preference.sslExpiry,
      newLead: preference.newLead,
      seoAudit: preference.seoAudit,
      publishingAndForms: preference.publishingAndForms,
      websiteDown: true, // Always on
      connectionErrors: true, // Always on
    },
  });
});

export const PATCH = withHandler(async (req: Request) => {
  const ctx = await requireOrgContext(req);

  const body = await req.json();
  const input = UpdatePreferenceSchema.parse(body);

  // Server-side enforcement: if caller explicitly attempts to set websiteDown or connectionErrors to false, reject with 400
  if (input.websiteDown === false || input.connectionErrors === false) {
    return fail(
      400,
      'INVALID_PREFERENCE',
      'Critical alerts (Website Down / Connection Errors) cannot be disabled.'
    );
  }

  const preference = await db.notificationPreference.upsert({
    where: { userId: ctx.userId },
    create: {
      userId: ctx.userId,
      sslExpiry: input.sslExpiry ?? true,
      newLead: input.newLead ?? true,
      seoAudit: input.seoAudit ?? true,
      publishingAndForms: input.publishingAndForms ?? true,
    },
    update: {
      ...(input.sslExpiry !== undefined && { sslExpiry: input.sslExpiry }),
      ...(input.newLead !== undefined && { newLead: input.newLead }),
      ...(input.seoAudit !== undefined && { seoAudit: input.seoAudit }),
      ...(input.publishingAndForms !== undefined && { publishingAndForms: input.publishingAndForms }),
    },
  });

  return ok({
    preferences: {
      sslExpiry: preference.sslExpiry,
      newLead: preference.newLead,
      seoAudit: preference.seoAudit,
      publishingAndForms: preference.publishingAndForms,
      websiteDown: true,
      connectionErrors: true,
    },
    message: 'Notification preferences updated successfully.',
  });
});
