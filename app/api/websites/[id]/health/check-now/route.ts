import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { runWebsiteChecks } from '@/lib/monitoring/checks';

export const POST = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const website = await requireWebsiteAccess(ctx, params.id);

  try {
    const results = await runWebsiteChecks(website.id, true);
    return ok({
      success: true,
      message: 'Health checks completed successfully.',
      checks: results,
    });
  } catch (err: any) {
    if (err.message && err.message.includes('Rate limit')) {
      return fail(429, 'RATE_LIMITED', err.message);
    }
    return fail(500, 'CHECK_FAILED', err.message || 'Failed to complete health checks.');
  }
});
