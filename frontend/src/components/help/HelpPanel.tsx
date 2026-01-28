import { useState } from 'react';
import helpTopicsData from '../../data/helpTopics.json';

interface HelpTopic {
  id: string;
  title: string;
  category: string;
  priority: number;
  content: {
    overview: string;
    steps?: string[];
    keyPoints?: string[];
  };
  hasScreenshot?: boolean;
  screenshotPlaceholder?: string;
}

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const topics = helpTopicsData.topics as HelpTopic[];

  // Filter topics based on search query
  const filteredTopics = topics.filter(topic => {
    const query = searchQuery.toLowerCase();
    return (
      topic.title.toLowerCase().includes(query) ||
      topic.category.toLowerCase().includes(query) ||
      topic.content.overview.toLowerCase().includes(query)
    );
  });

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const handleReportIssue = () => {
    // For now, just open email client - can be enhanced later
    window.location.href = 'mailto:support@greenshoe.com?subject=GreenShoe Support Request';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* No backdrop - keep main site fully visible */}

      {/* Sliding Panel - very compact */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold">Help & Support</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Close help panel"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <input
              type="text"
              placeholder="Search help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-600 mt-2">
              Found {filteredTopics.length} topic{filteredTopics.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Topics List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredTopics.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No topics found matching "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-green-600 hover:text-green-700 text-sm"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTopics.map((topic) => {
                const isExpanded = expandedTopics.has(topic.id);
                return (
                  <div key={topic.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Topic Header */}
                    <button
                      onClick={() => toggleTopic(topic.id)}
                      className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                          {topic.priority}
                        </span>
                        <span className="font-medium text-gray-900">{topic.title}</span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Topic Content */}
                    {isExpanded && (
                      <div className="px-4 py-4 bg-white border-t border-gray-200">
                        <p className="text-gray-700 mb-3">{topic.content.overview}</p>

                        {topic.content.steps && (
                          <div className="mb-3">
                            <h4 className="font-semibold text-gray-900 mb-2">Steps:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                              {topic.content.steps.map((step, idx) => (
                                <li key={idx} className="ml-2">
                                  {step.startsWith('  •') ? (
                                    <span className="ml-4 block">{step.replace('  •', '•')}</span>
                                  ) : (
                                    step
                                  )}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {topic.content.keyPoints && (
                          <div className="mb-3">
                            <h4 className="font-semibold text-gray-900 mb-2">Key Points:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                              {topic.content.keyPoints.map((point, idx) => (
                                <li key={idx}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {topic.hasScreenshot && (
                          <div className="mt-3 p-4 bg-gray-100 rounded border border-gray-200 text-center">
                            <p className="text-sm text-gray-500 italic">
                              📷 Screenshot placeholder: {topic.screenshotPlaceholder}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              (Screenshots will be added here)
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - Report Issue */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <button
            onClick={handleReportIssue}
            className="w-full py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Report an Issue
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Can't find what you're looking for? Let us know!
          </p>
        </div>
      </div>
    </>
  );
}
