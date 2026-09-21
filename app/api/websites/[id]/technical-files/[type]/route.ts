import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const ValidFileTypes = ['ROBOTS_TXT', 'LLMS_TXT'] as const;

const SaveTechnicalFileSchema = z.object({
  content: z.string(),
  mode: z.enum(['safe', 'advanced']).default('safe')
});

export const GET = withHandler(async (req: Request, { params }: { params: { id: string; type: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const fileType = params.type.toUpperCase();
  if (!ValidFileTypes.includes(fileType as any)) {
    return fail(400, 'INVALID_FILE_TYPE', `Valid types are: ${ValidFileTypes.join(', ')}`);
  }

  const file = await prisma.technicalFile.findUnique({
    where: {
      websiteId_type: {
        websiteId: params.id,
        type: fileType
      }
    }
  });

  const defaultRobotsTxt = `User-agent: *\nAllow: /\nDisallow: /wp-admin/\nDisallow: /api/\n\nSitemap: https://example.com/sitemap.xml`;
  const defaultLlmsTxt = `# Information for AI Assistants\n\n- Website: Tythas Managed Site\n- Primary Topics: Services, products, and insights.\n- Index: See sitemap.xml for complete structure.`;

  return ok({
    file: file || {
      websiteId: params.id,
      type: fileType,
      content: fileType === 'ROBOTS_TXT' ? defaultRobotsTxt : defaultLlmsTxt,
      mode: 'safe',
      updatedAt: null,
      updatedBy: null
    }
  });
});

export const PUT = withHandler(async (req: Request, { params }: { params: { id: string; type: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const fileType = params.type.toUpperCase();
  if (!ValidFileTypes.includes(fileType as any)) {
    return fail(400, 'INVALID_FILE_TYPE', `Valid types are: ${ValidFileTypes.join(', ')}`);
  }

  const body = await req.json();
  const input = SaveTechnicalFileSchema.parse(body);

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

  return ok({ file });
});
