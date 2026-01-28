const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9090/api';

export interface Site {
  id: string;
  name: string;
  slug: string;
  liveUrl: string;
  connectionType: 'sftp' | 'ssh' | 'crawl-only';
  platformType?: string;
  status: 'NEVER_PULLED' | 'PULLING' | 'ACTIVE' | 'PUSHING' | 'ERROR';
  lastPulledAt?: string;
  createdBy: {
    id: string;
    email: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSiteData {
  name: string;
  liveUrl: string;
  connectionType: 'sftp' | 'ssh' | 'crawl-only';
  credentials?: {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: string;
  };
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getSites(): Promise<Site[]> {
  const response = await fetch(`${API_BASE_URL}/sites`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sites');
  }

  const data = await response.json();
  return data.sites;
}

export async function getSite(id: string): Promise<Site> {
  const response = await fetch(`${API_BASE_URL}/sites/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch site');
  }

  const data = await response.json();
  return data.site;
}

export async function createSite(data: CreateSiteData): Promise<Site> {
  const response = await fetch(`${API_BASE_URL}/sites`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create site');
  }

  const result = await response.json();
  return result.site;
}

export async function updateSite(id: string, data: Partial<CreateSiteData>): Promise<Site> {
  const response = await fetch(`${API_BASE_URL}/sites/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update site');
  }

  const result = await response.json();
  return result.site;
}

export async function deleteSite(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sites/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete site');
  }
}

export async function testConnection(credentials: CreateSiteData['credentials']): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/sites/test-connection`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Connection test failed');
  }

  return data;
}

export async function pullSite(id: string): Promise<{ jobId: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/sites/${id}/pull`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to start pull operation');
  }

  return response.json();
}

export async function pushSite(id: string, files?: string[]): Promise<{ jobId: string; message: string; pushType?: string; fileCount?: number }> {
  const body = files && files.length > 0 ? JSON.stringify({ files }) : undefined;

  const response = await fetch(`${API_BASE_URL}/sites/${id}/push`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to start push operation');
  }

  return response.json();
}

export async function downloadSite(id: string, slug: string): Promise<void> {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${API_BASE_URL}/sites/${id}/download`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to download site');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function uploadSite(id: string, file: File): Promise<{ filesExtracted: number; message: string }> {
  const token = localStorage.getItem('auth_token');
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/sites/${id}/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload site');
  }

  return response.json();
}

export interface DiffFile {
  path: string;
  size: number;
  oldSize?: number;
  type: string;
}

export interface SiteDiff {
  summary: {
    added: number;
    modified: number;
    deleted: number;
    unchanged: number;
    totalFiles: number;
    totalAdded: number;
    totalModified: number;
    totalDeleted: number;
  };
  files: {
    added: DiffFile[];
    modified: DiffFile[];
    deleted: DiffFile[];
  };
  message?: string;
}

export async function getSiteDiff(id: string): Promise<SiteDiff> {
  const response = await fetch(`${API_BASE_URL}/sites/${id}/diff`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get diff');
  }

  return response.json();
}

export interface FileDiff {
  totalLines: number;
  changedLines: number;
  diff: Array<{
    lineNumber: number;
    type: 'added' | 'modified' | 'deleted';
    oldLine?: string;
    newLine?: string;
  }>;
}

export async function getFileDiff(id: string, filePath: string): Promise<FileDiff> {
  const response = await fetch(`${API_BASE_URL}/sites/${id}/diff/file`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ filePath }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get file diff');
  }

  return response.json();
}

export interface SiteEvaluation {
  url: string;
  success: boolean;
  timestamp: string;
  summary: {
    title: string;
    loadTime: string;
    pageSize: string;
    internalLinks: number;
    estimatedPages: number;
    estimatedSize: string;
    platform: string;
    hasDynamicContent: boolean;
    accuracyScore: number;
    crawlStrategy: string;
  };
  resources: {
    html: number;
    css: number;
    javascript: number;
    images: number;
    fonts: number;
    other: number;
    failed: number;
    total: number;
  };
  warnings: Array<{
    type: string;
    severity: string;
    message: string;
    impact: string;
    details?: any[];
  }>;
  recommendations: Array<{
    type: string;
    message: string;
    action: string;
  }>;
  seo: {
    hasMetaDescription: boolean;
    hasCanonical: boolean;
    hasViewport: boolean;
    lang: string;
  };
}

export async function evaluateSite(url: string): Promise<SiteEvaluation> {
  const response = await fetch(`${API_BASE_URL}/sites/evaluate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to evaluate site');
  }

  return response.json();
}

export interface NetworkPath {
  networkPath: string;
  localPath: string;
  serverName: string;
  siteSlug: string;
  instructions: string[];
}

export async function getNetworkPath(id: string): Promise<NetworkPath> {
  const response = await fetch(`${API_BASE_URL}/sites/${id}/network-path`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get network path');
  }

  return response.json();
}
