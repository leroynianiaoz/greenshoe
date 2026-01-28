import { useState } from 'react';
import { Spinner } from '../common/Spinner';
import type { SiteDiff } from '../../services/sites';

interface DiffViewProps {
  diff: SiteDiff | null;
  loading: boolean;
  onClose: () => void;
  onPush: (files?: string[]) => void;
}

export function DiffView({ diff, loading, onClose, onPush }: DiffViewProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [pushType, setPushType] = useState<'all' | 'selected'>('all');

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
          <div className="flex flex-col items-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-700">Analyzing changes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!diff) return null;

  const hasChanges = diff.summary.added > 0 || diff.summary.modified > 0 || diff.summary.deleted > 0;

  const toggleFile = (filePath: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const handlePush = () => {
    if (pushType === 'selected') {
      if (selectedFiles.size === 0) {
        alert('Please select at least one file to push');
        return;
      }
      // Pass selected files array for partial push
      onPush(Array.from(selectedFiles));
    } else {
      // Pass undefined for full push
      onPush();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Preview Changes</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary Banner */}
        {diff.message ? (
          <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200">
            <p className="text-sm text-yellow-800">{diff.message}</p>
          </div>
        ) : hasChanges ? (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{diff.summary.added}</div>
                <div className="text-sm text-gray-600">Added</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{diff.summary.modified}</div>
                <div className="text-sm text-gray-600">Modified</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{diff.summary.deleted}</div>
                <div className="text-sm text-gray-600">Deleted</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 bg-green-50 border-b border-green-200">
            <p className="text-sm text-green-800 text-center">No changes detected. All files are up to date.</p>
          </div>
        )}

        {/* File List */}
        {hasChanges && (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {/* Added Files */}
              {diff.files.added.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Added Files ({diff.files.added.length})</h4>
                  <div className="space-y-1">
                    {diff.files.added.map(file => (
                      <div key={file.path} className="flex items-center gap-2 py-2 px-3 rounded bg-green-50 border border-green-200">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.path)}
                          onChange={() => toggleFile(file.path)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-900 flex-1 truncate">{file.path}</span>
                        <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modified Files */}
              {diff.files.modified.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Modified Files ({diff.files.modified.length})</h4>
                  <div className="space-y-1">
                    {diff.files.modified.map(file => (
                      <div key={file.path} className="flex items-center gap-2 py-2 px-3 rounded bg-yellow-50 border border-yellow-200">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.path)}
                          onChange={() => toggleFile(file.path)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <svg className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        <span className="text-sm text-gray-900 flex-1 truncate">{file.path}</span>
                        <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deleted Files */}
              {diff.files.deleted.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Deleted Files ({diff.files.deleted.length})</h4>
                  <div className="space-y-1">
                    {diff.files.deleted.map(file => (
                      <div key={file.path} className="flex items-center gap-2 py-2 px-3 rounded bg-red-50 border border-red-200">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.path)}
                          onChange={() => toggleFile(file.path)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-900 flex-1 truncate line-through">{file.path}</span>
                        <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {hasChanges ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pushType"
                    value="all"
                    checked={pushType === 'all'}
                    onChange={(e) => setPushType(e.target.value as 'all')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Push All Changes</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pushType"
                    value="selected"
                    checked={pushType === 'selected'}
                    onChange={(e) => setPushType(e.target.value as 'selected')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    Push Selected ({selectedFiles.size} files)
                  </span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePush}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Push to Production
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
