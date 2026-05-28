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
  mcpServers?: any;
  connectors?: any;
}

export interface InstalledKit {
  id: string;
  version: string;
  installedAt: number;
  skillIds: string[];
}
