import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const ScheduleSchema = z.object({
  scheduledAt: z.string().min(1, 'Scheduled datetime is required'),
});

export const POST = withHandler(async (req: Request, { params }: { params: { id: string; postId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const body = await req.json();
  const input = ScheduleSchema.parse(body);

  const scheduleDate = new Date(input.scheduledAt);
  if (isNaN(scheduleDate.getTime())) {
    return fail(400, 'INVALID_DATE', 'Invalid scheduled date format');
  }

  const post = await prisma.blogPost.findFirst({
    where: {
      id: params.postId,
      websiteId: params.id,
    },
  });

  if (!post) {
    return fail(404, 'NOT_FOUND', 'Blog post not found');
  }

  const updated = await prisma.blogPost.update({
    where: { id: post.id },
    data: {
      status: 'SCHEDULED',
      scheduledAt: scheduleDate,
    },
  });

  return ok({
    success: true,
    post: updated,
    message: `Post scheduled for publication on ${scheduleDate.toLocaleString()}.`,
  });
});
