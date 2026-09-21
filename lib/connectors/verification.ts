import { promises as dns } from 'dns';
import * as cheerio from 'cheerio';
import { VerificationMethod } from './types';

const USER_AGENT = 'TythasControlCenter/1.0 (+https://tythas.example/about-our-crawler)';

export async function verifyDomainOwnership(
  domain: string,
  token: string,
  method: VerificationMethod
): Promise<{ verified: boolean; reason?: string }> {
  const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//i, '').split('/')[0];

  switch (method) {
    case 'DNS_TXT': {
      try {
        const records = await dns.resolveTxt(cleanDomain);
        const flattened = records.map((chunks) => chunks.join('')).map((r) => r.trim());

        const expectedExact = `tythas-site-verification=${token}`;
        const match = flattened.find(
          (rec) => rec === expectedExact || rec === token || rec.includes(expectedExact)
        );

        if (match) {
          return { verified: true };
        }

        return {
          verified: false,
          reason: `No matching TXT record found for "${cleanDomain}". Looked for "tythas-site-verification=${token}". Found ${records.length} other TXT record(s).`,
        };
      } catch (err: any) {
        return {
          verified: false,
          reason: `DNS lookup failed for "${cleanDomain}": ${err?.message || 'Host not found'}. Please check your domain name and DNS configuration.`,
        };
      }
    }

    case 'FILE_UPLOAD': {
      const targetUrl = `https://${cleanDomain}/tythas-verify-${token}.txt`;
      const fallbackUrl = `https://${cleanDomain}/tythas-verification.txt`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        let res = await fetch(targetUrl, {
          headers: { 'User-Agent': USER_AGENT },
          signal: controller.signal,
        });

        if (!res.ok) {
          res = await fetch(fallbackUrl, {
            headers: { 'User-Agent': USER_AGENT },
            signal: controller.signal,
          });
        }
        clearTimeout(timeout);

        if (!res.ok) {
          return {
            verified: false,
            reason: `Verification file not found at ${targetUrl} (HTTP ${res.status}). Ensure the file is uploaded to your website's root directory.`,
          };
        }

        const body = (await res.text()).trim();
        if (body.includes(token)) {
          return { verified: true };
        }

        return {
          verified: false,
          reason: `Verification file found at ${targetUrl}, but content did not match token. Expected token: ${token}`,
        };
      } catch (err: any) {
        return {
          verified: false,
          reason: `Failed to fetch verification file from https://${cleanDomain}: ${err?.message || 'Network timeout'}`,
        };
      }
    }

    case 'META_TAG': {
      const targetUrl = `https://${cleanDomain}/`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(targetUrl, {
          headers: { 'User-Agent': USER_AGENT },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          return {
            verified: false,
            reason: `Failed to fetch homepage at ${targetUrl} (HTTP ${res.status}).`,
          };
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        const metaTag = $('meta[name="tythas-site-verification"]').attr('content')?.trim();

        if (metaTag === token) {
          return { verified: true };
        }

        return {
          verified: false,
          reason: metaTag
            ? `Found <meta name="tythas-site-verification"> with mismatched token "${metaTag}". Expected: "${token}".`
            : `No <meta name="tythas-site-verification" content="${token}"> tag found in the <head> section of ${targetUrl}.`,
        };
      } catch (err: any) {
        return {
          verified: false,
          reason: `Failed to fetch homepage from https://${cleanDomain}: ${err?.message || 'Network timeout'}`,
        };
      }
    }

    case 'CONNECTOR': {
      // Probed via connector's verifyOwnership method
      return {
        verified: false,
        reason: 'Connector verification method must be probed with active connector credentials.',
      };
    }

    default:
      return {
        verified: false,
        reason: `Unsupported verification method: ${method}`,
      };
  }
}
