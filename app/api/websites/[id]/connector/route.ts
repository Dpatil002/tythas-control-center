import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireRole, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { ok, created } from '@/lib/http/respond';
import { ValidationError, ForbiddenError } from '@/lib/http/errors';
import { encryptConnectorData, decryptConnectorData } from '@/lib/connectors/crypto';
import { getConnector } from '@/lib/connectors/registry';
import { DecryptedCredential } from '@/lib/connectors/types';

export const POST = withHandler(async (req, { params }) => {
  const ctx = await requireOrgContext(req);
  requireRole(ctx, 'OWNER');

  const website = await requireWebsiteAccess(ctx, params.id);
  const fullWebsite = await db.website.findUnique({
    where: { id: website.id },
  });

  if (!fullWebsite) {
    throw new ValidationError('Website not found.');
  }

  // Enforce server-side rule: website MUST be verified before it can reach CONNECTED or attach credentials
  if (!fullWebsite.ownershipVerifiedAt) {
    throw new ForbiddenError(
      'Website ownership must be verified before establishing a connector integration.'
    );
  }

  const body = await req.json();
  const { connectorType, username, applicationPassword, sharedSecret, apiEndpoint } = body;

  if (!['WORDPRESS', 'CUSTOM'].includes(connectorType)) {
    throw new ValidationError('connectorType must be WORDPRESS or CUSTOM.');
  }

  const credentialPayload: DecryptedCredential = {
    type: connectorType,
    username: username?.trim(),
    applicationPassword: applicationPassword?.trim(),
    sharedSecret: sharedSecret?.trim(),
    apiEndpoint: apiEndpoint?.trim() || `https://${website.domain}`,
  };

  // Encrypt credential blob at rest
  const encryptedBlob = encryptConnectorData(credentialPayload);

  // Probe capabilities through the connector
  const connector = getConnector(connectorType);
  const capabilities = await connector.getCapabilities(credentialPayload);

  // Determine state based on actual capabilities returned
  const hasWriteCapability = capabilities.includes('write:content');
  const targetState = hasWriteCapability ? 'CONNECTED' : 'AUDIT_ONLY';

  // Save or update credential in database
  await db.connectorCredential.upsert({
    where: { websiteId: website.id },
    create: {
      websiteId: website.id,
      connectorType,
      encryptedData: encryptedBlob,
      scopes: JSON.stringify(capabilities),
    },
    update: {
      connectorType,
      encryptedData: encryptedBlob,
      scopes: JSON.stringify(capabilities),
    },
  });

  // Update website record
  const updatedWebsite = await db.website.update({
    where: { id: website.id },
    data: {
      connectorType,
      connectionState: targetState,
    },
  });

  return created({
    website: {
      id: updatedWebsite.id,
      name: updatedWebsite.name,
      domain: updatedWebsite.domain,
      connectorType: updatedWebsite.connectorType,
      connectionState: updatedWebsite.connectionState,
    },
    capabilities,
    message: hasWriteCapability
      ? 'Connector established successfully. Editing features will unlock in Phase 3.'
      : 'Connector configured in Audit Only mode (write capabilities not detected).',
  });
});

export const DELETE = withHandler(async (req, { params }) => {
  const ctx = await requireOrgContext(req);
  requireRole(ctx, 'OWNER');

  const website = await requireWebsiteAccess(ctx, params.id);

  // Delete credential if exists
  await db.connectorCredential.deleteMany({
    where: { websiteId: website.id },
  });

  // Revert website connection state
  await db.website.update({
    where: { id: website.id },
    data: {
      connectorType: 'UNCONNECTED',
      connectionState: 'DISCONNECTED',
    },
  });

  return ok({
    disconnected: true,
    message: 'Website connector disconnected successfully.',
  });
});
