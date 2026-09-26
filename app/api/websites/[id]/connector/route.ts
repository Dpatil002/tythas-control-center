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
  const { connectorType, username, applicationPassword, sharedSecret, apiEndpoint, testMode } = body;

  if (!['WORDPRESS', 'CUSTOM'].includes(connectorType)) {
    throw new ValidationError('connectorType must be WORDPRESS or CUSTOM.');
  }

  // Test/Demo Mode: an explicit, user-opted-in shortcut (CUSTOM connector only) that unlocks the
  // full editor and Publish workflow for internal testing without probing a real backend. We only
  // take this branch when the user has ticked the "Test / Demo Mode" checkbox in Settings, so a
  // blank "Custom API Endpoint" field still means "use the registered domain" as documented in the
  // UI, exactly as before, for anyone who is NOT using test mode.
  const isCustomTestMode = connectorType === 'CUSTOM' && testMode === true;

  const credentialPayload: DecryptedCredential = {
    type: connectorType,
    username: username?.trim(),
    applicationPassword: applicationPassword?.trim(),
    sharedSecret: sharedSecret?.trim(),
    apiEndpoint: isCustomTestMode ? '' : apiEndpoint?.trim() || `https://${website.domain}`,
  };

  // Encrypt credential blob at rest
  const encryptedBlob = encryptConnectorData(credentialPayload);

  // Probe capabilities through the connector. In Test/Demo Mode we skip the network probe
  // entirely and go straight to the CUSTOM connector's built-in "no endpoint" shortcut, which
  // returns the full write-capability set immediately (see lib/connectors/custom.ts).
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
    message: isCustomTestMode
      ? 'Test/Demo Mode enabled. Editing and Publish are unlocked for internal testing; nothing is sent to a live site.'
      : hasWriteCapability
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
