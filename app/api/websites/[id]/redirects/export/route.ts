import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { stringify } from 'csv-stringify/sync';

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const redirects = await prisma.redirect.findMany({
    where: { websiteId: params.id },
    orderBy: { fromPath: 'asc' }
  });

  const rows = redirects.map((r) => [
    r.fromPath,
    r.toPath,
    r.type.replace(/^R/, '')
  ]);

  const csv = stringify([
    ['from_path', 'to_path', 'type'],
    ...rows
  ]);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="redirects-${params.id}.csv"`
    }
  });
});
