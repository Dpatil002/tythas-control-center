import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';

export const GET = withHandler(
  async (req: Request, { params }: { params: { id: string; leadId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const lead = await db.lead.findFirst({
      where: {
        id: params.leadId,
        websiteId: params.id,
      },
      include: {
        formSubmission: {
          include: {
            form: {
              select: {
                id: true,
                name: true,
                publicKey: true,
              },
            },
          },
        },
        assignedUser: {
          select: {
            id: true,
            email: true,
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      return fail(404, 'NOT_FOUND', 'Lead not found.');
    }

    return ok({
      lead: {
        ...lead,
        form: lead.formSubmission?.form || null,
        submission: lead.formSubmission || null,
      },
    });
  }
);

export const PATCH = withHandler(
  async (req: Request, { params }: { params: { id: string; leadId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const existingLead = await db.lead.findFirst({
      where: {
        id: params.leadId,
        websiteId: params.id,
      },
      include: {
        assignedUser: true,
      },
    });

    if (!existingLead) {
      return fail(404, 'NOT_FOUND', 'Lead not found.');
    }

    const body = await req.json();
    const { status, assignedUserId, name, email, phone, message, notes } = body;

    const activityCreates: Array<{
      type: string;
      detail?: string;
      createdBy?: string;
    }> = [];

    // Track status change
    if (status && status !== existingLead.status) {
      activityCreates.push({
        type: 'STATUS_CHANGED',
        detail: `Status changed from ${existingLead.status} to ${status} by ${ctx.email}`,
        createdBy: ctx.userId,
      });
    }

    // Track assignment change
    if (assignedUserId !== undefined && assignedUserId !== existingLead.assignedUserId) {
      if (assignedUserId) {
        const user = await db.user.findUnique({
          where: { id: assignedUserId },
          select: { id: true, email: true },
        });
        activityCreates.push({
          type: 'ASSIGNED',
          detail: `Assigned to ${user?.email || 'user'} by ${ctx.email}`,
          createdBy: ctx.userId,
        });
      } else {
        activityCreates.push({
          type: 'ASSIGNED',
          detail: `Unassigned by ${ctx.email}`,
          createdBy: ctx.userId,
        });
      }
    }

    const updated = await db.lead.update({
      where: { id: params.leadId },
      data: {
        ...(status !== undefined && { status }),
        ...(assignedUserId !== undefined && { assignedUserId }),
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(message !== undefined && { message }),
        ...(notes !== undefined && { notes }),
        ...(activityCreates.length > 0 && {
          activities: {
            createMany: {
              data: activityCreates,
            },
          },
        }),
      },
      include: {
        formSubmission: {
          include: {
            form: true,
          },
        },
        assignedUser: true,
        activities: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return ok({
      lead: {
        ...updated,
        form: updated.formSubmission?.form || null,
        submission: updated.formSubmission || null,
      },
    });
  }
);

export const DELETE = withHandler(
  async (req: Request, { params }: { params: { id: string; leadId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const lead = await db.lead.findFirst({
      where: { id: params.leadId, websiteId: params.id },
    });

    if (!lead) {
      return fail(404, 'NOT_FOUND', 'Lead not found.');
    }

    await db.lead.delete({
      where: { id: params.leadId },
    });

    return ok({ success: true });
  }
);
