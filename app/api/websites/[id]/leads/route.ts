import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export const GET = withHandler(
  async (req: Request, { params }: { params: { id: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const formId = url.searchParams.get('formId');
    const search = url.searchParams.get('search');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = {
      websiteId: params.id,
      ...(status && status !== 'ALL' && { status }),
      ...(formId && formId !== 'ALL' && {
        formSubmission: {
          formId,
        },
      }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { message: { contains: search } },
        ],
      }),
    };

    const [leads, total, stats] = await Promise.all([
      db.lead.findMany({
        where,
        include: {
          formSubmission: {
            include: {
              form: {
                select: {
                  id: true,
                  name: true,
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
          _count: {
            select: {
              activities: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.lead.count({ where }),
      db.lead.groupBy({
        by: ['status'],
        where: { websiteId: params.id },
        _count: {
          _all: true,
        },
      }),
    ]);

    const counts: Record<string, number> = {
      TOTAL: 0,
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      PROPOSAL: 0,
      WON: 0,
      LOST: 0,
    };

    stats.forEach((s) => {
      counts[s.status] = s._count._all;
      counts.TOTAL += s._count._all;
    });

    const transformedLeads = leads.map((l) => ({
      ...l,
      form: l.formSubmission?.form || null,
    }));

    return ok({
      leads: transformedLeads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts,
    });
  }
);

export const POST = withHandler(
  async (req: Request, { params }: { params: { id: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const body = await req.json();
    const { name, email, phone, message, status, assignedUserId, notes } = body;

    const lead = await db.lead.create({
      data: {
        websiteId: params.id,
        name: name || null,
        email: email || null,
        phone: phone || null,
        message: message || null,
        notes: notes || null,
        status: status || 'NEW',
        assignedUserId: assignedUserId || null,
        activities: {
          create: {
            type: 'CREATED',
            detail: `Lead created manually by ${ctx.email}`,
            createdBy: ctx.userId,
          },
        },
      },
      include: {
        assignedUser: true,
        activities: true,
      },
    });

    return ok({ lead });
  }
);
