import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { fail } from '@/lib/http/respond';
import { GET as mediaGet, PATCH as mediaPatch, DELETE as mediaDelete } from '../../websites/[id]/media/[mediaId]/route';

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const media = await prisma.media.findUnique({ where: { id: params.id } });
  if (!media) return fail(404, 'NOT_FOUND', 'Media not found');
  await requireWebsiteAccess(ctx, media.websiteId);
  return mediaGet(req, { params: { id: media.websiteId, mediaId: params.id } });
});

export const PATCH = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const media = await prisma.media.findUnique({ where: { id: params.id } });
  if (!media) return fail(404, 'NOT_FOUND', 'Media not found');
  await requireWebsiteAccess(ctx, media.websiteId);
  return mediaPatch(req, { params: { id: media.websiteId, mediaId: params.id } });
});

export const DELETE = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const media = await prisma.media.findUnique({ where: { id: params.id } });
  if (!media) return fail(404, 'NOT_FOUND', 'Media not found');
  await requireWebsiteAccess(ctx, media.websiteId);
  return mediaDelete(req, { params: { id: media.websiteId, mediaId: params.id } });
});
