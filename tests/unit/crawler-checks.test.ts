import { describe, it, expect } from 'vitest';
import { detectCmsAndBuilder } from '@/lib/crawler/crawler';
import { runAnalysisChecks } from '@/lib/crawler/checks';
import { CrawlResult, CrawledPageData } from '@/lib/crawler/types';
import { encryptConnectorData, decryptConnectorData } from '@/lib/connectors/crypto';

describe('Crawler & CMS Detection', () => {
  it('detects WordPress and Elementor from HTML markup', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="generator" content="WordPress 6.4.2" />
          <link rel="stylesheet" href="/wp-content/plugins/elementor/assets/css/frontend.min.css" />
        </head>
        <body class="elementor-default elementor-page">
          <h1>Welcome</h1>
        </body>
      </html>
    `;

    const result = detectCmsAndBuilder(html);
    expect(result.detectedCms).toBe('WordPress');
    expect(result.detectedBuilder).toBe('Elementor');
  });

  it('detects Webflow from generator and body classes', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="generator" content="Webflow" />
        </head>
        <body class="w-nav">
          <h1>Modern Agency</h1>
        </body>
      </html>
    `;

    const result = detectCmsAndBuilder(html);
    expect(result.detectedCms).toBe('Webflow');
  });
});

describe('Diagnostic Check Suite', () => {
  it('produces accurate Technical, Performance, and Content issues', async () => {
    const mockPages: CrawledPageData[] = [
      {
        url: 'https://example.com/',
        httpStatus: 200,
        metaTitle: 'Home Page',
        metaDescription: 'Welcome to our site',
        h1: 'Home Title',
        h1Count: 1,
        canonical: 'https://example.com/',
        isIndexable: true,
        missingAltImages: 0,
        totalImages: 2,
        wordCount: 350,
        schemaTypes: ['WebSite', 'Organization'],
        redirectChain: [],
        loadTimeMs: 180,
        internalLinks: ['https://example.com/about', 'https://example.com/broken'],
      },
      {
        url: 'https://example.com/about',
        httpStatus: 200,
        metaTitle: null, // missing title!
        metaDescription: null, // missing desc!
        h1: null, // missing h1!
        h1Count: 0,
        canonical: null, // missing canonical!
        isIndexable: true,
        missingAltImages: 3, // 3 missing alt images!
        totalImages: 4,
        wordCount: 120,
        schemaTypes: [],
        redirectChain: [],
        loadTimeMs: 250,
        internalLinks: [],
      },
      {
        url: 'https://example.com/broken',
        httpStatus: 404, // broken link!
        metaTitle: null,
        metaDescription: null,
        h1: null,
        h1Count: 0,
        canonical: null,
        isIndexable: false,
        noIndexReason: 'HTTP 404',
        missingAltImages: 0,
        totalImages: 0,
        wordCount: 0,
        schemaTypes: [],
        redirectChain: [],
        loadTimeMs: 90,
        internalLinks: [],
      },
    ];

    const mockCrawl: CrawlResult = {
      domain: 'example.com',
      normalizedUrl: 'https://example.com',
      pages: mockPages,
      sslValid: true,
      sslExpiryDays: 120,
      robotsFound: true,
      sitemapFound: true,
      sitemapUrls: ['https://example.com/sitemap.xml'],
      detectedCms: 'WordPress',
      detectedBuilder: 'Elementor',
      disallowedPatterns: [],
      totalBrokenLinks: 1,
    };

    const issues = await runAnalysisChecks(mockCrawl);

    // Verify critical broken internal link check
    const brokenLinkIssue = issues.find((i) => i.checkKey === 'broken_internal_links');
    expect(brokenLinkIssue).toBeDefined();
    expect(brokenLinkIssue?.severity).toBe('CRITICAL');
    expect(brokenLinkIssue?.affectedCount).toBe(1);

    // Verify missing meta title check
    const missingTitleIssue = issues.find((i) => i.checkKey === 'missing_meta_title');
    expect(missingTitleIssue).toBeDefined();
    expect(missingTitleIssue?.severity).toBe('CRITICAL');
    expect(missingTitleIssue?.affectedCount).toBe(1);

    // Verify missing meta description check
    const missingDescIssue = issues.find((i) => i.checkKey === 'missing_meta_description');
    expect(missingDescIssue).toBeDefined();
    expect(missingDescIssue?.severity).toBe('ATTENTION');
    expect(missingDescIssue?.affectedCount).toBe(1);

    // Verify missing alt text check
    const missingAltIssue = issues.find((i) => i.checkKey === 'missing_alt_text');
    expect(missingAltIssue).toBeDefined();
    expect(missingAltIssue?.severity).toBe('ATTENTION');
    expect(missingAltIssue?.affectedCount).toBe(3);

    // Verify SSL check is HEALTHY
    const sslIssue = issues.find((i) => i.checkKey === 'ssl_certificate');
    expect(sslIssue).toBeDefined();
    expect(sslIssue?.severity).toBe('HEALTHY');
  });
});

describe('Connector Credential Encryption', () => {
  it('encrypts and decrypts connector credentials safely at rest', () => {
    const secretPayload = {
      type: 'WORDPRESS',
      username: 'wp_admin',
      applicationPassword: 'abcd efgh 1234 5678',
      apiEndpoint: 'https://client-site.example',
    };

    const encrypted = encryptConnectorData(secretPayload);
    expect(encrypted).not.toContain('abcd efgh 1234 5678');
    expect(encrypted).not.toContain('wp_admin');

    const decrypted = decryptConnectorData<typeof secretPayload>(encrypted);
    expect(decrypted.username).toBe('wp_admin');
    expect(decrypted.applicationPassword).toBe('abcd efgh 1234 5678');
    expect(decrypted.apiEndpoint).toBe('https://client-site.example');
  });
});
