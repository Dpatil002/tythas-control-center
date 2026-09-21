import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { ok } from '@/lib/http/respond';
import { decryptConnectorData } from '@/lib/connectors/crypto';
import { getConnector } from '@/lib/connectors/registry';
import { DecryptedCredential } from '@/lib/connectors/types';

export const GET = withHandler(async (req, { params }) => {
  const ctx = await requireOrgContext(req);
  const website = await requireWebsiteAccess(ctx, params.id);

  const fullWebsite = await db.website.findUnique({
    where: { id: website.id },
    include: { credential: true },
  });

  if (!fullWebsite) {
    return ok({ capabilities: [] });
  }

  let decrypted: DecryptedCredential | undefined = undefined;
  if (fullWebsite.credential?.encryptedData) {
    try {
      decrypted = decryptConnectorData<DecryptedCredential>(fullWebsite.credential.encryptedData);
    } catch {
      // ignore decryption failure
    }
  }

  const connector = getConnector(fullWebsite.connectorType);
  const capabilities = await connector.getCapabilities(decrypted);

  return ok({
    connectorType: fullWebsite.connectorType,
    connectionState: fullWebsite.connectionState,
    ownershipVerified: !!fullWebsite.ownershipVerifiedAt,
    capabilities,
  });
});
