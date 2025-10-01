import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { refreshAuthToken, logoutUser, selectIsAuthenticated, selectTokenExpiresAt, selectShouldRefreshToken } from '../store/authSlice';

interface TokenPayload {
  exp: number;
  iat: number;
  sub: string;
  [key: string]: any;
}

/**
 * Custom hook for automatic token refresh management
 * Handles token expiration detection and automatic refresh
 */
export const useTokenRefresh = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const tokenExpiresAt = useAppSelector(selectTokenExpiresAt);
  const shouldRefresh = useAppSelector(selectShouldRefreshToken);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  /**
   * Decode JWT token to extract payload
   */
  const decodeToken = useCallback((token: string): TokenPayload | null => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }, []);

  /**
   * Check if token is expired or will expire soon
   */
  const isTokenExpired = useCallback((token: string, bufferMinutes: number = 5): boolean => {
    const payload = decodeToken(token);
    if (!payload) return true;

    const now = Math.floor(Date.now() / 1000);
    const bufferSeconds = bufferMinutes * 60;

    return payload.exp <= (now + bufferSeconds);
  }, [decodeToken]);

  /**
   * Get time until token expires in milliseconds
   */
  const getTimeUntilExpiry = useCallback((token: string): number => {
    const payload = decodeToken(token);
    if (!payload) return 0;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = (payload.exp - now) * 1000;

    return Math.max(0, timeUntilExpiry);
  }, [decodeToken]);

  /**
   * Refresh the authentication token using Redux action
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) {
      return false;
    }

    isRefreshingRef.current = true;

    try {
      const result = await dispatch(refreshAuthToken());

      if (refreshAuthToken.fulfilled.match(result)) {
        console.log('Token refreshed successfully');
        return true;
      } else {
        console.error('Token refresh failed:', result.payload);
        return false;
      }

    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;

    } finally {
      isRefreshingRef.current = false;
    }
  }, [dispatch]);

  /**
   * Schedule automatic token refresh using Redux state
   */
  const scheduleTokenRefresh = useCallback(() => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    if (!tokenExpiresAt || !isAuthenticated) {
      return;
    }

    // Calculate time until refresh (5 minutes before expiration)
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes
    const timeUntilRefresh = tokenExpiresAt - Date.now() - refreshThreshold;

    if (timeUntilRefresh <= 0) {
      // Token needs immediate refresh
      if (shouldRefresh) {
        refreshToken();
      } else {
        // Token is expired, logout
        dispatch(logoutUser());
      }
      return;
    }

    // Schedule refresh
    refreshTimeoutRef.current = setTimeout(() => {
      refreshToken().then(success => {
        if (success) {
          // Redux will update the tokenExpiresAt, which will trigger this effect again
          scheduleTokenRefresh();
        }
      });
    }, timeUntilRefresh);

    console.log(`Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
  }, [tokenExpiresAt, isAuthenticated, shouldRefresh, refreshToken, dispatch]);

  /**
   * Setup token management using Redux state
   */
  const setupTokenManagement = useCallback(() => {
    if (!isAuthenticated) {
      return;
    }

    // Check if token needs immediate refresh
    if (shouldRefresh) {
      console.log('Token expires soon, refreshing immediately');
      refreshToken().then(success => {
        if (success) {
          scheduleTokenRefresh();
        }
      });
    } else {
      // Schedule future refresh
      scheduleTokenRefresh();
    }
  }, [isAuthenticated, shouldRefresh, refreshToken, scheduleTokenRefresh]);

  /**
   * Setup token management when auth state changes
   */
  useEffect(() => {
    if (isAuthenticated) {
      setupTokenManagement();
    } else {
      // Clear refresh timeout when user logs out
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [isAuthenticated, setupTokenManagement]);

  /**
   * Listen for token expiration events from API service
   */
  useEffect(() => {
    const handleTokenExpired = () => {
      if (isAuthenticated) {
        dispatch(refreshAuthToken());
      }
    };

    window.addEventListener('token-expired', handleTokenExpired);

    return () => {
      window.removeEventListener('token-expired', handleTokenExpired);
    };
  }, [dispatch, isAuthenticated]);

  /**
   * Handle page visibility change - refresh token when page becomes visible
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && shouldRefresh) {
        refreshToken();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, shouldRefresh, refreshToken]);

  return {
    refreshToken,
    isTokenExpired: (token: string) => isTokenExpired(token, 0),
    getTimeUntilExpiry,
    setupTokenManagement,
    shouldRefresh,
    isAuthenticated
  };
};

export default useTokenRefresh;