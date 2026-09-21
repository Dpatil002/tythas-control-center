import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { stringify } from 'csv-stringify/sync';
import { Prisma } from '@prisma/client';

export const GET = withHandler(
  async (req: Request, { params }: { params: { id: string } }) => {
    const ctx = await requireOrgContext(req);
    const website = await requireWebsiteAccess(ctx, params.id);

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const formId = url.searchParams.get('formId');
    const search = url.searchParams.get('search');

    const where: Prisma.LeadWhereInput = {
      websiteId: params.id,
      ...(status && status !== 'ALL' && { status }),
      ...(formId && formId !== 'ALL' && {
        formSubmission: { formId },
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

    const leads = await db.lead.findMany({
      where,
      include: {
        formSubmission: {
          include: {
            form: {
              select: { name: true },
            },
          },
        },
        assignedUser: {
          select: { id: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = leads.map((lead) => [
      lead.id,
      lead.createdAt.toISOString(),
      lead.name || '',
      lead.email || '',
      lead.phone || '',
      lead.status,
      lead.formSubmission?.form?.name || (lead.formSubmissionId ? 'Form Submission' : 'Manual Entry'),
      lead.assignedUser?.email || '',
      lead.utmSource || '',
      lead.utmMedium || '',
      lead.utmCampaign || '',
      lead.utmTerm || '',
      lead.utmContent || '',
      lead.landingPage || '',
      lead.referrer || '',
      lead.device || '',
      lead.message || '',
    ]);

    const csv = stringify([
      [
        'ID',
        'Created At',
        'Name',
        'Email',
        'Phone',
        'Status',
        'Source',
        'Assigned To',
        'UTM Source',
        'UTM Medium',
        'UTM Campaign',
        'UTM Term',
        'UTM Content',
        'Landing Page',
        'Referrer',
        'Device',
        'Message',
      ],
      ...rows,
    ]);

    const fileName = `leads-${website.domain || website.name || params.id}-${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  }
);
