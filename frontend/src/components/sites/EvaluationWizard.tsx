import { Spinner } from '../common/Spinner';
import type { SiteEvaluation } from '../../services/sites';

interface EvaluationWizardProps {
  evaluation: SiteEvaluation | null;
  loading: boolean;
  onClose: () => void;
  onProceedToPull: () => void;
}

export function EvaluationWizard({ evaluation, loading, onClose, onProceedToPull }: EvaluationWizardProps) {
  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
          <div className="flex flex-col items-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-700">Analyzing site...</p>
            <p className="mt-2 text-sm text-gray-500">This may take 10-30 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  if (!evaluation) return null;

  const getAccuracyColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Fair';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default:
        return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Site Evaluation Results</h3>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Summary Section */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Summary</h4>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Platform</p>
                  <p className="text-sm font-medium text-gray-900">{evaluation.summary.platform}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Estimated Size</p>
                  <p className="text-sm font-medium text-gray-900">{evaluation.summary.estimatedSize}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Estimated Pages</p>
                  <p className="text-sm font-medium text-gray-900">{evaluation.summary.estimatedPages}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Load Time</p>
                  <p className="text-sm font-medium text-gray-900">{evaluation.summary.loadTime}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Accuracy Score */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Crawling Accuracy</h4>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold ${getAccuracyColor(evaluation.summary.accuracyScore)}`}>
                      {evaluation.summary.accuracyScore}%
                    </span>
                    <span className="text-lg text-gray-600">{getAccuracyLabel(evaluation.summary.accuracyScore)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Recommended strategy: <span className="font-medium">{evaluation.summary.crawlStrategy === 'javascript' ? 'JavaScript-enabled crawler' : 'Static HTML crawler'}</span>
                  </p>
                </div>
                <div className="w-32 h-32">
                  <svg className="transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={evaluation.summary.accuracyScore >= 80 ? '#10b981' : evaluation.summary.accuracyScore >= 60 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="8"
                      strokeDasharray={`${evaluation.summary.accuracyScore * 2.51} 251`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {evaluation.warnings.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">
                Warnings ({evaluation.warnings.length})
              </h4>
              <div className="space-y-2">
                {evaluation.warnings.map((warning, idx) => (
                  <div key={idx} className={`rounded-lg p-3 border ${getSeverityColor(warning.severity)}`}>
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{warning.message}</p>
                        <p className="text-xs mt-1 opacity-90">{warning.impact}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {evaluation.recommendations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">
                Recommendations ({evaluation.recommendations.length})
              </h4>
              <div className="space-y-2">
                {evaluation.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">{rec.message}</p>
                        <p className="text-xs text-green-700 mt-1">{rec.action}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Resources Detected</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600">HTML</p>
                <p className="text-lg font-semibold text-gray-900">{evaluation.resources.html}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600">CSS</p>
                <p className="text-lg font-semibold text-gray-900">{evaluation.resources.css}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600">JavaScript</p>
                <p className="text-lg font-semibold text-gray-900">{evaluation.resources.javascript}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600">Images</p>
                <p className="text-lg font-semibold text-gray-900">{evaluation.resources.images}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600">Fonts</p>
                <p className="text-lg font-semibold text-gray-900">{evaluation.resources.fonts}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600">Other</p>
                <p className="text-lg font-semibold text-gray-900">{evaluation.resources.other}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600">Failed</p>
                <p className="text-lg font-semibold text-red-600">{evaluation.resources.failed}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-blue-600">Total</p>
                <p className="text-lg font-semibold text-blue-900">{evaluation.resources.total}</p>
              </div>
            </div>
          </div>

          {/* SEO Info */}
          <div className="mb-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">SEO Status</h4>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  {evaluation.seo.hasMetaDescription ? (
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className={evaluation.seo.hasMetaDescription ? 'text-green-700' : 'text-gray-600'}>
                    Meta Description
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {evaluation.seo.hasCanonical ? (
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className={evaluation.seo.hasCanonical ? 'text-green-700' : 'text-gray-600'}>
                    Canonical URL
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {evaluation.seo.hasViewport ? (
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className={evaluation.seo.hasViewport ? 'text-green-700' : 'text-gray-600'}>
                    Viewport Meta
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">
                    Language: {evaluation.seo.lang || 'unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {evaluation.summary.hasDynamicContent && (
                <span className="text-yellow-700">⚠️ This site uses client-side rendering. JavaScript-enabled crawling recommended.</span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onProceedToPull}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Proceed to Pull
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
