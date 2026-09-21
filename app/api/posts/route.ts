import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { resolveTargetWebsiteId } from '@/lib/auth/resolve-website';
import { GET as postsGet, POST as postsPost } from '../websites/[id]/posts/route';

export const GET = withHandler(async (req: Request) => {
  const ctx = await requireOrgContext(req);
  const websiteId = await resolveTargetWebsiteId(req, ctx);
  await requireWebsiteAccess(ctx, websiteId);
  return postsGet(req, { params: { id: websiteId } });
});

export const POST = withHandler(async (req: Request) => {
  const ctx = await requireOrgContext(req);
  const websiteId = await resolveTargetWebsiteId(req, ctx);
  await requireWebsiteAccess(ctx, websiteId);
  return postsPost(req, { params: { id: websiteId } });
});
