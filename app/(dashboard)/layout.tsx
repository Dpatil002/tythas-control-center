import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ShellProvider } from '@/components/shell/context';
import { Sidebar } from '@/components/shell/sidebar';
import { Header } from '@/components/shell/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || !session.user) {
    redirect('/login');
  }

  const activeMembership =
    session.user.memberships.find((m) => m.status === 'ACTIVE') ||
    session.user.memberships[0];

  if (!activeMembership) {
    redirect('/login');
  }

  const userContextData = {
    id: session.user.id,
    email: session.user.email,
    role: activeMembership.role,
    organizationId: activeMembership.organizationId,
    organizationName: activeMembership.organization.name,
    mfaEnabled: session.user.mfaEnabled,
  };

  // Fetch verified websites for this user
  let accessibleWebsites;

  if (activeMembership.role === 'OWNER') {
    accessibleWebsites = await db.website.findMany({
      where: {
        organizationId: activeMembership.organizationId,
        ownershipVerifiedAt: { not: null },
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  } else {
    const access = await db.websiteAccess.findMany({
      where: { userId: session.user.id },
      select: { websiteId: true },
    });
    const ids = access.map((a) => a.websiteId);

    accessibleWebsites = await db.website.findMany({
      where: {
        id: { in: ids },
        organizationId: activeMembership.organizationId,
        ownershipVerifiedAt: { not: null },
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // Determine active website from cookie
  const cookieStore = cookies();
  const activeWebsiteCookieId = cookieStore.get('tythas_active_website')?.value;
  let activeWebsite = activeWebsiteCookieId
    ? accessibleWebsites.find((w) => w.id === activeWebsiteCookieId) || null
    : null;

  if (!activeWebsite && accessibleWebsites.length > 0) {
    activeWebsite = accessibleWebsites[0];
  }

  // Format dates to ISO strings for serializable client state
  const formattedWebsites = accessibleWebsites.map((w) => ({
    ...w,
    ownershipVerifiedAt: w.ownershipVerifiedAt ? w.ownershipVerifiedAt.toISOString() : null,
  }));

  const formattedActiveWebsite = activeWebsite
    ? {
        ...activeWebsite,
        ownershipVerifiedAt: activeWebsite.ownershipVerifiedAt
          ? activeWebsite.ownershipVerifiedAt.toISOString()
          : null,
      }
    : null;

  return (
    <ShellProvider
      initialUser={userContextData}
      initialWebsites={formattedWebsites}
      initialActiveWebsite={formattedActiveWebsite}
    >
      <div className="flex min-h-screen bg-bg">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ShellProvider>
  );
}
