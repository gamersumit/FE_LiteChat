import { useEffect } from 'react';
import { useToast } from '../../hooks/useToast';

/**
 * Component that listens for API error events and shows appropriate toast notifications
 * This bridges the gap between the centralized API service and the Redux toast system
 */
export default function ApiErrorHandler() {
  const toast = useToast();

  useEffect(() => {
    const handleApiError = (event: CustomEvent) => {
      const { type, title, message } = event.detail;

      switch (type) {
        case 'auth':
          toast.authError();
          break;

        case 'permission':
          toast.permissionError();
          break;

        case 'validation':
          toast.validationError(message);
          break;

        case 'network':
          toast.networkError();
          break;

        case 'error':
        default:
          toast.error(title, message);
          break;
      }
    };

    // Listen for API error events
    window.addEventListener('api-error', handleApiError as EventListener);

    return () => {
      window.removeEventListener('api-error', handleApiError as EventListener);
    };
  }, [toast]);

  // This component doesn't render anything
  return null;
}