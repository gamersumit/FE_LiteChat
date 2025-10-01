import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationState {
  toasts: Toast[];
  maxToasts: number;
}

const initialState: NotificationState = {
  toasts: [],
  maxToasts: 5
};

let toastIdCounter = 0;

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addToast: (state, action: PayloadAction<Omit<Toast, 'id' | 'timestamp'>>) => {
      // Check for duplicate error toasts to prevent spam
      const isDuplicateError = action.payload.type === 'error' &&
        state.toasts.some(existingToast =>
          existingToast.type === 'error' &&
          existingToast.title === action.payload.title &&
          (Date.now() - existingToast.timestamp) < 2000 // Within 2 seconds
        );

      if (isDuplicateError) {
        return; // Skip adding duplicate error toast
      }

      const toast: Toast = {
        ...action.payload,
        id: `toast-${++toastIdCounter}`,
        timestamp: Date.now(),
        duration: action.payload.duration ?? getDefaultDuration(action.payload.type)
      };

      state.toasts.unshift(toast);

      // Keep only the latest toasts within the limit
      if (state.toasts.length > state.maxToasts) {
        state.toasts = state.toasts.slice(0, state.maxToasts);
      }
    },

    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },

    clearAllToasts: (state) => {
      state.toasts = [];
    },

    clearErrorToasts: (state) => {
      state.toasts = state.toasts.filter(toast => toast.type !== 'error');
    },

    updateToast: (state, action: PayloadAction<{ id: string; updates: Partial<Toast> }>) => {
      const { id, updates } = action.payload;
      const toastIndex = state.toasts.findIndex(toast => toast.id === id);

      if (toastIndex !== -1) {
        state.toasts[toastIndex] = { ...state.toasts[toastIndex], ...updates };
      }
    }
  }
});

function getDefaultDuration(type: Toast['type']): number {
  switch (type) {
    case 'success':
      return 4000;
    case 'info':
      return 6000;
    case 'warning':
      return 8000;
    case 'error':
      return 10000;
    default:
      return 6000;
  }
}

export const { addToast, removeToast, clearAllToasts, clearErrorToasts, updateToast } = notificationSlice.actions;

// Import RootState from store
import type { RootState } from './index';

// Selectors
export const selectToasts = (state: RootState) => state.notifications.toasts;
export const selectToastById = (state: RootState, id: string) =>
  state.notifications.toasts.find(toast => toast.id === id);

// Action creators for common toast types
export const showSuccessToast = (title: string, message?: string, options?: Partial<Toast>) =>
  addToast({ type: 'success', title, message, ...options });

export const showErrorToast = (title: string, message?: string, options?: Partial<Toast>) =>
  addToast({ type: 'error', title, message, ...options });

export const showWarningToast = (title: string, message?: string, options?: Partial<Toast>) =>
  addToast({ type: 'warning', title, message, ...options });

export const showInfoToast = (title: string, message?: string, options?: Partial<Toast>) =>
  addToast({ type: 'info', title, message, ...options });

export default notificationSlice.reducer;