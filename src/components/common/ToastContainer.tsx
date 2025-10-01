import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectToasts, removeToast, type Toast } from '../../store/notificationSlice';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const { id, type, title, message, duration, action } = toast;

  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        onRemove(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onRemove]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div
      className={`max-w-sm w-full ${getBackgroundColor()} border rounded-lg shadow-lg p-4 transition-all duration-300 ease-in-out transform hover:scale-[1.02]`}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>

        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${getTextColor()}`}>
            {title}
          </p>

          {message && (
            <p className={`mt-1 text-xs ${getTextColor()} opacity-80`}>
              {message}
            </p>
          )}

          {action && (
            <div className="mt-2">
              <button
                onClick={action.onClick}
                className={`text-xs font-medium underline hover:no-underline ${getTextColor()}`}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>

        <div className="ml-4 flex-shrink-0">
          <button
            onClick={() => onRemove(id)}
            className={`inline-flex rounded-md p-1.5 ${getTextColor()} hover:bg-white hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current`}
          >
            <span className="sr-only">Dismiss</span>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {duration && duration > 0 && (
        <div className="mt-2">
          <div
            className={`h-1 rounded-full bg-current opacity-20 overflow-hidden`}
          >
            <div
              className={`h-full bg-current animate-toast-progress`}
              style={{
                animationDuration: `${duration}ms`,
                animationTimingFunction: 'linear',
                animationFillMode: 'forwards'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ToastContainer() {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector(selectToasts);

  const handleRemoveToast = (id: string) => {
    dispatch(removeToast(id));
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 space-y-3"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={handleRemoveToast}
        />
      ))}
    </div>
  );
}