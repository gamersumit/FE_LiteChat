import React from 'react';
import toast, { Toaster, type ToastOptions } from 'react-hot-toast';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';

// Custom toast component with icons
const CustomToast = ({ message, type, onDismiss }: {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onDismiss: () => void;
}) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  };

  return (
    <div className={`flex items-center p-4 border rounded-lg shadow-lg max-w-sm ${bgColors[type]}`}>
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-medium text-gray-900">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="ml-4 flex-shrink-0 rounded-md p-1 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
};

// Toast notification functions
export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <CustomToast
          message={message}
          type="success"
          onDismiss={() => toast.dismiss(t.id)}
        />
      ),
      {
        duration: 4000,
        ...options
      }
    );
  },

  error: (message: string, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <CustomToast
          message={message}
          type="error"
          onDismiss={() => toast.dismiss(t.id)}
        />
      ),
      {
        duration: 6000,
        ...options
      }
    );
  },

  warning: (message: string, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <CustomToast
          message={message}
          type="warning"
          onDismiss={() => toast.dismiss(t.id)}
        />
      ),
      {
        duration: 5000,
        ...options
      }
    );
  },

  info: (message: string, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <CustomToast
          message={message}
          type="info"
          onDismiss={() => toast.dismiss(t.id)}
        />
      ),
      {
        duration: 4000,
        ...options
      }
    );
  },

  loading: (message: string) => {
    return toast.loading(message, {
      style: {
        background: '#f3f4f6',
        color: '#374151',
      }
    });
  },

  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }
};

// Hook for using toast notifications
export const useToast = () => {
  return showToast;
};

// Toast container component
export const ToastContainer: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Default options for all toasts
        className: '',
        duration: 4000,
        style: {
          background: '#fff',
          color: '#363636',
          maxWidth: '500px',
        },
        // Default options for specific types
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  );
};

export default ToastContainer;