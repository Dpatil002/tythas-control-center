import { db } from '@/lib/db/prisma';

export type NotificationType =
  | 'NEW_LEAD'
  | 'WEBSITE_CONNECTION_ERROR'
  | 'WEBSITE_DOWN'
  | 'SSL_EXPIRY_WARNING'
  | 'SEO_AUDIT_COMPLETED'
  | 'NEW_SEO_ISSUE'
  | 'INTEGRATION_DISCONNECTED'
  | 'PUBLISHING_COMPLETED'
  | 'FORM_ERROR'
  | 'USER_INVITATION_STATUS_CHANGED';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export interface CreateNotificationParams {
  organizationId: string;
  websiteId?: string | null;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  detail: string;
  linkPath?: string | null;
}

// Critical notification types that cannot be disabled
export const ALWAYS_ENABLED_TYPES: NotificationType[] = [
  'WEBSITE_DOWN',
  'WEBSITE_CONNECTION_ERROR',
  'INTEGRATION_DISCONNECTED',
];

/**
 * Creates a notification record in the database.
 * If website-scoped or org-scoped, creates the notification row.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await db.notification.create({
      data: {
        organizationId: params.organizationId,
        websiteId: params.websiteId || null,
        type: params.type,
        severity: params.severity,
        title: params.title,
        detail: params.detail,
        linkPath: params.linkPath || null,
      },
    });

    return notification;
  } catch (error) {
    console.error('Failed to create notification', error);
    return null;
  }
}

/**
 * Get notification counts for a user / org respecting WebsiteAccess
 */
export async function getNotificationCounts(
  organizationId: string,
  accessibleWebsiteIds?: string[] | null
) {
  const whereBase: any = {
    organizationId,
  };

  if (accessibleWebsiteIds !== null && accessibleWebsiteIds !== undefined) {
    whereBase.OR = [
      { websiteId: { in: accessibleWebsiteIds } },
      { websiteId: null },
    ];
  }

  const [allCount, unreadCount, criticalCount] = await Promise.all([
    db.notification.count({ where: whereBase }),
    db.notification.count({ where: { ...whereBase, readAt: null } }),
    db.notification.count({ where: { ...whereBase, severity: 'CRITICAL' } }),
  ]);

  return {
    all: allCount,
    unread: unreadCount,
    critical: criticalCount,
  };
}

/**
 * Marks all notifications accessible to the user as read.
 */
export async function markAllNotificationsRead(
  organizationId: string,
  accessibleWebsiteIds?: string[] | null
) {
  const whereBase: any = {
    organizationId,
    readAt: null,
  };

  if (accessibleWebsiteIds !== null && accessibleWebsiteIds !== undefined) {
    whereBase.OR = [
      { websiteId: { in: accessibleWebsiteIds } },
      { websiteId: null },
    ];
  }

  await db.notification.updateMany({
    where: whereBase,
    data: { readAt: new Date() },
  });
}
