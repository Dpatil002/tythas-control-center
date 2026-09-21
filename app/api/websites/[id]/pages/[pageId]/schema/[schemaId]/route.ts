import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { NotFoundError } from '@/lib/http/errors';
import { generateJsonLd } from '@/lib/schema/generate';
import { validateSchema } from '@/lib/schema/validate';
import { SchemaType } from '@/lib/schema/types';
import { z } from 'zod';

const SchemaUpdateInput = z.object({
  type: z.string().optional(),
  data: z.record(z.any()).optional(),
  jsonLdOverride: z.record(z.any()).optional()
});

export const PATCH = withHandler(
  async (req: Request, { params }: { params: { id: string; pageId: string; schemaId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const existing = await prisma.pageSchema.findFirst({
      where: { id: params.schemaId, pageId: params.pageId, page: { websiteId: params.id } }
    });

    if (!existing) {
      throw new NotFoundError('Schema not found');
    }

    const body = await req.json();
    const input = SchemaUpdateInput.parse(body);

    const effectiveType = (input.type || existing.type) as SchemaType;
    const effectiveData = input.data || JSON.parse(existing.data || '{}');

    if (input.data && !input.jsonLdOverride) {
      const validation = validateSchema(effectiveType, effectiveData);
      if (!validation.valid) {
        return fail(400, 'SCHEMA_VALIDATION_ERROR', validation.errors.join(' '));
      }
    }

    const generatedJsonLd = input.jsonLdOverride || generateJsonLd(effectiveType, effectiveData);

    const updated = await prisma.pageSchema.update({
      where: { id: params.schemaId },
      data: {
        type: effectiveType,
        data: JSON.stringify(effectiveData),
        jsonLd: JSON.stringify(generatedJsonLd)
      }
    });

    return ok({
      schema: {
        ...updated,
        data: effectiveData,
        jsonLd: generatedJsonLd
      }
    });
  }
);

export const DELETE = withHandler(
  async (req: Request, { params }: { params: { id: string; pageId: string; schemaId: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const existing = await prisma.pageSchema.findFirst({
      where: { id: params.schemaId, pageId: params.pageId, page: { websiteId: params.id } }
    });

    if (!existing) {
      throw new NotFoundError('Schema not found');
    }

    await prisma.pageSchema.delete({
      where: { id: params.schemaId }
    });

    return ok({ success: true });
  }
);
