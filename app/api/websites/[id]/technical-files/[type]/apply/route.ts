import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { getConnector } from '@/lib/connectors/registry';
import { decryptConnectorData } from '@/lib/connectors/crypto';
import { DecryptedCredential } from '@/lib/connectors/types';
import { z } from 'zod';

const ApplySchema = z.object({
  content: z.string(),
  mode: z.enum(['safe', 'advanced']).default('safe')
});

export const POST = withHandler(async (req: Request, { params }: { params: { id: string; type: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const fileType = params.type.toUpperCase();
  if (fileType !== 'ROBOTS_TXT' && fileType !== 'LLMS_TXT') {
    return fail(400, 'INVALID_FILE_TYPE', 'Only ROBOTS_TXT and LLMS_TXT can be applied.');
  }

  const body = await req.json();
  const input = ApplySchema.parse(body);

  // Save to DB
  const file = await prisma.technicalFile.upsert({
    where: {
      websiteId_type: {
        websiteId: params.id,
        type: fileType
      }
    },
    update: {
      content: input.content,
      mode: input.mode,
      updatedBy: ctx.email
    },
    create: {
      websiteId: params.id,
      type: fileType,
      content: input.content,
      mode: input.mode,
      updatedBy: ctx.email
    }
  });

  let publishedToConnector = false;
  const website = await prisma.website.findUnique({
    where: { id: params.id },
    include: { credential: true }
  });

  if (website && website.connectorType !== 'UNCONNECTED' && fileType === 'ROBOTS_TXT') {
    const connector = getConnector(website.connectorType);
    let credential: DecryptedCredential | undefined;
    if (website.credential) {
      credential = decryptConnectorData<DecryptedCredential>(website.credential.encryptedData);
    }
    const caps = await connector.getCapabilities(credential || undefined);
    if (caps.includes('write:seo')) {
      await connector.publishRobotsTxt(website.domain, input.content, credential || undefined);
      publishedToConnector = true;
    }
  }

  return ok({
    file,
    applied: true,
    publishedToConnector
  });
});
