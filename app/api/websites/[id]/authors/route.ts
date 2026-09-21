import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const CreateAuthorSchema = z.object({
  name: z.string().min(1, 'Author name is required'),
  roleLabel: z.string().optional(),
  bio: z.string().optional(),
  photoMediaId: z.string().nullable().optional(),
  xUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
});

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const authors = await prisma.author.findMany({
    where: { websiteId: params.id },
    include: {
      _count: {
        select: { posts: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok({ authors, total: authors.length });
});

export const POST = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const body = await req.json();
  const input = CreateAuthorSchema.parse(body);

  const author = await prisma.author.create({
    data: {
      websiteId: params.id,
      name: input.name,
      roleLabel: input.roleLabel || null,
      bio: input.bio || null,
      photoMediaId: input.photoMediaId || null,
      xUrl: input.xUrl || null,
      instagramUrl: input.instagramUrl || null,
      linkedinUrl: input.linkedinUrl || null,
    },
  });

  return ok({ author });
});
