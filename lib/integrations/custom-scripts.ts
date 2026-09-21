import { db } from '@/lib/db/prisma';
import { getConnector } from '@/lib/connectors/registry';
import { decryptConnectorData } from '@/lib/connectors/crypto';
import { DecryptedCredential } from '@/lib/connectors/types';

export async function syncWebsiteScripts(websiteId: string) {
  const website = await db.website.findUnique({
    where: { id: websiteId },
    include: { credential: true },
  });
  if (!website) return;

  const activeScripts = await db.customScript.findMany({
    where: {
      websiteId,
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'asc' },
  });

  const connector = getConnector(website.connectorType);
  let decryptedCred: DecryptedCredential | undefined;
  if (website.credential) {
    try {
      decryptedCred = decryptConnectorData<DecryptedCredential>(website.credential.encryptedData);
    } catch {}
  }

  await connector.syncCustomScripts(
    website,
    activeScripts.map((s) => ({
      id: s.id,
      name: s.name,
      scope: s.scope,
      pageId: s.pageId,
      placement: s.placement,
      code: s.code,
      status: s.status,
    })),
    decryptedCred
  );
}
