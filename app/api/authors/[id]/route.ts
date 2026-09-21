import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { fail } from '@/lib/http/respond';
import { PATCH as authorPatch, DELETE as authorDelete } from '../../websites/[id]/authors/[authorId]/route';

export const PATCH = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const author = await prisma.author.findUnique({ where: { id: params.id } });
  if (!author) return fail(404, 'NOT_FOUND', 'Author not found');
  await requireWebsiteAccess(ctx, author.websiteId);
  return authorPatch(req, { params: { id: author.websiteId, authorId: params.id } });
});

export const DELETE = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const author = await prisma.author.findUnique({ where: { id: params.id } });
  if (!author) return fail(404, 'NOT_FOUND', 'Author not found');
  await requireWebsiteAccess(ctx, author.websiteId);
  return authorDelete(req, { params: { id: author.websiteId, authorId: params.id } });
});
