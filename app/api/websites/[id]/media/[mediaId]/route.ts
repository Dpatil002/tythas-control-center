import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { getConnector } from '@/lib/connectors/registry';
import { decryptConnectorData } from '@/lib/connectors/crypto';
import { DecryptedCredential } from '@/lib/connectors/types';
import { z } from 'zod';

const UpdateMediaSchema = z.object({
  altText: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  folder: z.string().nullable().optional(),
});

export const GET = withHandler(async (req: Request, { params }: { params: { id: string; mediaId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const media = await prisma.media.findFirst({
    where: {
      id: params.mediaId,
      websiteId: params.id,
    },
  });

  if (!media) {
    return fail(404, 'NOT_FOUND', 'Media item not found');
  }

  return ok({ media });
});

export const PATCH = withHandler(async (req: Request, { params }: { params: { id: string; mediaId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const body = await req.json();
  const input = UpdateMediaSchema.parse(body);

  const existing = await prisma.media.findFirst({
    where: {
      id: params.mediaId,
      websiteId: params.id,
    },
  });

  if (!existing) {
    return fail(404, 'NOT_FOUND', 'Media item not found');
  }

  const updated = await prisma.media.update({
    where: { id: existing.id },
    data: input,
  });

  // Call connector updateMedia if connector credentials exist
  const website = await prisma.website.findUnique({
    where: { id: params.id },
    include: { credential: true },
  });

  if (website?.credential?.encryptedData) {
    try {
      const decrypted = decryptConnectorData<DecryptedCredential>(website.credential.encryptedData);
      const connector = getConnector(website.connectorType);
      await connector.updateMedia(
        website,
        existing.id,
        {
          altText: input.altText ?? existing.altText ?? undefined,
          caption: input.caption ?? existing.caption ?? undefined,
          title: input.title ?? existing.title ?? undefined,
        },
        decrypted
      );
    } catch {}
  }

  return ok({ media: updated });
});

export const DELETE = withHandler(async (req: Request, { params }: { params: { id: string; mediaId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const existing = await prisma.media.findFirst({
    where: {
      id: params.mediaId,
      websiteId: params.id,
    },
  });

  if (!existing) {
    return fail(404, 'NOT_FOUND', 'Media item not found');
  }

  // Reference checks
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === 'true';

  if (!force) {
    const pageUsageCount = await prisma.page.count({
      where: { websiteId: params.id, socialImageMediaId: existing.id },
    });
    const postUsageCount = await prisma.blogPost.count({
      where: { websiteId: params.id, socialImageMediaId: existing.id },
    });
    const authorUsageCount = await prisma.author.count({
      where: { websiteId: params.id, photoMediaId: existing.id },
    });

    const totalUsage = pageUsageCount + postUsageCount + authorUsageCount;
    if (totalUsage > 0) {
      return fail(409, 'MEDIA_IN_USE', `This media is currently referenced by ${totalUsage} page(s)/post(s)/author(s). Pass ?force=true to delete anyway.`);
    }
  }

  await prisma.media.delete({
    where: { id: existing.id },
  });

  return ok({ deleted: true, id: existing.id });
});
