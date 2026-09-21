import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { getIntegrationAdapter, isIntegrationProvider } from '@/lib/integrations/registry';

export const DELETE = withHandler<{ id: string; provider: string }>(
  async (
    req: Request,
    context: { params: { id: string; provider: string } }
  ) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, context.params.id);

    const upperProvider = context.params.provider.toUpperCase();
    if (!isIntegrationProvider(upperProvider)) {
      return fail(400, 'INVALID_PROVIDER', 'Invalid integration provider');
    }

    const connection = await db.integrationConnection.findUnique({
      where: {
        websiteId_provider: {
          websiteId: context.params.id,
          provider: upperProvider,
        },
      },
    });

    if (!connection) {
      return ok({ message: 'Provider is not connected' });
    }

    // Check how many conversion event mappings are attached
    const activeMappingsCount = await db.conversionEventMapping.count({
      where: {
        provider: upperProvider,
        conversionEvent: {
          websiteId: context.params.id,
        },
      },
    });

    const adapter = getIntegrationAdapter(upperProvider);
    await adapter.disconnect(connection);

    return ok({
      message: `Successfully disconnected ${upperProvider}`,
      activeMappingsCount,
    });
  }
);
