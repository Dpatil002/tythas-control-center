import crypto from 'crypto';
import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { ok, created } from '@/lib/http/respond';
import { ValidationError } from '@/lib/http/errors';

export const GET = withHandler(async (req, { params }) => {
  const ctx = await requireOrgContext(req);
  const website = await requireWebsiteAccess(ctx, params.id);

  const verifications = await db.ownershipVerification.findMany({
    where: { websiteId: website.id },
    orderBy: { createdAt: 'desc' },
  });

  return ok({ verifications });
});

export const POST = withHandler(async (req, { params }) => {
  const ctx = await requireOrgContext(req);
  const website = await requireWebsiteAccess(ctx, params.id);
  const body = await req.json();

  const validMethods = ['DNS_TXT', 'FILE_UPLOAD', 'META_TAG', 'CONNECTOR'];
  const method = body.method;

  if (!method || !validMethods.includes(method)) {
    throw new ValidationError('Invalid verification method. Supported: DNS_TXT, FILE_UPLOAD, META_TAG, CONNECTOR');
  }

  // Generate a random token
  const token = crypto.randomBytes(16).toString('hex');

  const verification = await db.ownershipVerification.create({
    data: {
      websiteId: website.id,
      method,
      token,
      status: 'PENDING',
    },
  });

  let instructions = '';
  let snippet = '';

  if (method === 'DNS_TXT') {
    instructions = `Add a TXT record to your domain's DNS settings at ${website.domain} with the name @ (or ${website.domain}) and value:`;
    snippet = `tythas-site-verification=${token}`;
  } else if (method === 'FILE_UPLOAD') {
    instructions = `Create a plain text file named tythas-verify-${token}.txt in your website's root directory containing the token:`;
    snippet = token;
  } else if (method === 'META_TAG') {
    instructions = `Add the following meta tag inside the <head> section of your website's homepage (${website.domain}):`;
    snippet = `<meta name="tythas-site-verification" content="${token}">`;
  } else if (method === 'CONNECTOR') {
    instructions = 'Verify ownership via active WordPress or Custom companion connector.';
    snippet = token;
  }

  return created({
    verification: {
      id: verification.id,
      method: verification.method,
      token: verification.token,
      status: verification.status,
      createdAt: verification.createdAt,
      instructions,
      snippet,
    },
  });
});
