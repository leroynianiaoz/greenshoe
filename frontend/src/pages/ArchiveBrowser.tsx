import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Spinner } from '../components/common/Spinner';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface Archive {
  id: string;
  version: number;
  fileSize: number;
  createdAt: string;
}

interface Site {
  id: string;
  name: string;
  slug: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9090/api';

export function ArchiveBrowser() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [site, setSite] = useState<Site | null>(null);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<Archive | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Access control check
  if (user?.role !== 'PROJECT_MANAGER' && user?.role !== 'ADMIN') {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You must be a Project Manager or Administrator to access archives.</p>
        </div>
      </Layout>
    );
  }

  useEffect(() => {
    if (siteId) {
      loadSite();
      loadArchives();
    }
  }, [siteId]);

  const loadSite = async () => {
    try {
      const response = await axios.get(`${API_URL}/sites/${siteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSite(response.data);
    } catch (err: any) {
      console.error('Failed to load site:', err);
      setError(err.response?.data?.message || 'Failed to load site');
    }
  };

  const loadArchives = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/sites/${siteId}/archives`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setArchives(response.data.archives || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load archives');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClick = (archive: Archive) => {
    setSelectedArchive(archive);
    setShowRestoreConfirm(true);
  };

  const handleRestoreConfirm = async () => {
    if (!selectedArchive) return;

    try {
      setRestoring(true);
      setError('');
      setSuccessMessage('');

      await axios.post(
        `${API_URL}/sites/${siteId}/archives/${selectedArchive.id}/restore`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage(`Successfully restored version ${selectedArchive.version}!`);
      setShowRestoreConfirm(false);
      setSelectedArchive(null);

      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to restore archive');
    } finally {
      setRestoring(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getLatestVersion = (): number => {
    if (archives.length === 0) return 0;
    return Math.max(...archives.map(a => a.version));
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/sites')}
              className="text-sm text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Sites
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Archive Browser {site && `- ${site.name}`}
            </h1>
          </div>
          <button
            onClick={loadArchives}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Archive Version History</p>
              <p>Archives are automatically created during pull operations. Restore any previous version to roll back changes. The latest version is marked with a badge.</p>
            </div>
          </div>
        </div>

        {/* Archives List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Spinner />
            </div>
          ) : archives.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <p className="text-gray-500 text-lg mb-2">No Archives Yet</p>
              <p className="text-gray-400 text-sm">Archives will appear here after you pull the site from live.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {archives
                .sort((a, b) => b.version - a.version)
                .map((archive) => {
                  const isLatest = archive.version === getLatestVersion();
                  return (
                    <div
                      key={archive.id}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Version Icon */}
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                            </div>
                          </div>

                          {/* Version Info */}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold text-gray-900">
                                Version {archive.version}
                              </h3>
                              {isLatest && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                  Latest
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {new Date(archive.createdAt).toLocaleString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                {formatFileSize(archive.fileSize)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Restore Button */}
                        <button
                          onClick={() => handleRestoreClick(archive)}
                          disabled={isLatest}
                          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          title={isLatest ? 'This is the current version' : 'Restore this version'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {isLatest ? 'Current Version' : 'Restore'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Archive Statistics */}
        {archives.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white shadow rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Total Archives</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">{archives.length}</div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Latest Version</div>
              <div className="mt-1 text-2xl font-semibold text-blue-600">{getLatestVersion()}</div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Total Storage</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {formatFileSize(archives.reduce((sum, a) => sum + a.fileSize, 0))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && selectedArchive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Restore Version {selectedArchive.version}?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  This will restore the staging site to version {selectedArchive.version} (created {new Date(selectedArchive.createdAt).toLocaleString()}). The current staging files will be replaced.
                </p>
                <p className="text-sm text-orange-600 font-medium">
                  This action cannot be undone. Make sure you have the current version backed up if needed.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRestoreConfirm(false);
                  setSelectedArchive(null);
                }}
                disabled={restoring}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreConfirm}
                disabled={restoring}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 flex items-center gap-2"
              >
                {restoring ? (
                  <>
                    <Spinner />
                    Restoring...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Restore Version
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
