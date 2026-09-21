import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';

export const POST = withHandler(async (req: Request, { params }: { params: { id: string; pageId: string; vId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const page = await prisma.page.findFirst({
    where: {
      id: params.pageId,
      websiteId: params.id,
    },
  });

  if (!page) {
    return fail(404, 'NOT_FOUND', 'Page not found');
  }

  const version = await prisma.pageVersion.findFirst({
    where: {
      id: params.vId,
      pageId: page.id,
    },
  });

  if (!version) {
    return fail(404, 'NOT_FOUND', 'Version not found');
  }

  let snapshotData: any;
  try {
    snapshotData = typeof version.snapshot === 'string' ? JSON.parse(version.snapshot) : version.snapshot;
  } catch {
    return fail(400, 'INVALID_SNAPSHOT', 'Could not parse version snapshot data');
  }

  // Restore snapshot into page and page sections
  await prisma.$transaction(async (tx) => {
    if (snapshotData.sections && Array.isArray(snapshotData.sections)) {
      await tx.pageSection.deleteMany({
        where: { pageId: page.id },
      });

      await tx.pageSection.createMany({
        data: snapshotData.sections.map((s: any, idx: number) => ({
          pageId: page.id,
          type: s.type,
          order: s.order ?? idx,
          content: JSON.stringify(s.content || {}),
        })),
      });
    }

    await tx.page.update({
      where: { id: page.id },
      data: {
        title: snapshotData.title || page.title,
        slug: snapshotData.slug || page.slug,
        status: 'DRAFT', // restored version reverts to draft until published
      },
    });

    // Record a restore version log
    await tx.pageVersion.create({
      data: {
        pageId: page.id,
        snapshot: JSON.stringify(snapshotData),
        summary: `Restored to version from ${new Date(version.createdAt).toLocaleString()}`,
        createdBy: ctx.userId,
      },
    });
  });

  const updatedPage = await prisma.page.findUnique({
    where: { id: page.id },
    include: {
      sections: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return ok({
    success: true,
    page: updatedPage,
    message: `Restored page to version from ${new Date(version.createdAt).toLocaleString()}`,
  });
});
