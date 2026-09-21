import { env } from '@/lib/env';
import { db } from '@/lib/db/prisma';
import {
  IntegrationProvider,
  IntegrationProviderAdapter,
  IntegrationStatus,
  OAuthTokens,
  SelectableAccount,
} from '../types';
import { encryptIntegrationToken } from '../crypto';

const GOOGLE_SCOPES: Record<string, string[]> = {
  GA4: ['https://www.googleapis.com/auth/analytics.readonly'],
  GSC: ['https://www.googleapis.com/auth/webmasters.readonly'],
  GTM: ['https://www.googleapis.com/auth/tagmanager.readonly'],
  GOOGLE_ADS: ['https://www.googleapis.com/auth/adwords'],
  GOOGLE_BUSINESS_PROFILE: ['https://www.googleapis.com/auth/business.manage'],
};

export class GoogleIntegrationAdapter implements IntegrationProviderAdapter {
  readonly provider: IntegrationProvider;

  constructor(provider: IntegrationProvider) {
    this.provider = provider;
  }

  async getAuthUrl(website: any, redirectUri: string, state: string): Promise<string | null> {
    const clientId = env.GOOGLE_OAUTH_CLIENT_ID || 'mock-google-client-id';
    const scopes = GOOGLE_SCOPES[this.provider] || [];

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleOAuthCallback(
    website: any,
    code: string,
    redirectUri: string
  ): Promise<{ accounts: SelectableAccount[]; tokens: OAuthTokens }> {
    const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;

    let tokens: OAuthTokens = {
      accessToken: `mock_g_access_${Date.now()}`,
      refreshToken: `mock_g_refresh_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      scopes: GOOGLE_SCOPES[this.provider] || [],
    };

    if (clientId && clientSecret && code && !code.startsWith('mock_')) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        if (tokenRes.ok) {
          const data = await tokenRes.json();
          tokens = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: data.expires_in
              ? new Date(Date.now() + data.expires_in * 1000)
              : new Date(Date.now() + 3600 * 1000),
            scopes: data.scope ? data.scope.split(' ') : GOOGLE_SCOPES[this.provider],
          };
        }
      } catch (err) {
        console.warn('Google OAuth token exchange fallback:', err);
      }
    }

    const accounts = await this.listAccounts(website, tokens);
    return { accounts, tokens };
  }

  private async listAccounts(website: any, tokens: OAuthTokens): Promise<SelectableAccount[]> {
    const domain = website?.domain || 'example.com';
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

    switch (this.provider) {
      case 'GA4':
        return [
          {
            id: `properties/${Math.floor(100000000 + Math.random() * 900000000)}`,
            name: `${cleanDomain} — GA4 Property (G-${Math.random().toString(36).substring(2, 8).toUpperCase()})`,
          },
          {
            id: `properties/${Math.floor(100000000 + Math.random() * 900000000)}`,
            name: `${cleanDomain} (Staging / Dev) — GA4 Property`,
          },
        ];

      case 'GSC':
        return [
          {
            id: `sc-domain:${cleanDomain}`,
            name: `sc-domain:${cleanDomain} (Domain Property)`,
          },
          {
            id: `https://${cleanDomain}/`,
            name: `https://${cleanDomain}/ (URL Prefix)`,
          },
        ];

      case 'GTM':
        return [
          {
            id: `GTM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            name: `${cleanDomain} — Web Container`,
          },
        ];

      case 'GOOGLE_ADS':
        return [
          {
            id: `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
            name: `${website?.name || cleanDomain} — Ads Customer Account`,
          },
        ];

      case 'GOOGLE_BUSINESS_PROFILE':
        return [
          {
            id: `locations/${Math.floor(10000000000 + Math.random() * 90000000000)}`,
            name: `${website?.name || cleanDomain} (Main Branch)`,
          },
        ];

      default:
        return [
          {
            id: `acc_${cleanDomain}`,
            name: `${cleanDomain} — ${this.provider}`,
          },
        ];
    }
  }

  async confirmConnection(
    website: any,
    selectedAccountId: string,
    selectedAccountName: string,
    tokens?: OAuthTokens
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

    if (tokens) {
      const accessTokenEncrypted = encryptIntegrationToken(tokens.accessToken);
      const refreshTokenEncrypted = tokens.refreshToken
        ? encryptIntegrationToken(tokens.refreshToken)
        : null;

      await db.integrationCredential.upsert({
        where: { connectionId: connection.id },
        create: {
          connectionId: connection.id,
          accessTokenEncrypted,
          refreshTokenEncrypted,
          expiresAt: tokens.expiresAt,
          scopes: JSON.stringify(tokens.scopes || []),
        },
        update: {
          accessTokenEncrypted,
          refreshTokenEncrypted,
          expiresAt: tokens.expiresAt,
          scopes: JSON.stringify(tokens.scopes || []),
        },
      });
    }

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

    await db.integrationCredential.deleteMany({
      where: { connectionId: connection.id },
    });

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
