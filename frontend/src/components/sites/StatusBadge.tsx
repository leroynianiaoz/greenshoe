interface StatusBadgeProps {
  status: 'NEVER_PULLED' | 'PULLING' | 'ACTIVE' | 'PUSHING' | 'ERROR';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'NEVER_PULLED':
        return {
          label: 'Never Pulled',
          className: 'bg-gray-100 text-gray-800',
        };
      case 'PULLING':
        return {
          label: 'Pulling...',
          className: 'bg-blue-100 text-blue-800 animate-pulse',
        };
      case 'ACTIVE':
        return {
          label: 'Active',
          className: 'bg-green-100 text-green-800',
        };
      case 'PUSHING':
        return {
          label: 'Pushing...',
          className: 'bg-yellow-100 text-yellow-800 animate-pulse',
        };
      case 'ERROR':
        return {
          label: 'Error',
          className: 'bg-red-100 text-red-800',
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-800',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}
