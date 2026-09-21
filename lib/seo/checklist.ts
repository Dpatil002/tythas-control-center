import { prisma } from '@/lib/db/prisma';

export interface SeoCheckItem {
  id: string;
  category: 'CONTENT' | 'TECHNICAL' | 'STRUCTURE';
  severity: 'CRITICAL' | 'ATTENTION' | 'HEALTHY';
  checkKey: string;
  title: string;
  detail: string;
  affectedCount: number;
  affectedItems: Array<{
    id: string;
    type: 'page' | 'post';
    title: string;
    slug: string;
    urlPath: string;
    issueHint?: string;
  }>;
}

export async function getSitewideSeoChecklist(websiteId: string): Promise<{
  source: 'cms_realtime' | 'crawl_fallback';
  items: SeoCheckItem[];
  summary: {
    criticalCount: number;
    attentionCount: number;
    healthyCount: number;
    totalPagesAudited: number;
  };
}> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    include: {
      pages: {
        select: {
          id: true,
          slug: true,
          title: true,
          seoTitle: true,
          seoDescription: true,
          h1: true,
          canonicalUrl: true,
          robotsDirective: true,
          status: true
        }
      },
      blogPosts: {
        select: {
          id: true,
          slug: true,
          title: true,
          seoTitle: true,
          seoDescription: true,
          h1: true,
          canonicalUrl: true,
          robotsDirective: true,
          status: true
        }
      }
    }
  });

  if (!website) {
    throw new Error('Website not found');
  }

  // If CONNECTED or has CMS records, audit live CMS data!
  const hasCmsData = website.pages.length > 0 || website.blogPosts.length > 0;
  if (website.connectionState === 'CONNECTED' || hasCmsData) {
    return auditLiveCmsContent(website);
  }

  // Otherwise, fall back to crawl-based AnalysisIssues from latest WebsiteAnalysis
  return auditCrawlFallback(websiteId);
}

function auditLiveCmsContent(website: any) {
  const items: SeoCheckItem[] = [];

  const allEntries: Array<{
    id: string;
    type: 'page' | 'post';
    title: string;
    slug: string;
    urlPath: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    h1?: string | null;
    canonicalUrl?: string | null;
  }> = [];

  for (const p of website.pages) {
    allEntries.push({
      id: p.id,
      type: 'page',
      title: p.title,
      slug: p.slug,
      urlPath: `/${p.slug.replace(/^\/+/, '')}`,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      h1: p.h1,
      canonicalUrl: p.canonicalUrl
    });
  }

  for (const post of website.blogPosts) {
    allEntries.push({
      id: post.id,
      type: 'post',
      title: post.title,
      slug: post.slug,
      urlPath: `/blog/${post.slug.replace(/^\/+/, '')}`,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      h1: post.h1,
      canonicalUrl: post.canonicalUrl
    });
  }

  // Check 1: Missing Meta Titles
  const missingTitle = allEntries.filter((e) => !e.seoTitle?.trim() && !e.title?.trim());
  items.push({
    id: 'missing_meta_title',
    category: 'CONTENT',
    severity: missingTitle.length > 0 ? 'CRITICAL' : 'HEALTHY',
    checkKey: 'missing_meta_title',
    title: 'Meta Titles Present',
    detail:
      missingTitle.length > 0
        ? `${missingTitle.length} content item${missingTitle.length === 1 ? '' : 's'} missing an SEO title tag.`
        : 'All pages and blog posts have valid SEO title tags.',
    affectedCount: missingTitle.length,
    affectedItems: missingTitle.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      slug: e.slug,
      urlPath: e.urlPath,
      issueHint: 'Missing title'
    }))
  });

  // Check 2: Missing Meta Descriptions
  const missingDesc = allEntries.filter((e) => !e.seoDescription?.trim());
  items.push({
    id: 'missing_meta_description',
    category: 'CONTENT',
    severity: missingDesc.length > 0 ? 'ATTENTION' : 'HEALTHY',
    checkKey: 'missing_meta_description',
    title: 'Meta Descriptions Present',
    detail:
      missingDesc.length > 0
        ? `${missingDesc.length} page${missingDesc.length === 1 ? '' : 's'} missing a search snippet description.`
        : 'All pages and blog posts have meta descriptions configured.',
    affectedCount: missingDesc.length,
    affectedItems: missingDesc.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      slug: e.slug,
      urlPath: e.urlPath,
      issueHint: 'Missing description'
    }))
  });

  // Check 3: Duplicate Meta Titles
  const titleCounts = new Map<string, typeof allEntries>();
  for (const e of allEntries) {
    const effectiveTitle = (e.seoTitle || e.title || '').trim().toLowerCase();
    if (effectiveTitle) {
      const list = titleCounts.get(effectiveTitle) || [];
      list.push(e);
      titleCounts.set(effectiveTitle, list);
    }
  }

  const duplicates: typeof allEntries = [];
  titleCounts.forEach((entries) => {
    if (entries.length > 1) {
      duplicates.push(...entries);
    }
  });

  items.push({
    id: 'duplicate_titles',
    category: 'CONTENT',
    severity: duplicates.length > 0 ? 'ATTENTION' : 'HEALTHY',
    checkKey: 'duplicate_titles',
    title: 'Unique Page Titles',
    detail:
      duplicates.length > 0
        ? `${duplicates.length} items share duplicate or identical title tags across the site.`
        : 'No duplicate page titles detected.',
    affectedCount: duplicates.length,
    affectedItems: duplicates.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      slug: e.slug,
      urlPath: e.urlPath,
      issueHint: `Title: "${e.seoTitle || e.title}"`
    }))
  });

  // Check 4: Missing H1 Tags
  const missingH1 = allEntries.filter((e) => !e.h1?.trim());
  items.push({
    id: 'missing_h1',
    category: 'STRUCTURE',
    severity: missingH1.length > 0 ? 'ATTENTION' : 'HEALTHY',
    checkKey: 'missing_h1',
    title: 'H1 Headings Defined',
    detail:
      missingH1.length > 0
        ? `${missingH1.length} page${missingH1.length === 1 ? '' : 's'} do not have an explicit primary H1 heading set.`
        : 'All pages have designated H1 headings.',
    affectedCount: missingH1.length,
    affectedItems: missingH1.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      slug: e.slug,
      urlPath: e.urlPath,
      issueHint: 'Missing H1 heading'
    }))
  });

  // Check 5: Title Length Optimization (Warning if > 60 chars or < 20 chars)
  const nonOptimalTitles = allEntries.filter((e) => {
    const len = (e.seoTitle || e.title || '').length;
    return len > 65 || (len > 0 && len < 20);
  });
  items.push({
    id: 'title_length_optimization',
    category: 'CONTENT',
    severity: nonOptimalTitles.length > 0 ? 'ATTENTION' : 'HEALTHY',
    checkKey: 'title_length_optimization',
    title: 'Title Length Guidance (20-60 chars)',
    detail:
      nonOptimalTitles.length > 0
        ? `${nonOptimalTitles.length} title${nonOptimalTitles.length === 1 ? '' : 's'} are either too short (<20) or exceed 65 chars (risk of search snippet clipping).`
        : 'All titles are within optimal search snippet character length.',
    affectedCount: nonOptimalTitles.length,
    affectedItems: nonOptimalTitles.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      slug: e.slug,
      urlPath: e.urlPath,
      issueHint: `${(e.seoTitle || e.title || '').length} characters`
    }))
  });

  const criticalCount = items.filter((i) => i.severity === 'CRITICAL').length;
  const attentionCount = items.filter((i) => i.severity === 'ATTENTION').length;
  const healthyCount = items.filter((i) => i.severity === 'HEALTHY').length;

  return {
    source: 'cms_realtime' as const,
    items,
    summary: {
      criticalCount,
      attentionCount,
      healthyCount,
      totalPagesAudited: allEntries.length
    }
  };
}

async function auditCrawlFallback(websiteId: string) {
  const latestAnalysis = await prisma.websiteAnalysis.findFirst({
    where: { websiteId, status: 'COMPLETE' },
    orderBy: { createdAt: 'desc' },
    include: {
      issues: true,
      pages: true
    }
  });

  if (!latestAnalysis) {
    return {
      source: 'crawl_fallback' as const,
      items: [],
      summary: {
        criticalCount: 0,
        attentionCount: 0,
        healthyCount: 0,
        totalPagesAudited: 0
      }
    };
  }

  const items: SeoCheckItem[] = latestAnalysis.issues.map((issue) => {
    const severityMap: Record<string, 'CRITICAL' | 'ATTENTION' | 'HEALTHY'> = {
      CRITICAL: 'CRITICAL',
      ATTENTION: 'ATTENTION',
      HEALTHY: 'HEALTHY',
      NOT_CONFIGURED: 'ATTENTION'
    };

    return {
      id: issue.id,
      category: issue.category === 'TECHNICAL' ? 'TECHNICAL' : 'CONTENT',
      severity: severityMap[issue.severity] || 'ATTENTION',
      checkKey: issue.checkKey,
      title: issue.title,
      detail: issue.detail,
      affectedCount: issue.affectedCount,
      affectedItems: latestAnalysis.pages.slice(0, issue.affectedCount).map((p) => ({
        id: p.id,
        type: 'page',
        title: p.metaTitle || p.url,
        slug: p.url,
        urlPath: p.url
      }))
    };
  });

  const criticalCount = items.filter((i) => i.severity === 'CRITICAL').length;
  const attentionCount = items.filter((i) => i.severity === 'ATTENTION').length;
  const healthyCount = items.filter((i) => i.severity === 'HEALTHY').length;

  return {
    source: 'crawl_fallback' as const,
    items,
    summary: {
      criticalCount,
      attentionCount,
      healthyCount,
      totalPagesAudited: latestAnalysis.pagesFound || 0
    }
  };
}
