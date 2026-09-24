interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  color?: string;
  center?: boolean;
}

export const LoadingSpinner = ({
  size = 'md',
  className = '',
  color = 'border-blue-600',
  center = true,
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    xs: 'w-4 h-4 border-2',
    sm: 'w-5 h-5 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  const spinner = (
    <div
      className={`${sizeClasses[size]} ${color} border-t-transparent rounded-full animate-spin ${
        center ? 'mx-auto' : ''
      } ${className}`}
      role="status"
      aria-label="Loading"
    />
  );

  return spinner;
};
