import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { resolveTargetWebsiteId } from '@/lib/auth/resolve-website';
import { GET as mediaGet, POST as mediaPost } from '../websites/[id]/media/route';

export const GET = withHandler(async (req: Request) => {
  const ctx = await requireOrgContext(req);
  const websiteId = await resolveTargetWebsiteId(req, ctx);
  await requireWebsiteAccess(ctx, websiteId);
  return mediaGet(req, { params: { id: websiteId } });
});

export const POST = withHandler(async (req: Request) => {
  const ctx = await requireOrgContext(req);
  const websiteId = await resolveTargetWebsiteId(req, ctx);
  await requireWebsiteAccess(ctx, websiteId);
  return mediaPost(req, { params: { id: websiteId } });
});
