import { Capability, Connector, DecryptedCredential, VerificationMethod } from './types';
import { executePublicCrawl } from '@/lib/crawler/crawler';
import { CrawlResult } from '@/lib/crawler/types';
import { verifyDomainOwnership } from './verification';

export class WordPressConnector implements Connector {
  readonly type = 'WORDPRESS' as const;

  async crawlPublic(url: string): Promise<CrawlResult> {
    return executePublicCrawl(url);
  }

  async getCapabilities(credential?: DecryptedCredential): Promise<Capability[]> {
    // Default Audit-Only read capabilities
    const auditOnlyCaps: Capability[] = ['read:content', 'read:seo'];

    if (!credential || !credential.applicationPassword || !credential.username || !credential.apiEndpoint) {
      return auditOnlyCaps;
    }

    try {
      const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/wp-json/tythas-connector/v1/capabilities`;
      const authHeader = 'Basic ' + Buffer.from(`${credential.username}:${credential.applicationPassword}`).toString('base64');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(endpoint, {
        headers: {
          Authorization: authHeader,
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

      // If plugin is authenticated and confirmed, grant standard WordPress write capabilities
      return [
        'read:content',
        'write:content',
        'read:seo',
        'write:seo',
        'read:media',
        'write:media',
        'read:navigation',
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
    if (method === 'CONNECTOR' && credential && credential.applicationPassword) {
      try {
        const baseUrl = credential.apiEndpoint || `https://${domain}`;
        const endpoint = `${baseUrl.replace(/\/$/, '')}/wp-json/tythas-connector/v1/verify?token=${encodeURIComponent(token)}`;
        const authHeader = 'Basic ' + Buffer.from(`${credential.username}:${credential.applicationPassword}`).toString('base64');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(endpoint, {
          headers: {
            Authorization: authHeader,
            'User-Agent': 'TythasControlCenter/1.0',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          return { verified: true };
        }

        return {
          verified: false,
          reason: `WordPress companion plugin rejected verification (HTTP ${res.status}). Verify your application password.`,
        };
      } catch (err: any) {
        return {
          verified: false,
          reason: `Failed to connect to WordPress companion plugin: ${err?.message}`,
        };
      }
    }

    return verifyDomainOwnership(domain, token, method);
  }

  // Write operations (Phase 3: CMS)
  async updatePageContent(
    website: any,
    pageId: string,
    sections: any[],
    credential?: DecryptedCredential
  ): Promise<void> {
    if (!credential?.applicationPassword || !credential?.username || !credential?.apiEndpoint) return;
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/wp-json/tythas-connector/v1/pages/${pageId}/content`;
    const authHeader = 'Basic ' + Buffer.from(`${credential.username}:${credential.applicationPassword}`).toString('base64');
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
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
    if (!credential?.applicationPassword || !credential?.username || !credential?.apiEndpoint) return;
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/wp-json/wp/v2/pages/${pageId}`;
    const authHeader = 'Basic ' + Buffer.from(`${credential.username}:${credential.applicationPassword}`).toString('base64');
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0',
        },
        body: JSON.stringify(meta),
      });
    } catch {}
  }

  async publishContent(
    website: any,
    contentType: 'page' | 'post',
    contentId: string,
    credential?: DecryptedCredential
  ): Promise<void> {
    if (!credential?.applicationPassword || !credential?.username || !credential?.apiEndpoint) return;
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/wp-json/wp/v2/${contentType === 'post' ? 'posts' : 'pages'}/${contentId}`;
    const authHeader = 'Basic ' + Buffer.from(`${credential.username}:${credential.applicationPassword}`).toString('base64');
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0',
        },
        body: JSON.stringify({ status: 'publish' }),
      });
    } catch {}
  }

  async updatePost(
    website: any,
    postId: string,
    postData: any,
    credential?: DecryptedCredential
  ): Promise<void> {
    if (!credential?.applicationPassword || !credential?.username || !credential?.apiEndpoint) return;
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/wp-json/wp/v2/posts/${postId}`;
    const authHeader = 'Basic ' + Buffer.from(`${credential.username}:${credential.applicationPassword}`).toString('base64');
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0',
        },
        body: JSON.stringify(postData),
      });
    } catch {}
  }

  async updateMedia(
    website: any,
    mediaId: string,
    meta: { altText?: string; caption?: string; title?: string },
    credential?: DecryptedCredential
  ): Promise<void> {
    if (!credential?.applicationPassword || !credential?.username || !credential?.apiEndpoint) return;
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/wp-json/wp/v2/media/${mediaId}`;
    const authHeader = 'Basic ' + Buffer.from(`${credential.username}:${credential.applicationPassword}`).toString('base64');
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0',
        },
        body: JSON.stringify({
          alt_text: meta.altText,
          caption: meta.caption,
          title: meta.title,
        }),
      });
    } catch {}
  }

  async updateNavigation(
    website: any,
    menuId: string,
    items: any[],
    credential?: DecryptedCredential
  ): Promise<void> {
    if (!credential?.applicationPassword || !credential?.username || !credential?.apiEndpoint) return;
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/wp-json/tythas-connector/v1/navigation/${menuId}`;
    const authHeader = 'Basic ' + Buffer.from(`${credential.username}:${credential.applicationPassword}`).toString('base64');
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0',
        },
        body: JSON.stringify({ items }),
      });
    } catch {}
  }

  // Phase 4 & 5
  async publishRedirects(domain: string, redirects: { fromPath: string; toPath: string; type: string }[], credential?: DecryptedCredential): Promise<void> {
    if (!credential || !credential.applicationPassword || !credential.username || !credential.apiEndpoint) {
      return;
    }
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/wp-json/tythas-connector/v1/redirects`;
    const authHeader = 'Basic ' + Buffer.from(`${credential.username}:${credential.applicationPassword}`).toString('base64');
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0'
        },
        body: JSON.stringify({ redirects })
      });
    } catch {}
  }

  async publishRobotsTxt(domain: string, content: string, credential?: DecryptedCredential): Promise<void> {
    if (!credential || !credential.applicationPassword || !credential.username || !credential.apiEndpoint) {
      return;
    }
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/wp-json/tythas-connector/v1/robots-txt`;
    const authHeader = 'Basic ' + Buffer.from(`${credential.username}:${credential.applicationPassword}`).toString('base64');
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'TythasControlCenter/1.0'
        },
        body: JSON.stringify({ content })
      });
    } catch {}
  }

  async publishSitemap(domain: string, urls: string[], credential?: DecryptedCredential): Promise<{ urlCount: number }> {
    if (!credential || !credential.applicationPassword || !credential.username || !credential.apiEndpoint) {
      return { urlCount: urls.length };
    }
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/wp-json/tythas-connector/v1/sitemap`;
    const authHeader = 'Basic ' + Buffer.from(`${credential.username}:${credential.applicationPassword}`).toString('base64');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
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
    if (!credential || !credential.applicationPassword || !credential.username || !credential.apiEndpoint) {
      return;
    }
    const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/wp-json/tythas-connector/v1/schema`;
    const authHeader = 'Basic ' + Buffer.from(`${credential.username}:${credential.applicationPassword}`).toString('base64');
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
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
    // Generate HTML embed snippet fallback
    const formFields = Array.isArray(form.fields) ? form.fields : [];
    const fieldsHtml = formFields
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      .map((f: any) => {
        const reqAttr = f.required ? ' required' : '';
        const nameAttr = `name="${f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}"`;
        if (f.type === 'DROPDOWN') {
          let opts = [];
          try {
            opts = typeof f.options === 'string' ? JSON.parse(f.options) : f.options || [];
          } catch {
            opts = [];
          }
          const optionsHtml = opts.map((o: string) => `<option value="${o}">${o}</option>`).join('\n      ');
          return `  <div class="form-group mb-3">\n    <label class="form-label">${f.label}</label>\n    <select ${nameAttr} class="form-control"${reqAttr}>\n      <option value="">Select an option...</option>\n      ${optionsHtml}\n    </select>\n  </div>`;
        }
        if (f.type === 'TEXTAREA') {
          return `  <div class="form-group mb-3">\n    <label class="form-label">${f.label}</label>\n    <textarea ${nameAttr} placeholder="${f.placeholder || ''}" class="form-control"${reqAttr}></textarea>\n  </div>`;
        }
        const inputType = f.type.toLowerCase() === 'phone' ? 'tel' : f.type.toLowerCase();
        return `  <div class="form-group mb-3">\n    <label class="form-label">${f.label}</label>\n    <input type="${inputType}" ${nameAttr} placeholder="${f.placeholder || ''}" class="form-control"${reqAttr} />\n  </div>`;
      })
      .join('\n');

    const embedSnippet = `<!-- Tythas Form: ${form.name} -->\n<form action="/api/public/forms/${form.publicKey}/submissions" method="POST" class="tythas-lead-form">\n  <!-- Anti-spam Honeypot -->\n  <input type="text" name="_hp_company" style="display:none!important;" tabindex="-1" autocomplete="off" />\n${fieldsHtml}\n  <button type="submit" class="btn btn-primary">Submit</button>\n</form>`;

    // If WordPress companion plugin has form-deployment endpoint
    if (credential?.apiEndpoint && credential?.applicationPassword && credential?.username) {
      const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/wp-json/tythas-connector/v1/forms/deploy`;
      const authHeader = 'Basic ' + Buffer.from(`${credential.username}:${credential.applicationPassword}`).toString('base64');
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
            'User-Agent': 'TythasControlCenter/1.0'
          },
          body: JSON.stringify({ form, snippet: embedSnippet })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.deployed) {
            return { deployed: true, embedSnippet };
          }
        }
      } catch {}
    }

    // Default WordPress fallback per Spec §41
    return { deployed: false, embedSnippet };
  }

  async syncCustomScripts(
    website: any,
    scripts: any[],
    credential?: DecryptedCredential
  ): Promise<{ synced: boolean }> {
    if (credential?.apiEndpoint && credential?.applicationPassword && credential?.username) {
      const endpoint = `${credential.apiEndpoint.replace(/\/$/, '')}/wp-json/tythas-connector/v1/scripts`;
      const authHeader = 'Basic ' + Buffer.from(`${credential.username}:${credential.applicationPassword}`).toString('base64');
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
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

