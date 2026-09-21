import { withHandler } from '@/lib/http/with-handler';
import { ok } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { ALL_INTEGRATION_PROVIDERS, IntegrationProvider } from '@/lib/integrations/types';

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const connections = await db.integrationConnection.findMany({
    where: { websiteId: params.id },
  });

  const connectionMap = new Map(connections.map((c) => [c.provider, c]));

  // Synthesize default NOT_CONNECTED for all providers
  const allProvidersList = ALL_INTEGRATION_PROVIDERS.map((provider) => {
    const existing = connectionMap.get(provider);
    if (existing) {
      return {
        id: existing.id,
        websiteId: params.id,
        provider: existing.provider as IntegrationProvider,
        status: existing.status,
        externalAccountId: existing.externalAccountId,
        externalAccountName: existing.externalAccountName,
        connectedAt: existing.connectedAt,
        lastSyncedAt: existing.lastSyncedAt,
        lastError: existing.lastError,
      };
    }
    return {
      id: `synthetic_${params.id}_${provider}`,
      websiteId: params.id,
      provider,
      status: 'NOT_CONNECTED',
      externalAccountId: null,
      externalAccountName: null,
      connectedAt: null,
      lastSyncedAt: null,
      lastError: null,
    };
  });

  return ok({ connections: allProvidersList });
});
