import type { InstalledKitRecord } from '../../shared/kit/constants';
import type { LocalizedText } from './skill';

export interface KitSkillRef {
  id: string;
  name: string;
}

export interface KitSkillBundle {
  bundle: string;
  list: KitSkillRef[];
}

export interface MarketplaceKit {
  id: string;
  name: string | LocalizedText;
  description: string | LocalizedText;
  icon?: string;
  author?: string;
  version?: string;
  downloadCount?: string;
  tryAsking?: (string | LocalizedText)[];
  skills?: KitSkillBundle;
  mcpServers?: unknown[] | null;
  connectors?: unknown[] | null;
}

export type InstalledKit = InstalledKitRecord;
