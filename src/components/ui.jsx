import clsx from 'clsx';

export function StatCard({ icon: Icon, label, labelTa, value, sub, color = 'primary', trend }) {
  const colorMap = {
    primary: 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400',
    amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    red: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
  };
  return (
    <div className="stat-card">
      <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', colorMap[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">{labelTa}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
        {trend && (
          <span className={clsx('text-xs font-semibold', trend > 0 ? 'text-primary-600' : 'text-red-500')}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs yesterday
          </span>
        )}
      </div>
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={clsx('skeleton', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

export function Badge({ children, variant = 'green' }) {
  return <span className={clsx('badge', `badge-${variant}`)}>{children}</span>;
}

export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
        {Icon && <Icon className="w-8 h-8 text-gray-400" />}
      </div>
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
