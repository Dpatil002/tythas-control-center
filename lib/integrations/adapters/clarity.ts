import * as cheerio from 'cheerio';
import { db } from '@/lib/db/prisma';
import {
  IntegrationProvider,
  IntegrationProviderAdapter,
  IntegrationStatus,
  OAuthTokens,
  SelectableAccount,
} from '../types';

export class ClarityIntegrationAdapter implements IntegrationProviderAdapter {
  readonly provider: IntegrationProvider = 'MS_CLARITY';

  async getAuthUrl(_website: any, _redirectUri: string, _state: string): Promise<string | null> {
    // Clarity has no OAuth write API (spec §46)
    return null;
  }

  async handleOAuthCallback(
    _website: any,
    _code: string,
    _redirectUri: string
  ): Promise<{ accounts: SelectableAccount[]; tokens: OAuthTokens }> {
    throw new Error('Microsoft Clarity uses guided tag installation, not OAuth.');
  }

  getClarityProjectId(website: any): string {
    // Stable unguessable Clarity Project ID based on website id
    const cleanId = (website?.id || 'site').replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    return `tyth_${cleanId}`;
  }

  getTrackingTagSnippet(website: any): string {
    const projectId = this.getClarityProjectId(website);
    return `<script type="text/javascript">
(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${projectId}");
</script>`;
  }

  async verifyTagInstallation(
    website: any
  ): Promise<{ verified: boolean; message: string }> {
    const domain = website.domain;
    const url = domain.startsWith('http') ? domain : `https://${domain}`;
    const projectId = this.getClarityProjectId(website);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'TythasControlCenter/1.0 ClarityVerifier',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          verified: false,
          message: `Could not reach ${url} (HTTP ${res.status}). Please check website availability.`,
        };
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      let found = false;
      $('script').each((_, elem) => {
        const src = $(elem).attr('src') || '';
        const inline = $(elem).html() || '';
        if (
          src.includes('clarity.ms/tag/') ||
          inline.includes('clarity.ms/tag/') ||
          inline.includes(projectId) ||
          (inline.includes('clarity') && inline.includes('https://www.clarity.ms/tag/'))
        ) {
          found = true;
          return false;
        }
      });

      if (found) {
        await this.confirmConnection(
          website,
          projectId,
          `${website.name || domain} — Clarity Project (${projectId})`
        );
        return {
          verified: true,
          message: 'Microsoft Clarity tracking tag successfully verified!',
        };
      }

      return {
        verified: false,
        message:
          "We couldn't find the tracking tag yet — it can take a few minutes to appear after installing, or double-check it was added to every page.",
      };
    } catch (err: any) {
      return {
        verified: false,
        message:
          "We couldn't find the tracking tag yet — it can take a few minutes to appear after installing, or double-check it was added to every page.",
      };
    }
  }

  async confirmConnection(
    website: any,
    selectedAccountId: string,
    selectedAccountName: string
  ): Promise<any> {
    const existing = await db.integrationConnection.findUnique({
      where: {
        websiteId_provider: {
          websiteId: website.id,
          provider: this.provider,
        },
      },
    });

    const connection = existing
      ? await db.integrationConnection.update({
          where: { id: existing.id },
          data: {
            status: 'CONNECTED',
            externalAccountId: selectedAccountId,
            externalAccountName: selectedAccountName,
            connectedAt: new Date(),
            lastSyncedAt: new Date(),
            lastError: null,
          },
        })
      : await db.integrationConnection.create({
          data: {
            websiteId: website.id,
            provider: this.provider,
            status: 'CONNECTED',
            externalAccountId: selectedAccountId,
            externalAccountName: selectedAccountName,
            connectedAt: new Date(),
            lastSyncedAt: new Date(),
            lastError: null,
          },
        });

    return connection;
  }

  async checkStatus(connection: any): Promise<IntegrationStatus> {
    if (!connection || connection.status !== 'CONNECTED') {
      return 'NOT_CONNECTED';
    }
    return 'CONNECTED';
  }

  async disconnect(connection: any): Promise<void> {
    if (!connection) return;

    await db.integrationConnection.update({
      where: { id: connection.id },
      data: {
        status: 'NOT_CONNECTED',
        externalAccountId: null,
        externalAccountName: null,
        connectedAt: null,
        lastError: null,
      },
    });
  }
}
