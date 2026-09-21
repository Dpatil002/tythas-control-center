import { CrawlResult } from '@/lib/crawler/types';

export type Capability =
  | 'read:content'
  | 'write:content'
  | 'read:seo'
  | 'write:seo'
  | 'read:media'
  | 'write:media'
  | 'read:navigation'
  | 'write:navigation'
  | 'read:forms'
  | 'write:forms'
  | 'deploy:forms'
  | 'inject:scripts';

export type VerificationMethod = 'DNS_TXT' | 'FILE_UPLOAD' | 'META_TAG' | 'CONNECTOR';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';

export interface DecryptedCredential {
  type: 'WORDPRESS' | 'CUSTOM';
  applicationPassword?: string;
  username?: string;
  sharedSecret?: string;
  apiEndpoint?: string;
  scopes?: string[];
}

export interface RedirectInput {
  fromPath: string;
  toPath: string;
  type: string;
}

export interface CustomScriptInput {
  id: string;
  name: string;
  scope: string;
  pageId?: string | null;
  placement: string;
  code: string;
  status: string;
}

export interface FormWithFields {
  id: string;
  name: string;
  status: string;
  publicKey: string;
  successMessage?: string | null;
  redirectUrl?: string | null;
  fields: Array<{
    id: string;
    type: string;
    label: string;
    placeholder?: string | null;
    required: boolean;
    order: number;
    options?: string[] | string;
    validation?: string | null;
  }>;
  actions?: Array<{
    id: string;
    type: string;
    enabled: boolean;
    order: number;
    config: any;
  }>;
}

export interface PageSectionInput {
  id?: string;
  type: string;
  order: number;
  content: any;
}

export interface Connector {
  readonly type: 'WORDPRESS' | 'CUSTOM';

  // Read operations (public crawl)
  crawlPublic(url: string): Promise<CrawlResult>;

  // Introspect capabilities for a site
  getCapabilities(credential?: DecryptedCredential): Promise<Capability[]>;

  // Verification support
  supportsVerificationMethod(method: VerificationMethod): boolean;

  verifyOwnership(
    domain: string,
    token: string,
    method: VerificationMethod,
    credential?: DecryptedCredential
  ): Promise<{ verified: boolean; reason?: string }>;

  // Write operations (Phase 3: CMS)
  updatePageContent(website: any, pageId: string, sections: PageSectionInput[], credential?: DecryptedCredential): Promise<void>;
  updatePageMetadata(website: any, pageId: string, meta: { title?: string; slug?: string }, credential?: DecryptedCredential): Promise<void>;
  publishContent(website: any, contentType: 'page' | 'post', contentId: string, credential?: DecryptedCredential): Promise<void>;
  updatePost(website: any, postId: string, postData: any, credential?: DecryptedCredential): Promise<void>;
  updateMedia(website: any, mediaId: string, meta: { altText?: string; caption?: string; title?: string }, credential?: DecryptedCredential): Promise<void>;
  updateNavigation(website: any, menuId: string, items: any[], credential?: DecryptedCredential): Promise<void>;

  // Write operations (Phase 4: SEO)
  publishRedirects(domain: string, redirects: RedirectInput[], credential?: DecryptedCredential): Promise<void>;
  publishRobotsTxt(domain: string, content: string, credential?: DecryptedCredential): Promise<void>;
  publishSitemap(domain: string, urls: string[], credential?: DecryptedCredential): Promise<{ urlCount: number }>;
  publishSchema(
    domain: string,
    contentType: 'page' | 'post',
    contentId: string,
    jsonLd: Record<string, any>[],
    credential?: DecryptedCredential
  ): Promise<void>;

  // Phase 5: Forms & Leads
  deployForm(domain: string, form: FormWithFields, credential?: DecryptedCredential): Promise<{ deployed: boolean; embedSnippet?: string }>;

  // Phase 6: Custom Scripts
  syncCustomScripts(website: any, scripts: CustomScriptInput[], credential?: DecryptedCredential): Promise<{ synced: boolean }>;
}


