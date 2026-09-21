import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { getConnector } from '@/lib/connectors/registry';
import { decryptConnectorData } from '@/lib/connectors/crypto';
import { DecryptedCredential } from '@/lib/connectors/types';

export const POST = withHandler(
  async (req: Request, { params }: { params: { id: string; formId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const form = await db.form.findFirst({
      where: { id: params.formId, websiteId: params.id },
      include: {
        fields: { orderBy: { order: 'asc' } },
        actions: { orderBy: { order: 'asc' } },
      },
    });

    if (!form) {
      return fail(404, 'NOT_FOUND', 'Form not found.');
    }

    const website = await db.website.findUnique({
      where: { id: params.id },
      include: { credential: true },
    });

    if (!website) {
      return fail(404, 'NOT_FOUND', 'Website not found.');
    }

    let credential: DecryptedCredential | undefined;
    if (website.credential) {
      credential = decryptConnectorData<DecryptedCredential>(website.credential.encryptedData);
    }

    const connector = getConnector(website.connectorType);
    const deployResult = await connector.deployForm(website.domain, form as any, credential);

    if (deployResult.deployed) {
      await db.form.update({
        where: { id: form.id },
        data: { status: 'DEPLOYED' },
      });
    }

    return ok({
      deployed: deployResult.deployed,
      embedSnippet: deployResult.embedSnippet,
      formStatus: deployResult.deployed ? 'DEPLOYED' : 'DRAFT',
    });
  }
);
