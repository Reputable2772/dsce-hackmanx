import React from 'react';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
}) => {
  return (
    <div className={`mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 ${className}`}>
      {/* Page Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#202938] sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-[#687386]">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="flex items-center gap-3">{action}</div>}
      </div>

      {/* Main Content */}
      {children}
    </div>
  );
};
