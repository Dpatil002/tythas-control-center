import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { syncWebsiteScripts } from '@/lib/integrations/custom-scripts';
import { z } from 'zod';

const UpdateCustomScriptSchema = z.object({
  name: z.string().min(1).optional(),
  scope: z.enum(['SITE', 'PAGE', 'BLOG']).optional(),
  pageId: z.string().optional().nullable(),
  placement: z.enum(['HEAD', 'BODY', 'FOOTER']).optional(),
  code: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
});

export const PATCH = withHandler<{ id: string; scriptId: string }>(
  async (
    req: Request,
    context: { params: { id: string; scriptId: string } }
  ) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, context.params.id);

    const existing = await db.customScript.findFirst({
      where: {
        id: context.params.scriptId,
        websiteId: context.params.id,
      },
    });

    if (!existing) {
      return fail(404, 'NOT_FOUND', 'Custom script not found');
    }

    const body = await req.json();
    const input = UpdateCustomScriptSchema.parse(body);

    const nextScope = input.scope || existing.scope;
    let targetPageId = existing.pageId;

    if (nextScope === 'PAGE') {
      const candidatePageId = input.pageId !== undefined ? input.pageId : existing.pageId;
      if (!candidatePageId) {
        return fail(400, 'PAGE_REQUIRED', 'pageId is required when scope is PAGE');
      }
      const page = await db.page.findFirst({
        where: {
          id: candidatePageId,
          websiteId: context.params.id,
        },
      });
      if (!page) {
        return fail(404, 'NOT_FOUND', 'Page not found');
      }
      targetPageId = page.id;
    } else {
      targetPageId = null;
    }

    const updated = await db.customScript.update({
      where: { id: existing.id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.scope ? { scope: input.scope } : {}),
        pageId: targetPageId,
        ...(input.placement ? { placement: input.placement } : {}),
        ...(input.code ? { code: input.code } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      include: {
        page: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    // Sync full active list
    await syncWebsiteScripts(context.params.id);

    return ok({ script: updated, message: 'Custom script updated and synced' });
  }
);

export const DELETE = withHandler<{ id: string; scriptId: string }>(
  async (
    req: Request,
    context: { params: { id: string; scriptId: string } }
  ) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, context.params.id);

    const existing = await db.customScript.findFirst({
      where: {
        id: context.params.scriptId,
        websiteId: context.params.id,
      },
    });

    if (!existing) {
      return fail(404, 'NOT_FOUND', 'Custom script not found');
    }

    await db.customScript.delete({
      where: { id: existing.id },
    });

    // Sync full active list
    await syncWebsiteScripts(context.params.id);

    return ok({ message: 'Custom script deleted and removed from synced code' });
  }
);
