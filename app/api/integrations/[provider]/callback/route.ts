import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { env } from '@/lib/env';
import { getIntegrationAdapter, isIntegrationProvider } from '@/lib/integrations/registry';
import { verifyOAuthState } from '@/lib/integrations/state';

// Static, provider-only callback path. Google/Meta require an exact-match
// "Authorized redirect URI" registered ahead of time in their developer
// consoles — a per-website path (the old /api/websites/[id]/integrations/...
// route) can't work here because there's no way to pre-register one URI
// per website. The website this callback is for travels safely inside the
// signed, single-use `state` parameter instead (see lib/integrations/state.ts),
// never in the URL path.
export const GET = withHandler<{ provider: string }>(
  async (req: Request, context: { params: { provider: string } }) => {
    const ctx = await requireOrgContext(req);

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
    if (!verifiedState || verifiedState.provider !== upperProvider) {
      return fail(400, 'INVALID_STATE', 'Invalid or expired OAuth state parameter. Please try connecting again.');
    }

    // Re-derive website access server-side from the verified state's websiteId
    // (never from a client-supplied URL segment) — same tenant-isolation rule
    // as every other route.
    const website = await requireWebsiteAccess(ctx, verifiedState.websiteId);

    const adapter = getIntegrationAdapter(upperProvider);
    const redirectUri = `${env.APP_ORIGIN}/api/integrations/${upperProvider}/callback`;

    try {
      const result = await adapter.handleOAuthCallback(website, code, redirectUri);
      return ok({
        accounts: result.accounts,
        tokens: result.tokens,
        provider: upperProvider,
        websiteId: verifiedState.websiteId,
      });
    } catch (err: any) {
      return fail(500, 'EXCHANGE_FAILED', err.message || 'Failed to exchange OAuth authorization code');
    }
  }
);
