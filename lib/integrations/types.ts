export type IntegrationProvider =
  | 'GA4'
  | 'GSC'
  | 'GTM'
  | 'GOOGLE_ADS'
  | 'META'
  | 'MS_CLARITY'
  | 'GOOGLE_BUSINESS_PROFILE';

export type IntegrationStatus = 'NOT_CONNECTED' | 'CONNECTED' | 'ERROR';

export type ConversionClassification = 'PRIMARY' | 'SECONDARY';

export interface SelectableAccount {
  id: string;
  name: string;
  extra?: Record<string, any>;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
}

export interface IntegrationProviderAdapter {
  readonly provider: IntegrationProvider;
  getAuthUrl(website: any, redirectUri: string, state: string): Promise<string | null>;
  handleOAuthCallback(
    website: any,
    code: string,
    redirectUri: string
  ): Promise<{ accounts: SelectableAccount[]; tokens: OAuthTokens }>;
  confirmConnection(
    website: any,
    selectedAccountId: string,
    selectedAccountName: string,
    tokens?: OAuthTokens
  ): Promise<any>;
  checkStatus(connection: any): Promise<IntegrationStatus>;
  disconnect(connection: any): Promise<void>;
}

export const ALL_INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  'GA4',
  'GSC',
  'GTM',
  'GOOGLE_ADS',
  'META',
  'MS_CLARITY',
  'GOOGLE_BUSINESS_PROFILE',
];

export const PROVIDER_DISPLAY_NAMES: Record<IntegrationProvider, string> = {
  GA4: 'Google Analytics 4',
  GSC: 'Google Search Console',
  GTM: 'Google Tag Manager',
  GOOGLE_ADS: 'Google Ads',
  META: 'Meta Pixel & CAPI',
  MS_CLARITY: 'Microsoft Clarity',
  GOOGLE_BUSINESS_PROFILE: 'Google Business Profile',
};
