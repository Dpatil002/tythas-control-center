import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const UpdateAuthorSchema = z.object({
  name: z.string().min(1).optional(),
  roleLabel: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  photoMediaId: z.string().nullable().optional(),
  xUrl: z.string().nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
});

export const PATCH = withHandler(async (req: Request, { params }: { params: { id: string; authorId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const body = await req.json();
  const input = UpdateAuthorSchema.parse(body);

  const existing = await prisma.author.findFirst({
    where: {
      id: params.authorId,
      websiteId: params.id,
    },
  });

  if (!existing) {
    return fail(404, 'NOT_FOUND', 'Author not found');
  }

  const updated = await prisma.author.update({
    where: { id: existing.id },
    data: input,
  });

  return ok({ author: updated });
});

export const DELETE = withHandler(async (req: Request, { params }: { params: { id: string; authorId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const existing = await prisma.author.findFirst({
    where: {
      id: params.authorId,
      websiteId: params.id,
    },
    include: {
      _count: {
        select: { posts: true },
      },
    },
  });

  if (!existing) {
    return fail(404, 'NOT_FOUND', 'Author not found');
  }

  // Unlink posts before deleting author
  await prisma.blogPost.updateMany({
    where: { authorId: existing.id },
    data: { authorId: null },
  });

  await prisma.author.delete({
    where: { id: existing.id },
  });

  return ok({ deleted: true, id: existing.id });
});
