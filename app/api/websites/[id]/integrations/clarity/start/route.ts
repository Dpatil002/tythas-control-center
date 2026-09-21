import { withHandler } from '@/lib/http/with-handler';
import { ok } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { ClarityIntegrationAdapter } from '@/lib/integrations/adapters/clarity';

const clarityAdapter = new ClarityIntegrationAdapter();

export const POST = withHandler(
  async (req: Request, { params }: { params: { id: string } }) => {
    const ctx = await requireOrgContext(req);
    const website = await requireWebsiteAccess(ctx, params.id);

    const projectId = clarityAdapter.getClarityProjectId(website);
    const snippet = clarityAdapter.getTrackingTagSnippet(website);

    return ok({
      projectId,
      snippet,
      instructions: [
        '1. Copy the tracking code snippet below.',
        '2. Paste it into the <head> section of your website (or add it using Custom Scripts in the Custom Scripts tab).',
        '3. Click "Verify Tag Installation" below to confirm.',
      ],
    });
  }
);
