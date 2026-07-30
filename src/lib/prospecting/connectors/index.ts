import type { Platform } from '../types';
import type { Connector } from './base';
import { xConnector } from './x';
import { redditConnector } from './reddit';

// Registry of implemented connectors. YouTube / Instagram / TikTok / LinkedIn
// slots exist in the data model and policy table; their connectors plug in here
// as they're built against each platform's official API.
const REGISTRY: Partial<Record<Platform, Connector>> = {
  x: xConnector,
  reddit: redditConnector,
};

export function getConnector(platform: Platform): Connector | undefined {
  return REGISTRY[platform];
}

export function implementedPlatforms(): Platform[] {
  return Object.keys(REGISTRY) as Platform[];
}

export type { Connector } from './base';
export { credsFromEnv } from './base';
