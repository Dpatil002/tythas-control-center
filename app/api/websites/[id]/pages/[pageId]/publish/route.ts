import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { getConnector } from '@/lib/connectors/registry';
import { decryptConnectorData } from '@/lib/connectors/crypto';
import { createNotification } from '@/lib/notifications/service';

export const POST = withHandler(async (req: Request, { params }: { params: { id: string; pageId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const website = await prisma.website.findUnique({
    where: { id: params.id },
    include: {
      credential: true,
    },
  });

  if (!website) {
    return fail(404, 'NOT_FOUND', 'Website not found');
  }

  // Capability & connection state check
  if (website.connectionState === 'AUDIT_ONLY' || website.connectionState === 'DISCONNECTED') {
    return fail(403, 'WRITE_NOT_PERMITTED', `Publishing is disabled: Website is in ${website.connectionState} mode. Direct editing requires a fully connected and verified connector.`);
  }

  const page = await prisma.page.findFirst({
    where: {
      id: params.pageId,
      websiteId: params.id,
    },
    include: {
      sections: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!page) {
    return fail(404, 'NOT_FOUND', 'Page not found');
  }

  // Decrypt credential if present
  let decryptedCred: any = undefined;
  if (website.credential?.encryptedData) {
    try {
      decryptedCred = decryptConnectorData(website.credential.encryptedData);
    } catch {}
  }

  const connector = getConnector(website.connectorType);
  const capabilities = await connector.getCapabilities(decryptedCred);

  if (!capabilities.includes('write:content')) {
    return fail(403, 'MISSING_CAPABILITY', 'This website connector does not have write:content capability enabled.');
  }

  // Parse sections
  const formattedSections = page.sections.map((s) => ({
    id: s.id,
    type: s.type,
    order: s.order,
    content: (() => {
      try {
        return typeof s.content === 'string' ? JSON.parse(s.content) : s.content;
      } catch {
        return s.content;
      }
    })(),
  }));

  // Fire connector write methods for real
  await connector.updatePageContent(website, page.id, formattedSections, decryptedCred);
  await connector.updatePageMetadata(website, page.id, { title: page.title, slug: page.slug }, decryptedCred);
  await connector.publishContent(website, 'page', page.id, decryptedCred);

  // Update page status in db
  const published = await prisma.page.update({
    where: { id: page.id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });

  // Log version snapshot on publish
  await prisma.pageVersion.create({
    data: {
      pageId: page.id,
      snapshot: JSON.stringify({
        title: page.title,
        slug: page.slug,
        sections: formattedSections,
        publishedAt: new Date().toISOString(),
      }),
      summary: 'Published to live website',
      createdBy: ctx.userId,
    },
  });

  // Fire in-app notification
  await createNotification({
    organizationId: website.organizationId,
    websiteId: website.id,
    type: 'PUBLISHING_COMPLETED',
    severity: 'SUCCESS',
    title: 'Page published',
    detail: `Page "${page.title}" (/${page.slug}) published successfully.`,
    linkPath: `/pages`,
  });

  return ok({
    success: true,
    page: published,
    publishedAt: published.publishedAt,
    message: `Page "${page.title}" (${page.slug}) published successfully.`,
  });
});
