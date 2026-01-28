import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { StatusBadge } from '../components/sites/StatusBadge';
import { Spinner } from '../components/common/Spinner';
import { ProgressBar } from '../components/common/ProgressBar';
import { DiffView } from '../components/sites/DiffView';
import { EvaluationWizard } from '../components/sites/EvaluationWizard';
import { getSites, createSite, deleteSite, pullSite, pushSite, downloadSite, uploadSite, getSiteDiff, evaluateSite, getNetworkPath, type Site, type CreateSiteData, type SiteDiff, type SiteEvaluation, type NetworkPath } from '../services/sites';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

export function Sites() {
  const { user } = useAuth();
  const { operationProgress, subscribeToNotifications } = useNotifications();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<CreateSiteData>({
    name: '',
    liveUrl: '',
    connectionType: 'crawl-only',
  });
  const [submitting, setSubmitting] = useState(false);
  const [operationLoading, setOperationLoading] = useState<Record<string, string>>({});
  const [showDiff, setShowDiff] = useState(false);
  const [diffData, setDiffData] = useState<SiteDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [selectedSiteForDiff, setSelectedSiteForDiff] = useState<{id: string, name: string} | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluationData, setEvaluationData] = useState<SiteEvaluation | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [selectedSiteForEval, setSelectedSiteForEval] = useState<{id: string, name: string, url: string} | null>(null);
  const [showNetworkPath, setShowNetworkPath] = useState(false);
  const [networkPathData, setNetworkPathData] = useState<NetworkPath | null>(null);
  const [networkPathLoading, setNetworkPathLoading] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    loadSites();
  }, []);

  // Subscribe to notifications to auto-refresh when operations complete
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((notification) => {
      // Refetch sites when pull/push operations complete (success or failure)
      if (
        notification.type === 'PULL_SUCCESS' ||
        notification.type === 'PULL_FAILURE' ||
        notification.type === 'PUSH_SUCCESS' ||
        notification.type === 'PUSH_FAILURE'
      ) {
        console.log('Operation completed, refreshing sites list');
        loadSites();
        // Clear operation loading state for this site
        if (notification.metadata?.siteId) {
          setOperationLoading(prev => {
            const { [notification.metadata.siteId]: _, ...rest } = prev;
            return rest;
          });
        }
      }
    });

    return unsubscribe;
  }, [subscribeToNotifications]);

  const loadSites = async () => {
    try {
      setLoading(true);
      const data = await getSites();
      setSites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sites');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await createSite(formData);
      setShowAddModal(false);
      setFormData({ name: '', liveUrl: '', connectionType: 'crawl-only' });
      await loadSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create site');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete site "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteSite(id);
      await loadSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete site');
    }
  };

  const handlePull = async (id: string) => {
    try {
      setError('');
      setOperationLoading(prev => ({ ...prev, [id]: 'pull' }));
      await pullSite(id);
      // Immediately refresh to show PULLING status, then WebSocket will trigger another refresh when complete
      await loadSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start pull');
      // Clear loading state on error (WebSocket notification will handle success case)
      setOperationLoading(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
    // Don't clear operationLoading here - let the WebSocket notification handler do it
  };

  const handlePush = async (id: string, name: string, files?: string[]) => {
    const fileInfo = files ? ` (${files.length} files)` : '';
    if (!window.confirm(`Push "${name}" to production${fileInfo}? This will deploy the staging version live.`)) {
      return;
    }

    try {
      setError('');
      setOperationLoading(prev => ({ ...prev, [id]: 'push' }));
      await pushSite(id, files);
      // Immediately refresh to show PUSHING status, then WebSocket will trigger another refresh when complete
      await loadSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start push');
      // Clear loading state on error (WebSocket notification will handle success case)
      setOperationLoading(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
    // Don't clear operationLoading here - let the WebSocket notification handler do it
  };

  const handleDownload = async (id: string, slug: string) => {
    try {
      setError('');
      setOperationLoading(prev => ({ ...prev, [id]: 'download' }));
      await downloadSite(id, slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download site');
    } finally {
      setOperationLoading(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleUpload = async (id: string, name: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`Upload changes to "${name}"? This will replace the current staging version.`)) {
      event.target.value = ''; // Reset file input
      return;
    }

    try {
      setError('');
      setOperationLoading(prev => ({ ...prev, [id]: 'upload' }));
      await uploadSite(id, file);
      event.target.value = ''; // Reset file input
      await loadSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload site');
      event.target.value = ''; // Reset file input
    } finally {
      setOperationLoading(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleShowNetworkPath = async (id: string) => {
    try {
      setError('');
      setShowNetworkPath(true);
      setNetworkPathLoading(true);
      const pathData = await getNetworkPath(id);
      setNetworkPathData(pathData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get network path');
      setShowNetworkPath(false);
    } finally {
      setNetworkPathLoading(false);
    }
  };

  const handleCopyPath = () => {
    if (networkPathData) {
      navigator.clipboard.writeText(networkPathData.networkPath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    }
  };

  const handlePreviewChanges = async (id: string, name: string) => {
    try {
      setError('');
      setSelectedSiteForDiff({ id, name });
      setShowDiff(true);
      setDiffLoading(true);
      const diff = await getSiteDiff(id);
      setDiffData(diff);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load changes');
      setShowDiff(false);
      setSelectedSiteForDiff(null);
    } finally {
      setDiffLoading(false);
    }
  };

  const handlePushFromDiff = async (files?: string[]) => {
    setShowDiff(false);
    setDiffData(null);
    if (selectedSiteForDiff) {
      await handlePush(selectedSiteForDiff.id, selectedSiteForDiff.name, files);
      setSelectedSiteForDiff(null);
    }
  };

  const handleCloseDiff = () => {
    setShowDiff(false);
    setDiffData(null);
    setSelectedSiteForDiff(null);
  };

  const handleEvaluateSite = async (id: string, name: string, url: string) => {
    try {
      setError('');
      setSelectedSiteForEval({ id, name, url });
      setShowEvaluation(true);
      setEvaluationLoading(true);
      const evaluation = await evaluateSite(url);
      setEvaluationData(evaluation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate site');
      setShowEvaluation(false);
      setSelectedSiteForEval(null);
    } finally {
      setEvaluationLoading(false);
    }
  };

  const handleProceedToPull = async () => {
    setShowEvaluation(false);
    setEvaluationData(null);
    if (selectedSiteForEval) {
      await handlePull(selectedSiteForEval.id);
      setSelectedSiteForEval(null);
    }
  };

  const handleCloseEvaluation = () => {
    setShowEvaluation(false);
    setEvaluationData(null);
    setSelectedSiteForEval(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner size="lg" />
          <div className="mt-4 text-lg text-gray-600">Loading sites...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Site
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {sites.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">No sites yet. Add your first site to get started.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Your First Site
            </button>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Live URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Connection
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sites.map((site) => (
                  <tr key={site.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{site.name}</div>
                      <div className="text-sm text-gray-500">{site.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={site.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {site.liveUrl}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={site.status} />
                      {operationProgress[site.id] && (
                        <div className="mt-2">
                          <ProgressBar
                            progress={operationProgress[site.id].progress}
                            message={operationProgress[site.id].message}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {site.platformType || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {site.connectionType}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium relative">
                      <div className="flex items-center justify-end gap-2">
                        {/* Evaluate Button (only when NEVER_PULLED) */}
                        {site.status === 'NEVER_PULLED' && (
                          <button
                            onClick={() => handleEvaluateSite(site.id, site.name, site.liveUrl)}
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          >
                            Evaluate
                          </button>
                        )}

                        {/* Pull Button (always visible) */}
                        <button
                          onClick={() => handlePull(site.id)}
                          disabled={site.status === 'PULLING' || operationLoading[site.id] === 'pull'}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {site.status === 'PULLING' || operationLoading[site.id] === 'pull' ? 'Pulling...' : 'Pull'}
                        </button>

                        {/* Preview Changes (PM/Admin only) */}
                        {(user?.role === 'PROJECT_MANAGER' || user?.role === 'ADMIN') && (
                          <button
                            onClick={() => handlePreviewChanges(site.id, site.name)}
                            disabled={site.status === 'PUSHING' || site.status === 'NEVER_PULLED' || operationLoading[site.id] === 'push'}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            {site.status === 'PUSHING' || operationLoading[site.id] === 'push' ? 'Pushing...' : 'Preview'}
                          </button>
                        )}

                        {/* More Actions Dropdown */}
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => {
                              if (openDropdown === site.id) {
                                setOpenDropdown(null);
                                setDropdownPosition(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setDropdownPosition({
                                  top: rect.bottom + 8,
                                  right: window.innerWidth - rect.right
                                });
                                setOpenDropdown(site.id);
                              }
                            }}
                            className="text-gray-600 hover:text-gray-900 p-1"
                            title="More actions"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>

                          {/* Dropdown Menu */}
                          {openDropdown === site.id && dropdownPosition && (
                            <>
                              {/* Backdrop to close dropdown */}
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => {
                                  setOpenDropdown(null);
                                  setDropdownPosition(null);
                                }}
                              />

                              <div
                                className="fixed z-20 w-56 rounded-md shadow-2xl bg-white border-2 border-gray-200"
                                style={{
                                  top: `${dropdownPosition.top}px`,
                                  right: `${dropdownPosition.right}px`
                                }}
                              >
                                <div className="py-1">
                                  {site.status === 'ACTIVE' && (
                                    <>
                                      <button
                                        onClick={() => {
                                          handleDownload(site.id, site.slug);
                                          setOpenDropdown(null);
                                          setDropdownPosition(null);
                                        }}
                                        disabled={operationLoading[site.id] === 'download'}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                        </svg>
                                        {operationLoading[site.id] === 'download' ? 'Downloading...' : 'Download ZIP'}
                                      </button>

                                      <label className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        {operationLoading[site.id] === 'upload' ? 'Uploading...' : 'Upload ZIP'}
                                        <input
                                          type="file"
                                          accept=".zip"
                                          onChange={(e) => {
                                            handleUpload(site.id, site.name, e);
                                            setOpenDropdown(null);
                                            setDropdownPosition(null);
                                          }}
                                          className="hidden"
                                          disabled={operationLoading[site.id] === 'upload'}
                                        />
                                      </label>

                                      <button
                                        onClick={() => {
                                          handleShowNetworkPath(site.id);
                                          setOpenDropdown(null);
                                          setDropdownPosition(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                        </svg>
                                        Network Path
                                      </button>

                                      <div className="border-t border-gray-100 my-1"></div>
                                    </>
                                  )}

                                  <Link
                                    to={`/sites/${site.id}/backup`}
                                    onClick={() => {
                                      setOpenDropdown(null);
                                      setDropdownPosition(null);
                                    }}
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Backup Schedule
                                  </Link>

                                  {(user?.role === 'PROJECT_MANAGER' || user?.role === 'ADMIN') && (
                                    <>
                                      <Link
                                        to={`/sites/${site.id}/archives`}
                                        onClick={() => {
                                          setOpenDropdown(null);
                                          setDropdownPosition(null);
                                        }}
                                        className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 ${
                                          site.status === 'NEVER_PULLED' ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                                        }`}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                        </svg>
                                        View Archives
                                      </Link>
                                    </>
                                  )}

                                  {user?.role === 'ADMIN' && (
                                    <>
                                      <div className="border-t border-gray-100 my-1"></div>
                                      <button
                                        onClick={() => {
                                          handleDelete(site.id, site.name);
                                          setOpenDropdown(null);
                                          setDropdownPosition(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete Site
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Site Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Add New Site</h2>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Site Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Live URL
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.liveUrl}
                      onChange={(e) => setFormData({ ...formData, liveUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Connection Type
                    </label>
                    <select
                      value={formData.connectionType}
                      onChange={(e) => setFormData({ ...formData, connectionType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="crawl-only">Crawl Only (Public sites)</option>
                      <option value="sftp">SFTP</option>
                      <option value="ssh">SSH</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Site'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Diff View Modal */}
        {showDiff && (
          <DiffView
            diff={diffData}
            loading={diffLoading}
            onClose={handleCloseDiff}
            onPush={handlePushFromDiff}
          />
        )}

        {/* Evaluation Wizard Modal */}
        {showEvaluation && (
          <EvaluationWizard
            evaluation={evaluationData}
            loading={evaluationLoading}
            onClose={handleCloseEvaluation}
            onProceedToPull={handleProceedToPull}
          />
        )}

        {/* Network Path Modal */}
        {showNetworkPath && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                <h3 className="text-lg font-medium text-gray-900">Network File Share Access</h3>
                <button
                  onClick={() => {
                    setShowNetworkPath(false);
                    setNetworkPathData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {networkPathLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner />
                </div>
              ) : networkPathData ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>Option C:</strong> Edit files directly without download/upload
                    </p>
                    <p className="text-xs text-blue-600">
                      Access staging files via network share and edit with VS Code, Claude Code, or any editor. Changes apply instantly.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Network Path (Windows):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={networkPathData.networkPath}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md font-mono text-sm"
                      />
                      <button
                        onClick={handleCopyPath}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                      >
                        {copiedPath ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Path
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Setup Instructions:</h4>
                    <ol className="space-y-2 text-sm text-gray-700">
                      {networkPathData.instructions.map((instruction, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-semibold mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="flex-1 font-mono text-xs bg-white px-2 py-1 rounded border border-gray-200">
                            {instruction}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Note:</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          The server administrator must configure Windows file sharing on the staging directory for this option to work.
                          Contact IT if you cannot access the network path.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={() => {
                        setShowNetworkPath(false);
                        setNetworkPathData(null);
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
