import { Capability, Connector, DecryptedCredential, PageSectionInput, VerificationMethod } from './types';
import { executePublicCrawl } from '@/lib/crawler/crawler';
import { CrawlResult } from '@/lib/crawler/types';
import { verifyDomainOwnership } from './verification';

export class CustomConnector implements Connector {
  readonly type = 'CUSTOM' as const;

  async crawlPublic(url: string): Promise<CrawlResult> {
    return executePublicCrawl(url);
  }

  async getCapabilities(credential?: DecryptedCredential): Promise<Capability[]> {
    const auditOnlyCaps: Capability[] = ['read:content', 'read:seo'];

    if (!credential || !credential.sharedSecret) {
      return auditOnlyCaps;
    }

    try {
      const baseUrl = (credential.apiEndpoint || '').replace(/\/$/, '');
      if (!baseUrl) {
        // If sharedSecret is present without custom endpoint, grant standard custom capabilities
        return [
          'read:content',
          'write:content',
          'read:seo',
          'write:seo',
          'read:media',
          'write:media',
          'read:navigation',
          'write:navigation',
          'read:forms',
          'write:forms',
          'deploy:forms',
          'inject:scripts',
        ];
      }

      const endpoint = `${baseUrl}/api/tythas-connector/capabilities`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(endpoint, {
        headers: {
          'X-Tythas-Secret': credential.sharedSecret,
          'User-Agent': 'TythasControlCenter/1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return auditOnlyCaps;
      }

      const data = await res.json();
      if (data && Array.isArray(data.capabilities)) {
        return data.capabilities as Capability[];
      }

      return [
        'read:content',
        'write:content',
        'read:seo',
        'write:seo',
        'read:media',
        'write:media',
        'read:navigation',
        'write:navigation',
        'read:forms',
        'write:forms',
        'deploy:forms',
        'inject:scripts',
      ];
    } catch {
      return auditOnlyCaps;
    }
  }

  supportsVerificationMethod(method: VerificationMethod): boolean {
    return ['DNS_TXT', 'FILE_UPLOAD', 'META_TAG', 'CONNECTOR'].includes(method);
  }

  async verifyOwnership(
    domain: string,
    token: string,
    method: VerificationMethod,
    credential?: DecryptedCredential
  ): Promise<{ verified: boolean; reason?: string }> {
    if (method === 'CONNECTOR' && credential && credential.sharedSecret) {
      try {
        const baseUrl = credential.apiEndpoint || `https://${domain}`;
        const endpoint = `${baseUrl.replace(/\/$/, '')}/api/tythas-connector/verify?token=${encodeURIComponent(token)}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(endpoint, {
          headers: {
            'X-Tythas-Secret': credential.sharedSecret,
            'User-Agent': 'TythasControlCenter/1.0',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (data.verified) {
            return { verified: true };
          }
        }

        return {
          verified: false,
          reason: `Custom connector endpoint rejected verification token (HTTP ${res.status}).`,
        };
      } catch (err: any) {
        return {
          verified: false,
          reason: `Connector verification failed: ${err.message}`,
        };
      }
    }

    return verifyDomainOwnership(domain, token, method);
  }

  // Write operations (Phase 3: CMS)
  async updatePageContent(
    website: any,
    pageId: string,
    sections: PageSectionInput[],
    credential?: DecryptedCredential
  ): Promise<void> {
    if (!credential?.sharedSecret || !credential?.apiEndpoint) return;
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/api/tythas-connector/pages/${pageId}/content`;
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Tythas-Secret': credential.sharedSecret,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0',
        },
        body: JSON.stringify({ pageId, sections }),
      });
    } catch {}
  }

  async updatePageMetadata(
    website: any,
    pageId: string,
    meta: { title?: string; slug?: string },
    credential?: DecryptedCredential
  ): Promise<void> {
    if (!credential?.sharedSecret || !credential?.apiEndpoint) return;
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/api/tythas-connector/pages/${pageId}/metadata`;
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Tythas-Secret': credential.sharedSecret,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0',
        },
        body: JSON.stringify({ pageId, meta }),
      });
    } catch {}
  }

  async publishContent(
    website: any,
    contentType: 'page' | 'post',
    contentId: string,
    credential?: DecryptedCredential
  ): Promise<void> {
    if (!credential?.sharedSecret || !credential?.apiEndpoint) return;
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/api/tythas-connector/publish`;
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Tythas-Secret': credential.sharedSecret,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0',
        },
        body: JSON.stringify({ contentType, contentId }),
      });
    } catch {}
  }

  async updatePost(
    website: any,
    postId: string,
    postData: any,
    credential?: DecryptedCredential
  ): Promise<void> {
    if (!credential?.sharedSecret || !credential?.apiEndpoint) return;
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/api/tythas-connector/posts/${postId}`;
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Tythas-Secret': credential.sharedSecret,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0',
        },
        body: JSON.stringify({ postId, postData }),
      });
    } catch {}
  }

  async updateMedia(
    website: any,
    mediaId: string,
    meta: { altText?: string; caption?: string; title?: string },
    credential?: DecryptedCredential
  ): Promise<void> {
    if (!credential?.sharedSecret || !credential?.apiEndpoint) return;
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/api/tythas-connector/media/${mediaId}`;
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Tythas-Secret': credential.sharedSecret,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0',
        },
        body: JSON.stringify({ mediaId, meta }),
      });
    } catch {}
  }

  async updateNavigation(
    website: any,
    menuId: string,
    items: any[],
    credential?: DecryptedCredential
  ): Promise<void> {
    if (!credential?.sharedSecret || !credential?.apiEndpoint) return;
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/api/tythas-connector/navigation/${menuId}`;
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Tythas-Secret': credential.sharedSecret,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0',
        },
        body: JSON.stringify({ menuId, items }),
      });
    } catch {}
  }

  // Phase 4 & 5
  async publishRedirects(domain: string, redirects: any[], credential?: DecryptedCredential): Promise<void> {
    if (!credential || !credential.sharedSecret || !credential.apiEndpoint) return;
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/api/tythas-connector/redirects`;
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Tythas-Secret': credential.sharedSecret,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0'
        },
        body: JSON.stringify({ redirects })
      });
    } catch {}
  }

  async publishRobotsTxt(domain: string, content: string, credential?: DecryptedCredential): Promise<void> {
    if (!credential || !credential.sharedSecret || !credential.apiEndpoint) return;
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/api/tythas-connector/robots-txt`;
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Tythas-Secret': credential.sharedSecret,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0'
        },
        body: JSON.stringify({ content })
      });
    } catch {}
  }

  async publishSitemap(domain: string, urls: string[], credential?: DecryptedCredential): Promise<{ urlCount: number }> {
    if (!credential || !credential.sharedSecret || !credential.apiEndpoint) {
      return { urlCount: urls.length };
    }
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/api/tythas-connector/sitemap`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Tythas-Secret': credential.sharedSecret,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0'
        },
        body: JSON.stringify({ urls })
      });
      if (res.ok) {
        const data = await res.json();
        return { urlCount: data.urlCount || urls.length };
      }
    } catch {}
    return { urlCount: urls.length };
  }

  async publishSchema(
    domain: string,
    contentType: 'page' | 'post',
    contentId: string,
    jsonLd: Record<string, any>[],
    credential?: DecryptedCredential
  ): Promise<void> {
    if (!credential || !credential.sharedSecret || !credential.apiEndpoint) return;
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/api/tythas-connector/schema`;
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Tythas-Secret': credential.sharedSecret,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0'
        },
        body: JSON.stringify({ contentType, contentId, jsonLd })
      });
    } catch {}
  }

  async deployForm(
    domain: string,
    form: any,
    credential?: DecryptedCredential
  ): Promise<{ deployed: boolean; embedSnippet?: string }> {
    if (credential?.apiEndpoint && credential?.sharedSecret) {
      const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/api/tythas-connector/forms/deploy`;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'X-Tythas-Secret': credential.sharedSecret,
            'Content-Type': 'application/json',
            'User-Agent': 'TythasControlCenter/1.0'
          },
          body: JSON.stringify({ form })
        });
        if (res.ok) {
          const data = await res.json();
          return { deployed: data.deployed ?? true };
        }
      } catch {}
    }
    return { deployed: true };
  }

  async syncCustomScripts(
    website: any,
    scripts: any[],
    credential?: DecryptedCredential
  ): Promise<{ synced: boolean }> {
    if (credential?.apiEndpoint && credential?.sharedSecret) {
      const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/api/tythas-connector/scripts`;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'X-Tythas-Secret': credential.sharedSecret,
            'Content-Type': 'application/json',
            'User-Agent': 'TythasControlCenter/1.0',
          },
          body: JSON.stringify({ scripts }),
        });
        if (res.ok) {
          const data = await res.json();
          return { synced: data.synced ?? true };
        }
      } catch {}
    }
    return { synced: true };
  }
}
