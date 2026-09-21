import { withHandler } from '@/lib/http/with-handler';
import { ok } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { generateWebsiteSitemap } from '@/lib/seo/sitemap';
import { getConnector } from '@/lib/connectors/registry';
import { decryptConnectorData } from '@/lib/connectors/crypto';
import { DecryptedCredential } from '@/lib/connectors/types';
import { prisma } from '@/lib/db/prisma';

export const POST = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  const websiteAccess = await requireWebsiteAccess(ctx, params.id);

  const result = await generateWebsiteSitemap(params.id);

  // Check if connector has write:seo capability to publish
  let publishedToConnector = false;
  const website = await prisma.website.findUnique({
    where: { id: params.id },
    include: { credential: true }
  });

  if (website && website.connectorType !== 'UNCONNECTED') {
    const connector = getConnector(website.connectorType);
    let credential: DecryptedCredential | undefined;
    if (website.credential) {
      credential = decryptConnectorData<DecryptedCredential>(website.credential.encryptedData);
    }
    const caps = await connector.getCapabilities(credential || undefined);
    if (caps.includes('write:seo')) {
      const urlList = result.urls.map((u) => u.loc);
      await connector.publishSitemap(website.domain, urlList, credential || undefined);
      publishedToConnector = true;
    }
  }

  return ok({
    success: true,
    urlCount: result.urlCount,
    xml: result.xml,
    sitemapRunId: result.sitemapRunId,
    publishedToConnector
  });
});
