import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { syncWebsiteScripts } from '@/lib/integrations/custom-scripts';
import { z } from 'zod';

const CreateCustomScriptSchema = z.object({
  name: z.string().min(1, 'Script name is required'),
  scope: z.enum(['SITE', 'PAGE', 'BLOG']),
  pageId: z.string().optional().nullable(),
  placement: z.enum(['HEAD', 'BODY', 'FOOTER']),
  code: z.string().min(1, 'Script code is required'),
  status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE'),
});

export const GET = withHandler<{ id: string }>(
  async (req: Request, context: { params: { id: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, context.params.id);

    const scripts = await db.customScript.findMany({
      where: { websiteId: context.params.id },
      include: {
        page: {
          select: { id: true, title: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pages = await db.page.findMany({
      where: { websiteId: context.params.id },
      select: { id: true, title: true, slug: true },
      orderBy: { title: 'asc' },
    });

    return ok({ scripts, pages });
  }
);

export const POST = withHandler<{ id: string }>(
  async (req: Request, context: { params: { id: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, context.params.id);

    const body = await req.json();
    const input = CreateCustomScriptSchema.parse(body);

    let targetPageId: string | null = null;
    if (input.scope === 'PAGE') {
      if (!input.pageId) {
        return fail(400, 'PAGE_REQUIRED', 'pageId is required when scope is PAGE');
      }
      // Ensure pageId belongs to the current website (404 on failure for tenant isolation)
      const page = await db.page.findFirst({
        where: {
          id: input.pageId,
          websiteId: context.params.id,
        },
      });
      if (!page) {
        return fail(404, 'NOT_FOUND', 'Page not found');
      }
      targetPageId = page.id;
    }

    const script = await db.customScript.create({
      data: {
        websiteId: context.params.id,
        name: input.name,
        scope: input.scope,
        pageId: targetPageId,
        placement: input.placement,
        code: input.code,
        status: input.status,
        createdBy: ctx.userId,
      },
      include: {
        page: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    // Synchronize full active scripts list via connector
    await syncWebsiteScripts(context.params.id);

    return ok({ script, message: 'Custom script saved and synced successfully' });
  }
);
