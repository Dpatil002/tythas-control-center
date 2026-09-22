import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { env } from '@/lib/env';
import { getIntegrationAdapter, isIntegrationProvider } from '@/lib/integrations/registry';
import { generateOAuthState } from '@/lib/integrations/state';

export const GET = withHandler<{ id: string; provider: string }>(
  async (
    req: Request,
    context: { params: { id: string; provider: string } }
  ) => {
    const ctx = await requireOrgContext(req);
    const website = await requireWebsiteAccess(ctx, context.params.id);

    const upperProvider = context.params.provider.toUpperCase();
    if (!isIntegrationProvider(upperProvider)) {
      return fail(400, 'INVALID_PROVIDER', 'Invalid integration provider');
    }

    if (upperProvider === 'MS_CLARITY') {
      return fail(404, 'NOT_SUPPORTED', 'Microsoft Clarity does not use OAuth authentication.');
    }

    const adapter = getIntegrationAdapter(upperProvider);
    const state = generateOAuthState(context.params.id, upperProvider, ctx.userId);
    const redirectUri = `${env.APP_ORIGIN}/api/integrations/${upperProvider}/callback`;

    const authUrl = await adapter.getAuthUrl(website, redirectUri, state);
    if (!authUrl) {
      return fail(400, 'AUTH_URL_FAILED', 'Could not generate auth URL for provider');
    }

    return ok({ authUrl, state });
  }
);
