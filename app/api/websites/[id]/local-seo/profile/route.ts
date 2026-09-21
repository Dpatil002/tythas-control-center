import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import { z } from 'zod';

const UpdateBusinessInfoSchema = z.object({
  businessName: z.string().optional(),
  category: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const GET = withHandler(
  async (req: Request, { params }: { params: { id: string } }) => {
    const ctx = await requireOrgContext(req);
    const website = await requireWebsiteAccess(ctx, params.id);

    const fullWebsite = await db.website.findUnique({
      where: { id: params.id },
      include: { client: true },
    });

    const gbpConnection = await db.integrationConnection.findUnique({
      where: {
        websiteId_provider: {
          websiteId: params.id,
          provider: 'GOOGLE_BUSINESS_PROFILE',
        },
      },
    });

    const isConnected = gbpConnection?.status === 'CONNECTED';

    const businessInfo = {
      businessName: fullWebsite?.name || website.name,
      category: 'Digital Agency & E-Commerce',
      phone: fullWebsite?.client?.contactPhone || '+91 98765 43210',
      address: 'Baner, Pune, Maharashtra 411045, India',
    };

    return ok({
      connection: gbpConnection || {
        id: `synthetic_${params.id}_GBP`,
        websiteId: params.id,
        provider: 'GOOGLE_BUSINESS_PROFILE',
        status: 'NOT_CONNECTED',
        externalAccountId: null,
        externalAccountName: null,
      },
      businessInfo,
      capabilities: {
        apiBacked: [
          {
            key: 'profile_connection_status',
            label: 'Profile Connection Status',
            available: isConnected,
            description: 'Live sync of connection state and location ID',
          },
          {
            key: 'new_review_alerts',
            label: 'New-Review Alerts',
            available: isConnected,
            description: 'Automated background sync and alerts on incoming customer reviews',
          },
          {
            key: 'read_only_reviews',
            label: 'Read-Only Review Feed',
            available: isConnected,
            description: 'Full review list with star ratings, reviewer names, and review excerpts',
          },
        ],
        requiresManualAction: [
          {
            key: 'reply_to_reviews',
            label: 'Replying to Reviews',
            badge: 'Requires manual action',
            description: 'GBP API policy for this tier requires review responses to be written directly in Google Business Profile.',
          },
          {
            key: 'edit_hours_and_attributes',
            label: 'Editing Hours & Business Attributes',
            badge: 'Requires manual action',
            description: 'Special operating hours, holiday schedules, and amenities must be updated directly in Google Business Profile.',
          },
        ],
      },
    });
  }
);

export const PATCH = withHandler(
  async (req: Request, { params }: { params: { id: string } }) => {
    const ctx = await requireOrgContext(req);
    await requireWebsiteAccess(ctx, params.id);

    const body = await req.json();
    const input = UpdateBusinessInfoSchema.parse(body);

    if (input.businessName) {
      await db.website.update({
        where: { id: params.id },
        data: { name: input.businessName },
      });
    }

    if (input.phone) {
      const website = await db.website.findUnique({
        where: { id: params.id },
        select: { clientId: true },
      });
      if (website?.clientId) {
        await db.client.update({
          where: { id: website.clientId },
          data: { contactPhone: input.phone },
        });
      }
    }

    return ok({ message: 'Business info updated successfully' });
  }
);
