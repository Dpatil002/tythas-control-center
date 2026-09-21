export type IssueCategory = 'TECHNICAL' | 'PERFORMANCE' | 'CONTENT';
export type IssueSeverity = 'CRITICAL' | 'ATTENTION' | 'HEALTHY' | 'NOT_CONFIGURED';

export interface CrawledPageData {
  url: string;
  httpStatus: number;
  metaTitle: string | null;
  metaDescription: string | null;
  h1: string | null;
  h1Count: number;
  canonical: string | null;
  isIndexable: boolean;
  noIndexReason?: string;
  missingAltImages: number;
  totalImages: number;
  wordCount: number;
  schemaTypes: string[];
  redirectChain: string[];
  loadTimeMs: number;
  internalLinks: string[];
}

export interface CrawlProgress {
  stage: 'initializing' | 'fetching_robots' | 'discovering_sitemaps' | 'crawling_pages' | 'running_audits' | 'complete' | 'failed';
  stageLabel: string;
  pagesCrawled: number;
  pagesTotal: number;
  currentUrl?: string;
  error?: string;
}

export interface CrawlResult {
  domain: string;
  normalizedUrl: string;
  pages: CrawledPageData[];
  sslValid: boolean;
  sslExpiryDays?: number;
  robotsFound: boolean;
  sitemapFound: boolean;
  sitemapUrls: string[];
  detectedCms: string | null;
  detectedBuilder: string | null;
  disallowedPatterns: string[];
  totalBrokenLinks: number;
}

export interface CheckIssue {
  category: IssueCategory;
  severity: IssueSeverity;
  checkKey: string;
  title: string;
  detail: string;
  affectedCount: number;
}
