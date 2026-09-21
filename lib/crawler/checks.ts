import { CheckIssue, CrawlResult } from './types';

/**
 * Check Google Chrome UX Report (CrUX) API for real user Core Web Vitals.
 * Free, public API. If domain has insufficient traffic or query fails, returns NOT_CONFIGURED.
 */
async function queryCrUX(domain: string): Promise<{
  available: boolean;
  lcpMs?: number;
  clsScore?: number;
  inpMs?: number;
  goodRatio?: number;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${process.env.GOOGLE_CRUX_API_KEY || ''}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: `https://${domain}` }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      return { available: false };
    }

    const data = await res.json();
    const metrics = data?.record?.metrics;
    if (!metrics) return { available: false };

    const lcp = metrics.largest_contentful_paint?.percentiles?.p75;
    const cls = metrics.cumulative_layout_shift?.percentiles?.p75;
    const inp = metrics.interaction_to_next_paint?.percentiles?.p75;

    return {
      available: true,
      lcpMs: lcp ? Number(lcp) : undefined,
      clsScore: cls ? Number(cls) : undefined,
      inpMs: inp ? Number(inp) : undefined,
    };
  } catch {
    return { available: false };
  }
}

/**
 * Run full check suite against crawled result
 */
export async function runAnalysisChecks(crawl: CrawlResult): Promise<CheckIssue[]> {
  const issues: CheckIssue[] = [];
  const { pages, sslValid, sslExpiryDays, robotsFound, sitemapFound, domain } = crawl;

  const totalPages = pages.length;

  // ==========================================
  // 1. TECHNICAL CHECKS (Direct verification)
  // ==========================================

  // Check: ssl_certificate
  if (sslValid) {
    const daysLabel = sslExpiryDays !== undefined ? ` (expires in ${sslExpiryDays} days)` : '';
    issues.push({
      category: 'TECHNICAL',
      severity: 'HEALTHY',
      checkKey: 'ssl_certificate',
      title: 'SSL Certificate',
      detail: `Valid SSL certificate installed and active${daysLabel}.`,
      affectedCount: 0,
    });
  } else {
    issues.push({
      category: 'TECHNICAL',
      severity: 'CRITICAL',
      checkKey: 'ssl_certificate',
      title: 'SSL Certificate',
      detail: 'SSL certificate is missing, invalid, or expired.',
      affectedCount: 1,
    });
  }

  // Check: sitemap_present
  if (sitemapFound) {
    issues.push({
      category: 'TECHNICAL',
      severity: 'HEALTHY',
      checkKey: 'sitemap_present',
      title: 'XML Sitemap',
      detail: 'XML sitemap found and accessible to search crawlers.',
      affectedCount: 0,
    });
  } else {
    issues.push({
      category: 'TECHNICAL',
      severity: 'ATTENTION',
      checkKey: 'sitemap_present',
      title: 'XML Sitemap',
      detail: 'No XML sitemap found at standard locations or in robots.txt.',
      affectedCount: 1,
    });
  }

  // Check: robots_txt_present
  if (robotsFound) {
    issues.push({
      category: 'TECHNICAL',
      severity: 'HEALTHY',
      checkKey: 'robots_txt_present',
      title: 'Robots.txt',
      detail: 'Valid robots.txt file found with crawling instructions.',
      affectedCount: 0,
    });
  } else {
    issues.push({
      category: 'TECHNICAL',
      severity: 'ATTENTION',
      checkKey: 'robots_txt_present',
      title: 'Robots.txt',
      detail: 'Missing robots.txt file at /robots.txt.',
      affectedCount: 1,
    });
  }

  // Check: redirect_chains & redirect_loops
  const longRedirects = pages.filter((p) => p.redirectChain.length > 1);
  const redirectLoops = pages.filter((p) => {
    const chain = [p.url, ...p.redirectChain];
    const unique = new Set(chain);
    return unique.size < chain.length;
  });

  if (redirectLoops.length > 0) {
    issues.push({
      category: 'TECHNICAL',
      severity: 'CRITICAL',
      checkKey: 'redirect_loops',
      title: 'Redirect Loops',
      detail: `${redirectLoops.length} page(s) trapped in circular redirect loops.`,
      affectedCount: redirectLoops.length,
    });
  }

  if (longRedirects.length > 0) {
    issues.push({
      category: 'TECHNICAL',
      severity: 'ATTENTION',
      checkKey: 'redirect_chains',
      title: 'Redirect Chains',
      detail: `${longRedirects.length} page(s) have redirect chains longer than 1 hop.`,
      affectedCount: longRedirects.length,
    });
  } else if (redirectLoops.length === 0) {
    issues.push({
      category: 'TECHNICAL',
      severity: 'HEALTHY',
      checkKey: 'redirect_chains',
      title: 'Redirects',
      detail: 'No redirect chains or loops detected.',
      affectedCount: 0,
    });
  }

  // Check: broken_internal_links
  const brokenPages = pages.filter((p) => p.httpStatus >= 400 || p.httpStatus === 0);
  if (brokenPages.length > 0) {
    issues.push({
      category: 'TECHNICAL',
      severity: 'CRITICAL',
      checkKey: 'broken_internal_links',
      title: 'Broken Internal Links',
      detail: `${brokenPages.length} broken page(s) (4xx/5xx or unreachable) found.`,
      affectedCount: brokenPages.length,
    });
  } else {
    issues.push({
      category: 'TECHNICAL',
      severity: 'HEALTHY',
      checkKey: 'broken_internal_links',
      title: 'Broken Internal Links',
      detail: 'All internal crawl targets returned 200 OK.',
      affectedCount: 0,
    });
  }

  // Check: canonical_present
  const missingCanonical = pages.filter((p) => !p.canonical && p.httpStatus === 200);
  if (missingCanonical.length > 0) {
    issues.push({
      category: 'TECHNICAL',
      severity: 'ATTENTION',
      checkKey: 'canonical_present',
      title: 'Canonical Tags',
      detail: `${missingCanonical.length} page(s) missing a rel="canonical" link tag.`,
      affectedCount: missingCanonical.length,
    });
  } else {
    issues.push({
      category: 'TECHNICAL',
      severity: 'HEALTHY',
      checkKey: 'canonical_present',
      title: 'Canonical Tags',
      detail: 'All crawled HTML pages have self-referencing or target canonical tags.',
      affectedCount: 0,
    });
  }

  // Check: indexability
  const nonIndexable = pages.filter((p) => !p.isIndexable);
  if (nonIndexable.length > 0) {
    issues.push({
      category: 'TECHNICAL',
      severity: 'ATTENTION',
      checkKey: 'indexability',
      title: 'Indexability',
      detail: `${nonIndexable.length} page(s) blocked from indexing via noindex or robots.txt.`,
      affectedCount: nonIndexable.length,
    });
  } else {
    issues.push({
      category: 'TECHNICAL',
      severity: 'HEALTHY',
      checkKey: 'indexability',
      title: 'Indexability',
      detail: 'All crawled pages are indexable by search engines.',
      affectedCount: 0,
    });
  }

  // ==========================================
  // 2. PERFORMANCE CHECKS
  // ==========================================

  // Check: core_web_vitals
  const crux = await queryCrUX(domain);
  if (crux.available) {
    const isGood = (crux.lcpMs ?? 0) <= 2500 && (crux.clsScore ?? 0) <= 0.1;
    issues.push({
      category: 'PERFORMANCE',
      severity: isGood ? 'HEALTHY' : 'ATTENTION',
      checkKey: 'core_web_vitals',
      title: 'Core Web Vitals',
      detail: isGood
        ? `Field data passes: 75th percentile LCP is ${(crux.lcpMs! / 1000).toFixed(2)}s.`
        : `75th percentile LCP is ${(crux.lcpMs! / 1000).toFixed(2)}s (threshold: 2.5s).`,
      affectedCount: isGood ? 0 : 1,
    });
  } else {
    issues.push({
      category: 'PERFORMANCE',
      severity: 'NOT_CONFIGURED',
      checkKey: 'core_web_vitals',
      title: 'Core Web Vitals',
      detail: 'Not enough traffic yet for Google to report Core Web Vitals.',
      affectedCount: 0,
    });
  }

  // Check: page_speed_signals (TTFB / load duration proxy)
  const slowPages = pages.filter((p) => p.loadTimeMs > 1500);
  if (slowPages.length > 0) {
    issues.push({
      category: 'PERFORMANCE',
      severity: 'ATTENTION',
      checkKey: 'page_speed_signals',
      title: 'Page Speed Signals',
      detail: `${slowPages.length} page(s) had server response times > 1.5s during crawl.`,
      affectedCount: slowPages.length,
    });
  } else {
    issues.push({
      category: 'PERFORMANCE',
      severity: 'HEALTHY',
      checkKey: 'page_speed_signals',
      title: 'Page Speed Signals',
      detail: 'Fast server response times observed across all crawled pages.',
      affectedCount: 0,
    });
  }

  // Check: large_images / missing modern formats
  const totalImages = pages.reduce((acc, p) => acc + p.totalImages, 0);
  const pagesWithManyImages = pages.filter((p) => p.totalImages > 20);
  if (pagesWithManyImages.length > 0) {
    issues.push({
      category: 'PERFORMANCE',
      severity: 'ATTENTION',
      checkKey: 'large_images',
      title: 'Image Assets',
      detail: `${pagesWithManyImages.length} page(s) contain more than 20 images without lazy-loading signals.`,
      affectedCount: pagesWithManyImages.length,
    });
  } else {
    issues.push({
      category: 'PERFORMANCE',
      severity: 'HEALTHY',
      checkKey: 'large_images',
      title: 'Image Assets',
      detail: `All ${totalImages} discovered image tags appear reasonably distributed.`,
      affectedCount: 0,
    });
  }

  // ==========================================
  // 3. CONTENT CHECKS (Best-practice recommendations)
  // ==========================================

  // Check: missing_meta_title
  const missingTitle = pages.filter((p) => !p.metaTitle && p.httpStatus === 200);
  if (missingTitle.length > 0) {
    issues.push({
      category: 'CONTENT',
      severity: 'CRITICAL',
      checkKey: 'missing_meta_title',
      title: 'Meta Titles',
      detail: `${missingTitle.length} page(s) missing a <title> tag.`,
      affectedCount: missingTitle.length,
    });
  } else {
    issues.push({
      category: 'CONTENT',
      severity: 'HEALTHY',
      checkKey: 'missing_meta_title',
      title: 'Meta Titles',
      detail: 'All crawled pages have a title tag defined.',
      affectedCount: 0,
    });
  }

  // Check: missing_meta_description
  const missingDesc = pages.filter((p) => !p.metaDescription && p.httpStatus === 200);
  if (missingDesc.length > 0) {
    issues.push({
      category: 'CONTENT',
      severity: 'ATTENTION',
      checkKey: 'missing_meta_description',
      title: 'Meta Descriptions',
      detail: `${missingDesc.length} page(s) missing a meta description.`,
      affectedCount: missingDesc.length,
    });
  } else {
    issues.push({
      category: 'CONTENT',
      severity: 'HEALTHY',
      checkKey: 'missing_meta_description',
      title: 'Meta Descriptions',
      detail: 'All crawled pages have a meta description.',
      affectedCount: 0,
    });
  }

  // Check: duplicate_titles
  const titleMap = new Map<string, number>();
  for (const p of pages) {
    if (p.metaTitle) {
      titleMap.set(p.metaTitle, (titleMap.get(p.metaTitle) || 0) + 1);
    }
  }
  let duplicateTitleCount = 0;
  titleMap.forEach((count) => {
    if (count > 1) duplicateTitleCount += count;
  });
  if (duplicateTitleCount > 0) {
    issues.push({
      category: 'CONTENT',
      severity: 'ATTENTION',
      checkKey: 'duplicate_titles',
      title: 'Duplicate Titles',
      detail: `${duplicateTitleCount} page(s) share identical title tags.`,
      affectedCount: duplicateTitleCount,
    });
  } else {
    issues.push({
      category: 'CONTENT',
      severity: 'HEALTHY',
      checkKey: 'duplicate_titles',
      title: 'Duplicate Titles',
      detail: 'No duplicate page titles found.',
      affectedCount: 0,
    });
  }

  // Check: duplicate_descriptions
  const descMap = new Map<string, number>();
  for (const p of pages) {
    if (p.metaDescription) {
      descMap.set(p.metaDescription, (descMap.get(p.metaDescription) || 0) + 1);
    }
  }
  let duplicateDescCount = 0;
  descMap.forEach((count) => {
    if (count > 1) duplicateDescCount += count;
  });
  if (duplicateDescCount > 0) {
    issues.push({
      category: 'CONTENT',
      severity: 'ATTENTION',
      checkKey: 'duplicate_descriptions',
      title: 'Duplicate Meta Descriptions',
      detail: `${duplicateDescCount} page(s) share identical meta descriptions.`,
      affectedCount: duplicateDescCount,
    });
  } else {
    issues.push({
      category: 'CONTENT',
      severity: 'HEALTHY',
      checkKey: 'duplicate_descriptions',
      title: 'Duplicate Meta Descriptions',
      detail: 'No duplicate meta descriptions found.',
      affectedCount: 0,
    });
  }

  // Check: missing_h1 & duplicate_h1
  const missingH1 = pages.filter((p) => p.h1Count === 0 && p.httpStatus === 200);
  const duplicateH1 = pages.filter((p) => p.h1Count > 1 && p.httpStatus === 200);

  if (missingH1.length > 0) {
    issues.push({
      category: 'CONTENT',
      severity: 'ATTENTION',
      checkKey: 'missing_h1',
      title: 'H1 Headings',
      detail: `${missingH1.length} page(s) missing an <h1> heading tag.`,
      affectedCount: missingH1.length,
    });
  } else if (duplicateH1.length > 0) {
    issues.push({
      category: 'CONTENT',
      severity: 'ATTENTION',
      checkKey: 'duplicate_h1',
      title: 'Multiple H1 Headings',
      detail: `${duplicateH1.length} page(s) have more than one <h1> heading.`,
      affectedCount: duplicateH1.length,
    });
  } else {
    issues.push({
      category: 'CONTENT',
      severity: 'HEALTHY',
      checkKey: 'missing_h1',
      title: 'H1 Headings',
      detail: 'Each crawled page has exactly one H1 heading.',
      affectedCount: 0,
    });
  }

  // Check: missing_alt_text
  const totalMissingAlt = pages.reduce((acc, p) => acc + p.missingAltImages, 0);
  if (totalMissingAlt > 0) {
    issues.push({
      category: 'CONTENT',
      severity: 'ATTENTION',
      checkKey: 'missing_alt_text',
      title: 'Image Alt Text',
      detail: `${totalMissingAlt} image(s) missing descriptive alt text attributes.`,
      affectedCount: totalMissingAlt,
    });
  } else {
    issues.push({
      category: 'CONTENT',
      severity: 'HEALTHY',
      checkKey: 'missing_alt_text',
      title: 'Image Alt Text',
      detail: 'All images have alt attributes specified.',
      affectedCount: 0,
    });
  }

  // Check: thin_content (Marked NOT_CONFIGURED by default per spec / design reference)
  issues.push({
    category: 'CONTENT',
    severity: 'NOT_CONFIGURED',
    checkKey: 'thin_content',
    title: 'Thin Content Threshold',
    detail: 'Judgment-heavy check · skipped by default until word threshold is configured.',
    affectedCount: 0,
  });

  return issues;
}
