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

export class MetaIntegrationAdapter implements IntegrationProviderAdapter {
  readonly provider: IntegrationProvider = 'META';

  async getAuthUrl(website: any, redirectUri: string, state: string): Promise<string | null> {
    const appId = env.META_APP_ID || 'mock-meta-app-id';
    const scopes = ['ads_read', 'business_management'];

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      scope: scopes.join(','),
      response_type: 'code',
    });

    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  }

  async handleOAuthCallback(
    website: any,
    code: string,
    redirectUri: string
  ): Promise<{ accounts: SelectableAccount[]; tokens: OAuthTokens }> {
    const appId = env.META_APP_ID;
    const appSecret = env.META_APP_SECRET;

    let tokens: OAuthTokens = {
      accessToken: `mock_meta_access_${Date.now()}`,
      expiresAt: new Date(Date.now() + 60 * 86400 * 1000), // 60 days
      scopes: ['ads_read', 'business_management'],
    };

    if (appId && appSecret && code && !code.startsWith('mock_')) {
      try {
        const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        }).toString()}`;

        const res = await fetch(tokenUrl);
        if (res.ok) {
          const data = await res.json();
          tokens = {
            accessToken: data.access_token,
            expiresAt: data.expires_in
              ? new Date(Date.now() + data.expires_in * 1000)
              : new Date(Date.now() + 60 * 86400 * 1000),
            scopes: ['ads_read', 'business_management'],
          };
        }
      } catch (err) {
        console.warn('Meta OAuth token exchange fallback:', err);
      }
    }

    const domain = website?.domain || 'example.com';
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

    const accounts: SelectableAccount[] = [
      {
        id: `${Math.floor(100000000000000 + Math.random() * 900000000000000)}`,
        name: `${website?.name || cleanDomain} Pixel (Dataset)`,
      },
    ];

    return { accounts, tokens };
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
