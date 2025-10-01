/**
 * Authentication Slice
 *
 * Manages authentication state and automatic token refresh
 * Replaces the scattered auth logic found in AuthContext.tsx
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../services/centralizedApi';
import { showSuccessToast, showErrorToast, clearErrorToasts } from './notificationSlice';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastTokenRefresh: number | null;
  tokenExpiresAt: number | null;
}

const getInitialToken = (): string | null => {
  const token = localStorage.getItem('auth_token');
  return (token && token !== 'null' && token !== 'undefined') ? token : null;
};

const getInitialRefreshToken = (): string | null => {
  const token = localStorage.getItem('refresh_token');
  return (token && token !== 'null' && token !== 'undefined') ? token : null;
};

const initialState: AuthState = {
  user: null,
  token: getInitialToken(),
  refreshToken: getInitialRefreshToken(),
  isAuthenticated: !!getInitialToken(),
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastTokenRefresh: null,
  tokenExpiresAt: null
};

// Async thunks for authentication actions

/**
 * Login user
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue, dispatch }) => {
    try {
      const response = await apiService.login(email, password);

      if (!response.success) {
        dispatch(showErrorToast('Login Failed', response.message || 'Please check your credentials and try again.'));
        return rejectWithValue(response.message || 'Login failed');
      }

      // Store tokens in localStorage
      localStorage.setItem('auth_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);

      // Clear any existing error toasts before showing success
      dispatch(clearErrorToasts());
      dispatch(showSuccessToast('Welcome back!', 'You have been successfully logged in.'));

      return {
        user: response.data.user,
        token: response.data.access_token,
        refreshToken: response.data.refresh_token
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch(showErrorToast('Login Error', message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Validate current token and get user info
 */
export const validateToken = createAsyncThunk(
  'auth/validate',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.validateToken();

      if (!response.success) {
        return rejectWithValue(response.message || 'Token validation failed');
      }

      return response.data.user;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Token validation failed');
    }
  }
);

/**
 * Refresh authentication token
 */
export const refreshAuthToken = createAsyncThunk(
  'auth/refresh',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const response = await apiService.refreshToken();

      if (!response.success) {
        dispatch(showErrorToast('Session Expired', 'Please log in again to continue.', {
          action: {
            label: 'Login',
            onClick: () => window.location.href = '/login'
          }
        }));
        return rejectWithValue(response.message || 'Token refresh failed');
      }

      // Update tokens in localStorage
      localStorage.setItem('auth_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);

      return {
        token: response.data.access_token,
        refreshToken: response.data.refresh_token,
        refreshTime: Date.now()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      dispatch(showErrorToast('Authentication Error', 'Your session has expired. Please log in again.', {
        action: {
          label: 'Login',
          onClick: () => window.location.href = '/login'
        }
      }));
      return rejectWithValue(message);
    }
  }
);

/**
 * Register new user
 */
export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ name, email, password }: { name: string; email: string; password: string }, { rejectWithValue, dispatch }) => {
    try {
      const response = await apiService.register(name, email, password);

      if (!response.success) {
        dispatch(showErrorToast('Registration Failed', response.message || 'Please check your information and try again.'));
        return rejectWithValue(response.message || 'Registration failed');
      }

      dispatch(showSuccessToast('Registration Successful', 'Please check your email to verify your account.'));

      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      dispatch(showErrorToast('Registration Error', message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Logout user
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    // Clear tokens from localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');

    // Clear API service cache
    apiService.clearCache();

    dispatch(showSuccessToast('Logged out', 'You have been successfully logged out.'));

    return null;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setTokenExpiration: (state, action: PayloadAction<number>) => {
      state.tokenExpiresAt = action.payload;
    },
    updateLastRefresh: (state) => {
      state.lastTokenRefresh = Date.now();
    },
    updateTokensFromRefresh: (state, action: PayloadAction<{ access_token: string; refresh_token: string }>) => {
      state.token = action.payload.access_token;
      state.refreshToken = action.payload.refresh_token;
      state.lastTokenRefresh = Date.now();
      state.tokenExpiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
      state.isAuthenticated = true;
    }
  },
  extraReducers: (builder) => {
    // Login user
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.error = null;
        state.lastTokenRefresh = Date.now();
        // Set token expiration (assume 1 hour)
        state.tokenExpiresAt = Date.now() + (60 * 60 * 1000);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      });

    // Validate token
    builder
      .addCase(validateToken.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(validateToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(validateToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        // Clear tokens from localStorage on validation failure
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
      });

    // Refresh token
    builder
      .addCase(refreshAuthToken.pending, (state) => {
        state.isRefreshing = true;
        state.error = null;
      })
      .addCase(refreshAuthToken.fulfilled, (state, action) => {
        state.isRefreshing = false;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.lastTokenRefresh = action.payload.refreshTime;
        state.error = null;
        // Update token expiration
        state.tokenExpiresAt = Date.now() + (60 * 60 * 1000);
        // Ensure user stays authenticated
        state.isAuthenticated = true;
      })
      .addCase(refreshAuthToken.rejected, (state, action) => {
        state.isRefreshing = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        // Clear tokens from localStorage on refresh failure
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
      });

    // Register user
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
        // Don't automatically log in after registration
        // User needs to verify email first
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout user
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
        state.lastTokenRefresh = null;
        state.tokenExpiresAt = null;
      });
  }
});

export const { clearError, setTokenExpiration, updateLastRefresh, updateTokensFromRefresh } = authSlice.actions;

// Import RootState from store
import type { RootState } from './index';

// Selectors
export const selectAuth = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => {
  // User is authenticated only if they have both the flag AND a valid token
  return state.auth.isAuthenticated &&
         !!state.auth.token &&
         state.auth.token !== 'null' &&
         state.auth.token !== 'undefined';
};
export const selectAuthLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthRefreshing = (state: RootState) => state.auth.isRefreshing;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectTokenExpiresAt = (state: RootState) => state.auth.tokenExpiresAt;
export const selectShouldRefreshToken = (state: RootState) => {
  if (!state.auth.tokenExpiresAt || !state.auth.isAuthenticated) return false;

  // Refresh token if it expires in the next 5 minutes
  const refreshThreshold = 5 * 60 * 1000; // 5 minutes
  return Date.now() > (state.auth.tokenExpiresAt - refreshThreshold);
};

export default authSlice.reducer;