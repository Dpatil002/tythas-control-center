import { withHandler } from '@/lib/http/with-handler';
import { ok } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';

export const GET = withHandler(
  async (req: Request, { params }: { params: { id: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const reviews = await db.googleBusinessReview.findMany({
      where: { websiteId: params.id },
      orderBy: { postedAt: 'desc' },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
        : 0;

    return ok({
      reviews,
      stats: {
        totalReviews,
        averageRating,
      },
    });
  }
);
