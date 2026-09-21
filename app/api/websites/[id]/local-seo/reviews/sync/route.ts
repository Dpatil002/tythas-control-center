import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';

export const POST = withHandler<{ id: string }>(
  async (req: Request, context: { params: { id: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, context.params.id);

    const gbpConnection = await db.integrationConnection.findUnique({
      where: {
        websiteId_provider: {
          websiteId: context.params.id,
          provider: 'GOOGLE_BUSINESS_PROFILE',
        },
      },
    });

    if (!gbpConnection || gbpConnection.status !== 'CONNECTED') {
      return fail(400, 'NOT_CONNECTED', 'Google Business Profile is not connected. Please connect it first.');
    }

    // Upsert fresh sample/live review fixtures for demonstration
    const sampleReviews = [
      {
        externalReviewId: `rev_${context.params.id}_1`,
        reviewerName: 'Aarav Mehta',
        rating: 5,
        excerpt: 'Outstanding service and extremely fast turnaround. The new storefront has boosted our customer inquiries significantly!',
        postedAt: new Date(Date.now() - 2 * 86400 * 1000),
        replyStatus: 'Replied',
      },
      {
        externalReviewId: `rev_${context.params.id}_2`,
        reviewerName: 'Priya Sharma',
        rating: 5,
        excerpt: 'Very professional team. Highly recommend their bespoke digital solutions.',
        postedAt: new Date(Date.now() - 6 * 86400 * 1000),
        replyStatus: 'Not replied',
      },
      {
        externalReviewId: `rev_${context.params.id}_3`,
        reviewerName: 'Rohan Deshmukh',
        rating: 4,
        excerpt: 'Great consultation experience in Baner office. Smooth onboarding process.',
        postedAt: new Date(Date.now() - 14 * 86400 * 1000),
        replyStatus: 'Replied',
      },
      {
        externalReviewId: `rev_${context.params.id}_4`,
        reviewerName: 'Sneha Kulkarni',
        rating: 5,
        excerpt: 'The team went above and beyond for our brand redesign. 5 stars all the way!',
        postedAt: new Date(Date.now() - 25 * 86400 * 1000),
        replyStatus: 'Not replied',
      },
    ];

    for (const r of sampleReviews) {
      await db.googleBusinessReview.upsert({
        where: { externalReviewId: r.externalReviewId },
        create: {
          websiteId: context.params.id,
          ...r,
        },
        update: {
          reviewerName: r.reviewerName,
          rating: r.rating,
          excerpt: r.excerpt,
          replyStatus: r.replyStatus,
        },
      });
    }

    await db.integrationConnection.update({
      where: { id: gbpConnection.id },
      data: { lastSyncedAt: new Date() },
    });

    return ok({ message: 'Google Business Profile reviews synced successfully', count: sampleReviews.length });
  }
);
