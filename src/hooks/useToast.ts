import { useCallback } from 'react';
import { useAppDispatch } from '../store';
import {
  addToast,
  removeToast,
  clearAllToasts,
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
  type Toast
} from '../store/notificationSlice';

export interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const dispatch = useAppDispatch();

  const toast = {
    success: (title: string, message?: string, options?: ToastOptions) => {
      dispatch(showSuccessToast(title, message, options));
    },

    error: (title: string, message?: string, options?: ToastOptions) => {
      dispatch(showErrorToast(title, message, options));
    },

    warning: (title: string, message?: string, options?: ToastOptions) => {
      dispatch(showWarningToast(title, message, options));
    },

    info: (title: string, message?: string, options?: ToastOptions) => {
      dispatch(showInfoToast(title, message, options));
    },

    custom: (toast: Omit<Toast, 'id' | 'timestamp'>) => {
      dispatch(addToast(toast));
    },

    remove: (id: string) => {
      dispatch(removeToast(id));
    },

    clear: () => {
      dispatch(clearAllToasts());
    },

    // Convenience methods for common use cases
    apiError: (error: any, defaultMessage = 'An error occurred') => {
      const message = error?.response?.data?.message ||
                     error?.message ||
                     defaultMessage;

      dispatch(showErrorToast('Error', message, { duration: 8000 }));
    },

    networkError: () => {
      dispatch(showErrorToast(
        'Network Error',
        'Please check your internet connection and try again.',
        {
          duration: 10000,
          action: {
            label: 'Retry',
            onClick: () => window.location.reload()
          }
        }
      ));
    },

    authError: () => {
      dispatch(showErrorToast(
        'Authentication Error',
        'Your session has expired. Please log in again.',
        {
          duration: 8000,
          action: {
            label: 'Login',
            onClick: () => {
              window.location.href = '/login';
            }
          }
        }
      ));
    },

    permissionError: () => {
      dispatch(showErrorToast(
        'Permission Denied',
        'You do not have permission to perform this action.',
        { duration: 6000 }
      ));
    },

    validationError: (message: string) => {
      dispatch(showWarningToast('Validation Error', message, { duration: 6000 }));
    },

    saveSuccess: (itemName = 'Item') => {
      dispatch(showSuccessToast(`${itemName} saved successfully`));
    },

    deleteSuccess: (itemName = 'Item') => {
      dispatch(showSuccessToast(`${itemName} deleted successfully`));
    },

    createSuccess: (itemName = 'Item') => {
      dispatch(showSuccessToast(`${itemName} created successfully`));
    },

    updateSuccess: (itemName = 'Item') => {
      dispatch(showSuccessToast(`${itemName} updated successfully`));
    }
  };

  return toast;
}

export default useToast;