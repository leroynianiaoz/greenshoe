import { useNotifications } from '../../contexts/NotificationContext';

export function Toast() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            min-w-80 max-w-md p-4 rounded-lg shadow-lg flex items-start gap-3
            animate-slide-in-right
            ${toast.type === 'success' ? 'bg-green-50 border border-green-200' : ''}
            ${toast.type === 'error' ? 'bg-red-50 border border-red-200' : ''}
            ${toast.type === 'info' ? 'bg-blue-50 border border-blue-200' : ''}
          `}
        >
          {/* Icon */}
          <div className="flex-shrink-0">
            {toast.type === 'success' && (
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          {/* Message */}
          <div className="flex-1 pt-0.5">
            <p className={`
              text-sm font-medium
              ${toast.type === 'success' ? 'text-green-800' : ''}
              ${toast.type === 'error' ? 'text-red-800' : ''}
              ${toast.type === 'info' ? 'text-blue-800' : ''}
            `}>
              {toast.message}
            </p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => dismissToast(toast.id)}
            className={`
              flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
