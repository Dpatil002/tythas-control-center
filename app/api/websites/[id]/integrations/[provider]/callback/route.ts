import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { env } from '@/lib/env';
import { getIntegrationAdapter, isIntegrationProvider } from '@/lib/integrations/registry';
import { verifyOAuthState } from '@/lib/integrations/state';

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

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return fail(400, 'OAUTH_DENIED', `OAuth authorization was denied or failed: ${error}`);
    }

    if (!code || !state) {
      return fail(400, 'INVALID_CALLBACK', 'Missing code or state parameter in OAuth callback');
    }

    const verifiedState = verifyOAuthState(state);
    if (
      !verifiedState ||
      verifiedState.websiteId !== context.params.id ||
      verifiedState.provider !== upperProvider
    ) {
      return fail(400, 'INVALID_STATE', 'Invalid or expired OAuth state parameter. Please try connecting again.');
    }

    const adapter = getIntegrationAdapter(upperProvider);
    const redirectUri = `${env.APP_ORIGIN}/api/websites/${context.params.id}/integrations/${upperProvider}/callback`;

    try {
      const result = await adapter.handleOAuthCallback(website, code, redirectUri);
      return ok({
        accounts: result.accounts,
        tokens: result.tokens,
        provider: upperProvider,
      });
    } catch (err: any) {
      return fail(500, 'EXCHANGE_FAILED', err.message || 'Failed to exchange OAuth authorization code');
    }
  }
);
