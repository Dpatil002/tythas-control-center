import { withHandler } from '@/lib/http/with-handler';
import { ok } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { validateSchema } from '@/lib/schema/validate';
import { generateJsonLd } from '@/lib/schema/generate';
import { SchemaType } from '@/lib/schema/types';
import { z } from 'zod';

const ValidatePayloadSchema = z.object({
  type: z.string(),
  data: z.record(z.any())
});

export const POST = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const body = await req.json();
  const parsed = ValidatePayloadSchema.parse(body);

  const result = validateSchema(parsed.type as SchemaType, parsed.data);
  let jsonLd: Record<string, any> | null = null;

  try {
    jsonLd = generateJsonLd(parsed.type as SchemaType, parsed.data);
  } catch {}

  return ok({
    valid: result.valid,
    errors: result.errors,
    jsonLd
  });
});
