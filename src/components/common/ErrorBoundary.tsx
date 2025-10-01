import React, { type ErrorInfo } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const isDevelopment = import.meta.env.MODE === 'development';

  const handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Something went wrong
        </h1>

        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Don't worry, we've been notified and
          are looking into it.
        </p>

        {isDevelopment && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-red-800 mb-2">
              Development Error Details:
            </h3>
            <pre className="text-xs text-red-700 overflow-auto max-h-32">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={resetErrorBoundary}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>

          <button
            onClick={handleGoHome}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function logError(error: Error, errorInfo: ErrorInfo) {
  // Log to console in development
  if (import.meta.env.MODE === 'development') {
    console.group('🚨 Error Boundary Caught an Error');
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();
  }

  // In production, you would send this to your error reporting service
  // Example: Sentry, LogRocket, etc.
  if (import.meta.env.MODE === 'production') {
    // TODO: Integrate with error reporting service
    // errorReportingService.captureException(error, {
    //   tags: { section: 'error-boundary' },
    //   extra: errorInfo
    // });
  }
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export default function ErrorBoundary({
  children,
  fallback = ErrorFallback,
  onError = logError
}: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={fallback}
      onError={onError}
      onReset={() => {
        // Clear any error state and refresh the page
        window.location.reload();
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}

// Hook for manual error reporting
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    logError(error, errorInfo || { componentStack: 'Manual report' });

    // Re-throw the error to be caught by the error boundary
    throw error;
  };
}