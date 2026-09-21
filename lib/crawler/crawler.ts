import * as cheerio from 'cheerio';
import { XMLParser } from 'fast-xml-parser';
import * as tls from 'tls';
import * as urlModule from 'url';
import { CrawledPageData, CrawlProgress, CrawlResult } from './types';
import { setAnalysisProgress } from './progress-tracker';

const USER_AGENT = 'TythasControlCenter/1.0 (+https://tythas.example/about-our-crawler)';
const MAX_PAGES = 150;
const CONCURRENCY = 3;
const REQUEST_TIMEOUT_MS = 10000;

export function normalizeDomain(rawInput: string): { domain: string; baseUrl: string } {
  let cleaned = rawInput.trim();
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    const domain = parsed.hostname.toLowerCase();
    const baseUrl = `${parsed.protocol}//${domain}`;
    return { domain, baseUrl };
  } catch {
    const domain = rawInput.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
    return { domain, baseUrl: `https://${domain}` };
  }
}

/**
 * Check SSL validity and remaining days via TLS handshake
 */
export async function checkSslCertificate(domain: string): Promise<{ valid: boolean; expiryDays?: number }> {
  return new Promise((resolve) => {
    try {
      const socket = tls.connect(
        {
          host: domain,
          port: 443,
          servername: domain,
          rejectUnauthorized: false,
          timeout: 5000,
        },
        () => {
          try {
            const cert = socket.getPeerCertificate();
            socket.end();

            if (!cert || !cert.valid_to) {
              resolve({ valid: false });
              return;
            }

            const validTo = new Date(cert.valid_to);
            const now = new Date();
            const valid = validTo > now && socket.authorized;
            const diffMs = validTo.getTime() - now.getTime();
            const expiryDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

            resolve({ valid, expiryDays });
          } catch {
            resolve({ valid: false });
          }
        }
      );

      socket.on('error', () => {
        resolve({ valid: false });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ valid: false });
      });
    } catch {
      resolve({ valid: false });
    }
  });
}

/**
 * Parse robots.txt
 */
export async function fetchRobotsTxt(baseUrl: string): Promise<{
  found: boolean;
  sitemaps: string[];
  disallowPatterns: string[];
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${baseUrl}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { found: false, sitemaps: [], disallowPatterns: [] };
    }

    const text = await res.text();
    const sitemaps: string[] = [];
    const disallowPatterns: string[] = [];

    const lines = text.split('\n');
    let appliesToTythas = true;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [directive, ...rest] = trimmed.split(':');
      const val = rest.join(':').trim();
      const dirLower = directive.toLowerCase();

      if (dirLower === 'user-agent') {
        const ua = val.toLowerCase();
        appliesToTythas = ua === '*' || ua.includes('tythas');
      } else if (dirLower === 'sitemap' && val) {
        if (!sitemaps.includes(val)) {
          sitemaps.push(val);
        }
      } else if (dirLower === 'disallow' && appliesToTythas && val) {
        if (!disallowPatterns.includes(val)) {
          disallowPatterns.push(val);
        }
      }
    }

    return { found: true, sitemaps, disallowPatterns };
  } catch {
    return { found: false, sitemaps: [], disallowPatterns: [] };
  }
}

function isPathDisallowed(path: string, disallowedPatterns: string[]): boolean {
  for (const pattern of disallowedPatterns) {
    if (pattern === '/') return true;
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (path.startsWith(prefix)) return true;
    } else if (path.startsWith(pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * Discover URLs from Sitemaps
 */
export async function fetchSitemapUrls(sitemapUrl: string, maxLimit = MAX_PAGES): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(sitemapUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);

    const urls: string[] = [];

    // Sitemap Index format
    if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
      const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
        ? parsed.sitemapindex.sitemap
        : [parsed.sitemapindex.sitemap];

      for (const sm of sitemaps) {
        if (sm.loc && typeof sm.loc === 'string' && urls.length < maxLimit) {
          const subUrls = await fetchSitemapUrls(sm.loc, maxLimit - urls.length);
          for (const u of subUrls) {
            if (!urls.includes(u) && urls.length < maxLimit) {
              urls.push(u);
            }
          }
        }
      }
    }

    // URL set format
    if (parsed.urlset && parsed.urlset.url) {
      const urlEntries = Array.isArray(parsed.urlset.url)
        ? parsed.urlset.url
        : [parsed.urlset.url];

      for (const entry of urlEntries) {
        if (entry.loc && typeof entry.loc === 'string' && !urls.includes(entry.loc)) {
          urls.push(entry.loc.trim());
          if (urls.length >= maxLimit) break;
        }
      }
    }

    return urls;
  } catch {
    return [];
  }
}

/**
 * Detect CMS and builder from HTML string and response headers
 */
export function detectCmsAndBuilder(
  html: string,
  headers?: Headers
): { detectedCms: string | null; detectedBuilder: string | null } {
  let detectedCms: string | null = null;
  let detectedBuilder: string | null = null;

  const lowerHtml = html.toLowerCase();

  // Generator meta tag
  const $ = cheerio.load(html);
  const generator = $('meta[name="generator"]').attr('content') || '';
  const genLower = generator.toLowerCase();

  if (genLower.includes('wordpress') || lowerHtml.includes('/wp-content/') || lowerHtml.includes('/wp-includes/')) {
    detectedCms = 'WordPress';
  } else if (genLower.includes('webflow') || lowerHtml.includes('w-nav') || lowerHtml.includes('w-dyn')) {
    detectedCms = 'Webflow';
  } else if (genLower.includes('shopify') || lowerHtml.includes('cdn.shopify.com')) {
    detectedCms = 'Shopify';
  } else if (genLower.includes('squarespace')) {
    detectedCms = 'Squarespace';
  } else if (genLower.includes('wix') || lowerHtml.includes('wix.com')) {
    detectedCms = 'Wix';
  } else if (genLower.includes('ghost')) {
    detectedCms = 'Ghost';
  } else if (lowerHtml.includes('__next') || lowerHtml.includes('_next/static')) {
    detectedCms = 'Next.js / Custom';
  }

  // Page builder detection (especially for WordPress)
  if (
    lowerHtml.includes('elementor') ||
    $('body').hasClass('elementor-default') ||
    $('body').hasClass('elementor-page') ||
    $('link[href*="elementor"]').length > 0
  ) {
    detectedBuilder = 'Elementor';
    if (!detectedCms) detectedCms = 'WordPress';
  } else if (
    lowerHtml.includes('et_pb_') ||
    $('body').hasClass('et_divi_builder') ||
    $('link[href*="divi"]').length > 0
  ) {
    detectedBuilder = 'Divi';
    if (!detectedCms) detectedCms = 'WordPress';
  } else if (
    lowerHtml.includes('wp-block-') ||
    lowerHtml.includes('is-layout-flow') ||
    lowerHtml.includes('has-global-padding')
  ) {
    detectedBuilder = 'Gutenberg';
    if (!detectedCms) detectedCms = 'WordPress';
  } else if (lowerHtml.includes('fl-builder')) {
    detectedBuilder = 'Beaver Builder';
    if (!detectedCms) detectedCms = 'WordPress';
  } else if (lowerHtml.includes('oxygen-builder')) {
    detectedBuilder = 'Oxygen';
    if (!detectedCms) detectedCms = 'WordPress';
  }

  return { detectedCms, detectedBuilder };
}

/**
 * Parse an individual HTML page
 */
export async function crawlSinglePage(
  targetUrl: string,
  domain: string,
  disallowPatterns: string[]
): Promise<CrawledPageData> {
  const startTime = Date.now();
  const redirectChain: string[] = [];

  let currentUrl = targetUrl;
  let finalStatus = 200;
  let html = '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const res = await fetch(currentUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    finalStatus = res.status;
    if (res.url && res.url !== currentUrl) {
      redirectChain.push(res.url);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      html = await res.text();
    }
  } catch (err) {
    finalStatus = 0; // Network error
  }

  const loadTimeMs = Date.now() - startTime;

  if (!html) {
    return {
      url: targetUrl,
      httpStatus: finalStatus,
      metaTitle: null,
      metaDescription: null,
      h1: null,
      h1Count: 0,
      canonical: null,
      isIndexable: false,
      noIndexReason: finalStatus >= 400 ? `HTTP ${finalStatus}` : 'Page unreachable',
      missingAltImages: 0,
      totalImages: 0,
      wordCount: 0,
      schemaTypes: [],
      redirectChain,
      loadTimeMs,
      internalLinks: [],
    };
  }

  const $ = cheerio.load(html);

  // Meta Title
  const metaTitle = $('title').first().text().trim() || null;

  // Meta Description
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    null;

  // H1s
  const h1Elements = $('h1');
  const h1Count = h1Elements.length;
  const h1 = h1Count > 0 ? $(h1Elements[0]).text().trim() : null;

  // Canonical
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() || null;

  // Robots Meta & Indexability
  const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase() || '';
  const parsedUrl = new URL(targetUrl);
  const path = parsedUrl.pathname;

  let isIndexable = true;
  let noIndexReason: string | undefined = undefined;

  if (robotsMeta.includes('noindex')) {
    isIndexable = false;
    noIndexReason = 'meta robots noindex';
  } else if (isPathDisallowed(path, disallowPatterns)) {
    isIndexable = false;
    noIndexReason = 'robots.txt Disallow';
  } else if (finalStatus >= 400) {
    isIndexable = false;
    noIndexReason = `HTTP ${finalStatus}`;
  }

  // Images & Alt text
  let totalImages = 0;
  let missingAltImages = 0;

  $('img').each((_, el) => {
    totalImages++;
    const alt = $(el).attr('alt');
    if (alt === undefined || alt === null || alt.trim() === '') {
      missingAltImages++;
    }
  });

  // Body Word Count (visible text)
  $('script, style, noscript, nav, footer, header').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText ? bodyText.split(' ').filter(Boolean).length : 0;

  // JSON-LD Schema Types
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html();
      if (raw) {
        const json = JSON.parse(raw);
        if (json['@type']) {
          const types = Array.isArray(json['@type']) ? json['@type'] : [json['@type']];
          for (const t of types) {
            if (typeof t === 'string' && !schemaTypes.includes(t)) {
              schemaTypes.push(t);
            }
          }
        }
        if (json['@graph'] && Array.isArray(json['@graph'])) {
          for (const item of json['@graph']) {
            if (item['@type'] && typeof item['@type'] === 'string' && !schemaTypes.includes(item['@type'])) {
              schemaTypes.push(item['@type']);
            }
          }
        }
      }
    } catch {
      // ignore invalid json-ld
    }
  });

  // Internal Links discovery
  const internalLinks: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    try {
      const resolved = new URL(href, targetUrl);
      if (resolved.hostname === domain && !internalLinks.includes(resolved.href)) {
        // Strip hash
        resolved.hash = '';
        const cleanHref = resolved.href;
        if (!internalLinks.includes(cleanHref)) {
          internalLinks.push(cleanHref);
        }
      }
    } catch {
      // Invalid URL
    }
  });

  return {
    url: targetUrl,
    httpStatus: finalStatus,
    metaTitle,
    metaDescription,
    h1,
    h1Count,
    canonical,
    isIndexable,
    noIndexReason,
    missingAltImages,
    totalImages,
    wordCount,
    schemaTypes,
    redirectChain,
    loadTimeMs,
    internalLinks,
  };
}

/**
 * Full public crawl workflow orchestrator
 */
export async function executePublicCrawl(
  rawUrl: string,
  analysisId?: string
): Promise<CrawlResult> {
  const { domain, baseUrl } = normalizeDomain(rawUrl);

  const updateProgress = (stage: CrawlProgress['stage'], stageLabel: string, crawled = 0, total = 0, currentUrl?: string) => {
    if (analysisId) {
      setAnalysisProgress(analysisId, {
        stage,
        stageLabel,
        pagesCrawled: crawled,
        pagesTotal: total,
        currentUrl,
      });
    }
  };

  updateProgress('initializing', 'Initializing crawler and checking SSL security...', 0, 1);

  // 1. Check SSL
  const sslInfo = await checkSslCertificate(domain);

  // 2. Fetch robots.txt
  updateProgress('fetching_robots', 'Checking robots.txt directives and search engine rules...', 0, 1);
  const robots = await fetchRobotsTxt(baseUrl);

  // 3. Discover Sitemaps
  updateProgress('discovering_sitemaps', 'Discovering XML sitemaps and indexing structure...', 0, 1);
  let discoveredUrls: string[] = [];
  let sitemapFound = false;

  const sitemapCandidates = robots.sitemaps.length > 0
    ? robots.sitemaps
    : [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap_index.xml`, `${baseUrl}/wp-sitemap.xml`];

  for (const smUrl of sitemapCandidates) {
    const urls = await fetchSitemapUrls(smUrl, MAX_PAGES);
    if (urls.length > 0) {
      sitemapFound = true;
      for (const u of urls) {
        if (!discoveredUrls.includes(u)) {
          discoveredUrls.push(u);
        }
      }
    }
  }

  // Ensure homepage is in list
  if (!discoveredUrls.includes(baseUrl) && !discoveredUrls.includes(`${baseUrl}/`)) {
    discoveredUrls.unshift(`${baseUrl}/`);
  }

  // 4. Crawl Pages
  const queue = [...discoveredUrls];
  const visited = new Set<string>();
  const crawledPages: CrawledPageData[] = [];

  let detectedCms: string | null = null;
  let detectedBuilder: string | null = null;

  updateProgress('crawling_pages', `Crawling public pages and assets (0 / ${queue.length})...`, 0, queue.length);

  while (queue.length > 0 && crawledPages.length < MAX_PAGES) {
    const batch = queue.splice(0, CONCURRENCY);
    const batchPromises = batch.map(async (targetUrl) => {
      if (visited.has(targetUrl)) return null;
      visited.add(targetUrl);

      const pageData = await crawlSinglePage(targetUrl, domain, robots.disallowPatterns);
      return pageData;
    });

    const results = await Promise.all(batchPromises);

    for (const page of results) {
      if (!page) continue;
      crawledPages.push(page);

      // Detect CMS on homepage or first 3 pages
      if (crawledPages.length <= 3 && (!detectedCms || !detectedBuilder)) {
        try {
          const res = await fetch(page.url, { headers: { 'User-Agent': USER_AGENT } });
          if (res.ok) {
            const html = await res.text();
            const cmsInfo = detectCmsAndBuilder(html, res.headers);
            if (cmsInfo.detectedCms && !detectedCms) detectedCms = cmsInfo.detectedCms;
            if (cmsInfo.detectedBuilder && !detectedBuilder) detectedBuilder = cmsInfo.detectedBuilder;
          }
        } catch {
          // ignore
        }
      }

      // Add discovered internal links to queue if not visited
      for (const link of page.internalLinks) {
        if (!visited.has(link) && !queue.includes(link) && queue.length + crawledPages.length < MAX_PAGES) {
          queue.push(link);
        }
      }
    }

    const totalEstimated = Math.min(MAX_PAGES, queue.length + crawledPages.length);
    updateProgress(
      'crawling_pages',
      `Crawling public pages (${crawledPages.length} / ${totalEstimated})...`,
      crawledPages.length,
      totalEstimated
    );

    // Polite delay between batches
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  updateProgress('running_audits', 'Running technical, performance, and SEO checks...', crawledPages.length, crawledPages.length);

  // Count broken links
  const totalBrokenLinks = crawledPages.filter((p) => p.httpStatus >= 400 || p.httpStatus === 0).length;

  return {
    domain,
    normalizedUrl: baseUrl,
    pages: crawledPages,
    sslValid: sslInfo.valid,
    sslExpiryDays: sslInfo.expiryDays,
    robotsFound: robots.found,
    sitemapFound,
    sitemapUrls: robots.sitemaps,
    detectedCms: detectedCms || 'Custom / Unknown',
    detectedBuilder,
    disallowedPatterns: robots.disallowPatterns,
    totalBrokenLinks,
  };
}
