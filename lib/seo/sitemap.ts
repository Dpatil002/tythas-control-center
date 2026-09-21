import { XMLBuilder } from 'fast-xml-parser';
import { prisma } from '@/lib/db/prisma';

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export function buildSitemapXml(urls: SitemapUrlEntry[]): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: true
  });

  const urlObjects = urls.map((u) => ({
    loc: u.loc,
    ...(u.lastmod ? { lastmod: u.lastmod } : {}),
    ...(u.changefreq ? { changefreq: u.changefreq } : {}),
    ...(u.priority !== undefined ? { priority: u.priority.toFixed(1) } : {})
  }));

  const sitemapObj = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8'
    },
    urlset: {
      '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
      url: urlObjects
    }
  };

  return builder.build(sitemapObj);
}

export async function generateWebsiteSitemap(websiteId: string): Promise<{
  xml: string;
  urls: SitemapUrlEntry[];
  urlCount: number;
  sitemapRunId: string;
}> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    include: {
      pages: {
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true, robotsDirective: true }
      },
      blogPosts: {
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true, robotsDirective: true }
      }
    }
  });

  if (!website) {
    throw new Error('Website not found');
  }

  const rawDomain = website.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const baseUrl = `https://${rawDomain}`;

  const urls: SitemapUrlEntry[] = [];

  // Home page / root
  urls.push({
    loc: `${baseUrl}/`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: 1.0
  });

  // Pages
  for (const page of website.pages) {
    if (page.robotsDirective?.includes('NOINDEX')) continue;
    const cleanSlug = page.slug.replace(/^\/+/, '');
    if (!cleanSlug || cleanSlug === 'home' || cleanSlug === 'index') continue;

    urls.push({
      loc: `${baseUrl}/${cleanSlug}`,
      lastmod: page.updatedAt.toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: 0.8
    });
  }

  // Blog Posts
  for (const post of website.blogPosts) {
    if (post.robotsDirective?.includes('NOINDEX')) continue;
    const cleanSlug = post.slug.replace(/^\/+/, '');
    if (!cleanSlug) continue;

    urls.push({
      loc: `${baseUrl}/blog/${cleanSlug}`,
      lastmod: post.updatedAt.toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: 0.6
    });
  }

  const xml = buildSitemapXml(urls);

  const sitemapRun = await prisma.sitemapRun.create({
    data: {
      websiteId,
      urlCount: urls.length
    }
  });

  return {
    xml,
    urls,
    urlCount: urls.length,
    sitemapRunId: sitemapRun.id
  };
}
