import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Spinner } from '../components/common/Spinner';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface Operation {
  id: string;
  siteId: string;
  userId: string;
  type: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: string | null;
  createdAt: string;
  site: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    email: string;
    role: string;
  };
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9090/api';

export function ActivityLogs() {
  const { token } = useAuth();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterSite, setFilterSite] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadOperations();
    loadSites();
  }, []);

  const loadOperations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/operations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOperations(response.data.operations || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const loadSites = async () => {
    try {
      const response = await axios.get(`${API_URL}/sites`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSites(response.data.sites || []);
    } catch (err) {
      console.error('Failed to load sites:', err);
    }
  };

  const filteredOperations = operations.filter(op => {
    if (filterSite !== 'all' && op.siteId !== filterSite) return false;
    if (filterType !== 'all' && op.type !== filterType) return false;
    if (filterStatus !== 'all' && op.status !== filterStatus) return false;
    return true;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ROLLED_BACK': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PULL':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        );
      case 'PUSH':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
      case 'DOWNLOAD':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        );
      case 'UPLOAD':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L9 8m4-4v12" />
          </svg>
        );
      case 'RESTORE':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'BACKUP':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
  };

  const formatDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt || !completedAt) return 'N/A';

    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    const durationMs = end - start;

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <button
            onClick={loadOperations}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site</label>
              <select
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Sites</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Operation Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="PULL">Pull</option>
                <option value="PUSH">Push</option>
                <option value="DOWNLOAD">Download</option>
                <option value="UPLOAD">Upload</option>
                <option value="RESTORE">Restore</option>
                <option value="BACKUP">Backup</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="ROLLED_BACK">Rolled Back</option>
              </select>
            </div>
          </div>
        </div>

        {/* Activity Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Spinner />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredOperations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No operations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Site
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOperations.map((operation) => (
                    <tr key={operation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="text-gray-600">
                            {getTypeIcon(operation.type)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {operation.type}
                            </div>
                            {operation.errorMessage && (
                              <div className="text-xs text-red-600 mt-1">
                                {operation.errorMessage}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{operation.site.name}</div>
                        <div className="text-xs text-gray-500">{operation.site.slug}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{operation.user.email}</div>
                        <div className="text-xs text-gray-500">{operation.user.role}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(operation.status)}`}>
                          {operation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDuration(operation.startedAt, operation.completedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(operation.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {filteredOperations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white shadow rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Total</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">{filteredOperations.length}</div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Completed</div>
              <div className="mt-1 text-2xl font-semibold text-green-600">
                {filteredOperations.filter(op => op.status === 'COMPLETED').length}
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Failed</div>
              <div className="mt-1 text-2xl font-semibold text-red-600">
                {filteredOperations.filter(op => op.status === 'FAILED').length}
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">In Progress</div>
              <div className="mt-1 text-2xl font-semibold text-blue-600">
                {filteredOperations.filter(op => op.status === 'IN_PROGRESS').length}
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Pending</div>
              <div className="mt-1 text-2xl font-semibold text-yellow-600">
                {filteredOperations.filter(op => op.status === 'PENDING').length}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
