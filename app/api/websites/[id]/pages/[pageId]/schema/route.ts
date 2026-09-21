import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { NotFoundError } from '@/lib/http/errors';
import { generateJsonLd } from '@/lib/schema/generate';
import { validateSchema } from '@/lib/schema/validate';
import { SchemaType } from '@/lib/schema/types';
import { z } from 'zod';

const SchemaUpsertInput = z.object({
  type: z.string(),
  data: z.record(z.any()),
  jsonLdOverride: z.record(z.any()).optional(),
  source: z.enum(['manual', 'auto_faq', 'auto_recommendation']).default('manual')
});

export const GET = withHandler(async (req: Request, { params }: { params: { id: string; pageId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const schemas = await prisma.pageSchema.findMany({
    where: { pageId: params.pageId, page: { websiteId: params.id } },
    orderBy: { createdAt: 'desc' }
  });

  return ok({
    schemas: schemas.map((s) => ({
      ...s,
      data: JSON.parse(s.data || '{}'),
      jsonLd: JSON.parse(s.jsonLd || '{}')
    }))
  });
});

export const POST = withHandler(async (req: Request, { params }: { params: { id: string; pageId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const page = await prisma.page.findFirst({
    where: { id: params.pageId, websiteId: params.id }
  });

  if (!page) {
    throw new NotFoundError('Page not found');
  }

  const body = await req.json();
  const input = SchemaUpsertInput.parse(body);

  const validation = validateSchema(input.type as SchemaType, input.data);
  if (!validation.valid && !input.jsonLdOverride) {
    return fail(400, 'SCHEMA_VALIDATION_ERROR', validation.errors.join(' '));
  }

  const generatedJsonLd = input.jsonLdOverride || generateJsonLd(input.type as SchemaType, input.data);

  const created = await prisma.pageSchema.create({
    data: {
      pageId: params.pageId,
      type: input.type,
      data: JSON.stringify(input.data),
      jsonLd: JSON.stringify(generatedJsonLd),
      source: input.source
    }
  });

  return ok({
    schema: {
      ...created,
      data: input.data,
      jsonLd: generatedJsonLd
    }
  });
});
