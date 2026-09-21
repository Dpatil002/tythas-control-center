import { prisma } from '@/lib/db/prisma';
import { AuthContext } from './context';

export async function resolveTargetWebsiteId(req: Request, ctx: AuthContext): Promise<string> {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get('websiteId');
  if (fromQuery) return fromQuery;

  const fromHeader = req.headers.get('x-website-id');
  if (fromHeader) return fromHeader;

  // Fallback to first accessible website in org
  const firstWebsite = await prisma.website.findFirst({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: 'desc' },
  });

  if (!firstWebsite) {
    throw new Error('No accessible website found for this organization');
  }

  return firstWebsite.id;
}
