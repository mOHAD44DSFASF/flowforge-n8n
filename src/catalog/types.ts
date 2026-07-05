export interface CatalogParameter {
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
  displayOptions?: Record<string, unknown>;
}

export interface CatalogCredential {
  name: string;
  required: boolean;
}

export interface CatalogNode {
  type: string;
  displayName: string;
  versions: number[];
  latestVersion: number;
  parameters: CatalogParameter[];
  credentials: CatalogCredential[];
  displayOptions?: Record<string, unknown>;
}

export interface NodeCatalogSnapshot {
  sourceN8nVersion: string;
  generatedAt: string;
  nodes: CatalogNode[];
}
