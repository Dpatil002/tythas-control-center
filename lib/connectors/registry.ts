import { Connector } from './types';
import { WordPressConnector } from './wordpress';
import { CustomConnector } from './custom';

const wpConnector = new WordPressConnector();
const customConnector = new CustomConnector();

export function getConnector(type: string): Connector {
  const normalized = type.toUpperCase();
  if (normalized === 'WORDPRESS') {
    return wpConnector;
  }
  if (normalized === 'CUSTOM') {
    return customConnector;
  }
  // Default to Custom connector for public crawl / fallback
  return customConnector;
}
