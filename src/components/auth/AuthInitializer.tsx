import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { validateToken, updateTokensFromRefresh } from '../../store/authSlice';

/**
 * Component that handles authentication initialization on app startup
 * Validates stored tokens and sets up initial auth state
 */
export const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { token, isAuthenticated, isLoading } = useAppSelector(state => state.auth);

  useEffect(() => {
    // Only validate token if we have one but aren't authenticated yet
    // This happens on app startup when Redux rehydrates with stored token
    if (token && !isAuthenticated && !isLoading) {
      dispatch(validateToken());
    }
  }, [dispatch, token, isAuthenticated, isLoading]);

  // Listen for automatic token refresh from centralizedApi
  useEffect(() => {
    const handleTokenRefresh = (event: CustomEvent) => {
      const { access_token, refresh_token } = event.detail;
      dispatch(updateTokensFromRefresh({ access_token, refresh_token }));
    };

    window.addEventListener('token-refreshed', handleTokenRefresh as EventListener);

    return () => {
      window.removeEventListener('token-refreshed', handleTokenRefresh as EventListener);
    };
  }, [dispatch]);

  return <>{children}</>;
};

export default AuthInitializer;