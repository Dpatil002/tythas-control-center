import {
  IntegrationProvider,
  IntegrationProviderAdapter,
} from './types';
import { GoogleIntegrationAdapter } from './adapters/google';
import { MetaIntegrationAdapter } from './adapters/meta';
import { ClarityIntegrationAdapter } from './adapters/clarity';

const adapters: Record<IntegrationProvider, IntegrationProviderAdapter> = {
  GA4: new GoogleIntegrationAdapter('GA4'),
  GSC: new GoogleIntegrationAdapter('GSC'),
  GTM: new GoogleIntegrationAdapter('GTM'),
  GOOGLE_ADS: new GoogleIntegrationAdapter('GOOGLE_ADS'),
  GOOGLE_BUSINESS_PROFILE: new GoogleIntegrationAdapter('GOOGLE_BUSINESS_PROFILE'),
  META: new MetaIntegrationAdapter(),
  MS_CLARITY: new ClarityIntegrationAdapter(),
};

export function getIntegrationAdapter(provider: string): IntegrationProviderAdapter {
  const adapter = adapters[provider as IntegrationProvider];
  if (!adapter) {
    throw new Error(`Unsupported integration provider: ${provider}`);
  }
  return adapter;
}

export function isIntegrationProvider(val: string): val is IntegrationProvider {
  return val in adapters;
}
