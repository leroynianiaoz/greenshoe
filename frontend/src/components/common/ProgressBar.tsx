interface ProgressBarProps {
  progress: number | null;
  message?: string;
  className?: string;
}

export function ProgressBar({ progress, message, className = '' }: ProgressBarProps) {
  const isIndeterminate = progress === null;

  return (
    <div className={`w-full ${className}`}>
      {message && (
        <div className="text-sm text-gray-600 mb-1 text-center">{message}</div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        {isIndeterminate ? (
          <div className="bg-green-600 h-2.5 rounded-full animate-pulse w-full opacity-75" />
        ) : (
          <div
            className="bg-green-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        )}
      </div>
      {!isIndeterminate && (
        <div className="text-xs text-gray-500 mt-1 text-center">{progress}%</div>
      )}
    </div>
  );
}
