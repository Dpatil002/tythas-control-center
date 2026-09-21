import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { ClarityIntegrationAdapter } from '@/lib/integrations/adapters/clarity';

const clarityAdapter = new ClarityIntegrationAdapter();

export const POST = withHandler<{ id: string }>(
  async (req: Request, context: { params: { id: string } }) => {
    const ctx = await requireOrgContext(req);
    const website = await requireWebsiteAccess(ctx, context.params.id);

    const result = await clarityAdapter.verifyTagInstallation(website);

    if (!result.verified) {
      return fail(422, 'TAG_NOT_FOUND', result.message);
    }

    return ok({
      verified: true,
      message: result.message,
    });
  }
);
